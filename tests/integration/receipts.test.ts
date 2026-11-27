import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { listAuditLog } from '@/server/core/audit';
import { ForbiddenError, ValidationError } from '@/server/errors';
import { adjustStock } from '@/server/inventory/stock';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  submitPurchaseOrder,
} from '@/server/procurement/purchase-orders';
import { receiveGoods } from '@/server/procurement/receipts';
import { makeActor, makeStockFixture, resetDb, stockLedgerMismatches } from '../helpers/db';

beforeEach(resetDb);

/** An approved PO with two lines: 10 of product A and 4 of product B. */
async function approvedPo() {
  const manager = await makeActor('MANAGER');
  const staff = await makeActor('STAFF');
  const { product: a, warehouse } = await makeStockFixture();
  const { product: b } = await makeStockFixture();
  const vendor = await prisma.vendor.create({ data: { name: 'Acme' } });
  const po = await createPurchaseOrder(staff, {
    vendorId: vendor.id,
    warehouseId: warehouse.id,
    notes: '',
    lines: JSON.stringify([
      { productId: a.id, quantity: '10', unitPrice: '5' },
      { productId: b.id, quantity: '4', unitPrice: '2.5' },
    ]),
  });
  await submitPurchaseOrder(staff, po.id);
  await approvePurchaseOrder(manager, po.id);
  const lines = await prisma.purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } });
  const lineA = lines.find((l) => l.productId === a.id)!;
  const lineB = lines.find((l) => l.productId === b.id)!;
  const receipt = (qa: string, qb: string) => ({
    receivedOn: '2026-11-27',
    notes: '',
    lines: [
      { purchaseOrderLineId: lineA.id, quantity: qa },
      { purchaseOrderLineId: lineB.id, quantity: qb },
    ],
  });
  return { manager, staff, a, b, warehouse, po, lineA, lineB, receipt };
}

const onHand = async (productId: string, warehouseId: string) =>
  (
    await prisma.stockLevel.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    })
  )?.onHand.toString() ?? '0';

