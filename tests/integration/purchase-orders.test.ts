import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from '@/server/procurement/purchase-orders';
import { ForbiddenError, ValidationError } from '@/server/errors';
import { makeActor, makeStockFixture, resetDb } from '../helpers/db';

beforeEach(resetDb);

async function setup() {
  const admin = await makeActor('ADMIN');
  const manager = await makeActor('MANAGER');
  const staff = await makeActor('STAFF');
  const other = await makeActor('STAFF');
  const { product, warehouse } = await makeStockFixture();
  const { product: product2 } = await makeStockFixture();
  const vendor = await prisma.vendor.create({ data: { name: 'Acme' } });
  const input = (lines = [{ productId: product.id, quantity: '10', unitPrice: '12.50' }]) => ({
    vendorId: vendor.id,
    warehouseId: warehouse.id,
    expectedDate: '2026-12-01',
    notes: '',
    lines: JSON.stringify(lines),
  });
  return { admin, manager, staff, other, product, product2, vendor, warehouse, input };
}

describe('create and edit (FR-10)', () => {
  it('creates a draft with lines and a calculated total', async () => {
    const { staff, product, product2, input } = await setup();
    const po = await createPurchaseOrder(
      staff,
      input([
        { productId: product.id, quantity: '10', unitPrice: '12.50' },
        { productId: product2.id, quantity: '2.5', unitPrice: '4' },
      ]),
    );
    expect(po.status).toBe('DRAFT');
    const full = await getPurchaseOrder(staff, po.id);
    expect(full.total.toString()).toBe('135');
    expect(full.history.map((h) => h.action)).toEqual(['CREATED']);
  });

  it('rejects no lines, duplicate products, zero quantity and inactive vendors', async () => {
    const { staff, product, vendor, input } = await setup();
    await expect(createPurchaseOrder(staff, input([]))).rejects.toThrow();
    const dup = { productId: product.id, quantity: '1', unitPrice: '1' };
    await expect(createPurchaseOrder(staff, input([dup, dup]))).rejects.toThrow();
    await expect(
      createPurchaseOrder(staff, input([{ productId: product.id, quantity: '0', unitPrice: '1' }])),
    ).rejects.toThrow();
    await prisma.vendor.update({ where: { id: vendor.id }, data: { isActive: false } });
    await expect(createPurchaseOrder(staff, input())).rejects.toThrow(ValidationError);
  });

  it('Staff edit only their own drafts; lines are replaced', async () => {
    const { staff, other, manager, product2, input } = await setup();
    const po = await createPurchaseOrder(staff, input());
    await expect(updatePurchaseOrder(other, po.id, input())).rejects.toThrow(ForbiddenError);
    await updatePurchaseOrder(
      manager,
      po.id,
      input([{ productId: product2.id, quantity: '1', unitPrice: '9' }]),
    );
    const full = await getPurchaseOrder(staff, po.id);
    expect(full.lines.map((l) => l.productId)).toEqual([product2.id]);
  });
});

describe('submit, approve, reject (FR-11)', () => {
  it('draft → submitted → approved records approver and audit rows', async () => {
    const { staff, manager, input } = await setup();
    const po = await createPurchaseOrder(staff, input());
    await submitPurchaseOrder(staff, po.id);
    await expect(updatePurchaseOrder(staff, po.id, input())).rejects.toThrow(/Only draft/);
    const approved = await approvePurchaseOrder(manager, po.id);
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedById).toBe(manager.id);
    expect(approved.approvedAt).toBeInstanceOf(Date);
    const full = await getPurchaseOrder(staff, po.id);
    expect(full.history.map((h) => h.action)).toEqual(['CREATED', 'SUBMITTED', 'APPROVED']);
  });

  it('nobody approves their own PO, and Staff cannot approve', async () => {
    const { manager, admin, staff, input } = await setup();
    const po = await createPurchaseOrder(manager, input());
    await submitPurchaseOrder(manager, po.id);
    await expect(approvePurchaseOrder(manager, po.id)).rejects.toThrow(/own purchase order/);
    await expect(approvePurchaseOrder(staff, po.id)).rejects.toThrow(ForbiddenError);
    await expect(approvePurchaseOrder(admin, po.id)).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('the database also blocks self-approval', async () => {
    const { manager, input } = await setup();
    const po = await createPurchaseOrder(manager, input());
    await expect(
      prisma.purchaseOrder.update({ where: { id: po.id }, data: { approvedById: manager.id } }),
    ).rejects.toThrow(/po_no_self_approval/);
  });

  it('rejection returns the PO to draft with a reason in the audit log', async () => {
    const { staff, manager, input } = await setup();
    const po = await createPurchaseOrder(staff, input());
    await submitPurchaseOrder(staff, po.id);
    await expect(rejectPurchaseOrder(manager, po.id, { reason: '' })).rejects.toThrow();
    const rejected = await rejectPurchaseOrder(manager, po.id, { reason: 'Price too high' });
    expect(rejected.status).toBe('DRAFT');
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'REJECTED' } });
    expect(log.details).toEqual({ reason: 'Price too high' });
    await expect(submitPurchaseOrder(staff, po.id)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('a draft cannot be approved', async () => {
    const { staff, manager, input } = await setup();
    const po = await createPurchaseOrder(staff, input());
    await expect(approvePurchaseOrder(manager, po.id)).rejects.toThrow(/Only submitted/);
  });

  it('two managers approving at once: one wins, one gets a clear error', async () => {
    const { staff, manager, admin, input } = await setup();
    const po = await createPurchaseOrder(staff, input());
    await submitPurchaseOrder(staff, po.id);
    const results = await Promise.allSettled([
      approvePurchaseOrder(manager, po.id),
      approvePurchaseOrder(admin, po.id),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { action: 'APPROVED' } })).toBe(1);
  });
});

describe('cancel (FR-16) and list', () => {
  it('Staff cancel their own unapproved POs; managers can cancel approved ones', async () => {
    const { staff, other, manager, input } = await setup();
    const a = await createPurchaseOrder(staff, input());
    await expect(cancelPurchaseOrder(other, a.id)).rejects.toThrow(ForbiddenError);
    await expect(cancelPurchaseOrder(staff, a.id)).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(cancelPurchaseOrder(staff, a.id)).rejects.toThrow(/no longer/);

    const b = await createPurchaseOrder(staff, input());
    await submitPurchaseOrder(staff, b.id);
    await approvePurchaseOrder(manager, b.id);
    await expect(cancelPurchaseOrder(staff, b.id)).rejects.toThrow(ForbiddenError);
    await expect(cancelPurchaseOrder(manager, b.id)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
  });

  it('filters by status, PO number and vendor name', async () => {
    const { staff, input } = await setup();
    const a = await createPurchaseOrder(staff, input());
    await createPurchaseOrder(staff, input());
    await submitPurchaseOrder(staff, a.id);
    expect((await listPurchaseOrders(staff, { status: 'SUBMITTED' })).total).toBe(1);
    expect(
      (await listPurchaseOrders(staff, { q: `PO-${String(a.poNumber).padStart(6, '0')}` })).rows[0]
        ?.id,
    ).toBe(a.id);
    expect((await listPurchaseOrders(staff, { q: String(a.poNumber) })).total).toBe(1);
    expect((await listPurchaseOrders(staff, { q: 'acm' })).total).toBe(2);
    expect((await listPurchaseOrders(staff, { status: 'BOGUS' })).total).toBe(2);
  });
});