describe('goods receipts (FR-12)', () => {
  it('a full receipt raises stock, links movements and marks the PO Received', async () => {
    const { staff, a, b, warehouse, po, receipt } = await approvedPo();
    const grn = await receiveGoods(staff, po.id, receipt('10', '4'));

    expect(grn.status).toBe('RECEIVED');
    expect(grn.grnNumber).toBe(1);
    expect(await onHand(a.id, warehouse.id)).toBe('10');
    expect(await onHand(b.id, warehouse.id)).toBe('4');
    const movements = await prisma.stockMovement.findMany({ where: { type: 'RECEIPT' } });
    expect(movements).toHaveLength(2);
    expect(movements.every((m) => m.goodsReceiptLineId && m.createdById === staff.id)).toBe(true);
    expect(await stockLedgerMismatches()).toEqual([]);

    const audit = await prisma.auditLog.findFirst({ where: { action: 'RECEIVED' } });
    expect(audit).toMatchObject({ entityId: po.id, userId: staff.id });
    expect(audit?.details).toMatchObject({ grnNumber: 1, status: 'RECEIVED' });
  });

  it('partial receipts move the PO to Partially received, then Received', async () => {
    const { staff, a, warehouse, po, receipt } = await approvedPo();
    const first = await receiveGoods(staff, po.id, receipt('6', '0'));
    expect(first.status).toBe('PARTIALLY_RECEIVED');
    expect(first.lines).toHaveLength(1); // the 0 line is skipped

    const view = await getPurchaseOrder(staff, po.id);
    expect(view.lines.map((l) => l.received.toString()).sort()).toEqual(['0', '6']);

    const second = await receiveGoods(staff, po.id, receipt('4', '4'));
    expect(second.status).toBe('RECEIVED');
    expect(await onHand(a.id, warehouse.id)).toBe('10');
  });

  it('rejects over-receipt per line, with a field error, and changes nothing', async () => {
    const { staff, a, warehouse, po, lineA, receipt } = await approvedPo();
    await receiveGoods(staff, po.id, receipt('8', '0'));
    const err = await receiveGoods(staff, po.id, receipt('3', '0')).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.fieldErrors[`qty:${lineA.id}`]).toEqual(['Only 2 outstanding.']);
    expect(await onHand(a.id, warehouse.id)).toBe('8');
    expect(await prisma.goodsReceipt.count()).toBe(1);
  });

  it('the database also blocks over-receipt', async () => {
    const { staff, po, lineA } = await approvedPo();
    await expect(
      prisma.goodsReceipt.create({
        data: {
          purchaseOrderId: po.id,
          receivedOn: new Date(),
          receivedById: staff.id,
          lines: { create: [{ purchaseOrderLineId: lineA.id, quantity: 11 }] },
        },
      }),
    ).rejects.toThrow(/over-receipt/);
  });

  it('needs at least one quantity, and lines from this PO only', async () => {
    const { staff, po, receipt } = await approvedPo();
    await expect(receiveGoods(staff, po.id, receipt('0', '0'))).rejects.toThrow(
      /at least one line/,
    );
    const other = await approvedPo();
    await expect(receiveGoods(staff, po.id, other.receipt('1', '0'))).rejects.toThrow(
      /does not belong/,
    );
  });

  it('only approved or partly received POs can be received; then cancel is blocked', async () => {
    const { staff, manager, a, warehouse } = await approvedPo();
    const vendor = await prisma.vendor.findFirstOrThrow();
    const draft = await createPurchaseOrder(staff, {
      vendorId: vendor.id,
      warehouseId: warehouse.id,
      lines: [{ productId: a.id, quantity: '1', unitPrice: '1' }],
    });
    const line = await prisma.purchaseOrderLine.findFirstOrThrow({
      where: { purchaseOrderId: draft.id },
    });
    const input = {
      receivedOn: '2026-11-27',
      lines: [{ purchaseOrderLineId: line.id, quantity: '1' }],
    };
    await expect(receiveGoods(staff, draft.id, input)).rejects.toThrow(/approved purchase order/);

    await submitPurchaseOrder(staff, draft.id);
    await approvePurchaseOrder(manager, draft.id);
    await receiveGoods(staff, draft.id, input);
    await expect(receiveGoods(staff, draft.id, input)).rejects.toThrow(/approved purchase order/);
    await expect(cancelPurchaseOrder(manager, draft.id)).rejects.toThrow(/no longer/);
  });

  it('two concurrent receipts never exceed the ordered quantity (NFR-03)', async () => {
    const { staff, manager, a, warehouse, po, receipt } = await approvedPo();
    const results = await Promise.allSettled([
      receiveGoods(staff, po.id, receipt('7', '0')),
      receiveGoods(manager, po.id, receipt('7', '0')),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(ValidationError);
    expect(await onHand(a.id, warehouse.id)).toBe('7');
    expect(await stockLedgerMismatches()).toEqual([]);
  });
});

describe('audit log (FR-15)', () => {
  it('lists actions newest first with PO and product references', async () => {
    const { staff, manager, a, warehouse, po, receipt } = await approvedPo();
    await receiveGoods(staff, po.id, receipt('1', '0'));
    await adjustStock(manager, {
      productId: a.id,
      warehouseId: warehouse.id,
      quantity: '-1',
      reason: 'Damaged',
    });

    const page = await listAuditLog(manager);
    expect(page.rows.map((r) => r.action)).toEqual([
      'ADJUSTED',
      'RECEIVED',
      'APPROVED',
      'SUBMITTED',
      'CREATED',
    ]);
    expect(page.rows[0]!.ref).toMatchObject({ kind: 'product', sku: a.sku });
    expect(page.rows[1]!.ref).toMatchObject({ kind: 'po', poNumber: 1 });

    const received = await listAuditLog(manager, { action: 'RECEIVED' });
    expect(received.total).toBe(1);
    const future = await listAuditLog(manager, { from: '2999-01-01' });
    expect(future.total).toBe(0);
  });

  it('is for Admin and Manager only', async () => {
    const staff = await makeActor('STAFF');
    await expect(listAuditLog(staff)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAuditLog(await makeActor('ADMIN'))).resolves.toMatchObject({ total: 0 });
  });
});
