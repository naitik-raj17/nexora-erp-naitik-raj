import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { goodsReceiptSchema, qtyField } from '@/lib/schemas/procurement';
import { writeAudit } from '@/server/core/audit';
import { ALL_ROLES, requireRole, type Actor } from '@/server/core/roles';
import { ValidationError } from '@/server/errors';
import { applyStockDelta } from '@/server/inventory/stock';
import { canReceivePo } from '@/server/procurement/po-rules';
import { lockPo } from '@/server/procurement/purchase-orders';

const D = Prisma.Decimal;

/**
 * FR-12: record a goods receipt against an approved PO, in full or in part.
 * One transaction (proposal §4 receipt flow): lock the PO, check no line goes over
 * what is outstanding, insert the receipt and its lines, one stock-in movement per line,
 * raise stock in the PO's warehouse, set the PO status and write the audit row.
 * The `grn_lines_no_over_receipt` trigger is the database safety net (NFR-03).
 */
export async function receiveGoods(actor: Actor, purchaseOrderId: string, input: unknown) {
  requireRole(actor, ...ALL_ROLES);
  const data = goodsReceiptSchema.parse(input);
  const wanted = data.lines
    .map((l) => ({ id: l.purchaseOrderLineId, quantity: new D(l.quantity) }))
    .filter((l) => l.quantity.gt(0));

  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, purchaseOrderId);
    if (!canReceivePo(po)) {
      throw new ValidationError('Goods can only be received against an approved purchase order.');
    }

    const lines = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId },
      include: { goodsReceiptLines: { select: { quantity: true } } },
    });
    const outstanding = new Map(
      lines.map((l) => [
        l.id,
        {
          productId: l.productId,
          left: l.goodsReceiptLines.reduce((s, g) => s.minus(g.quantity), l.quantity),
        },
      ]),
    );

    const fieldErrors: Record<string, string[]> = {};
    for (const w of wanted) {
      const line = outstanding.get(w.id);
      if (!line) throw new ValidationError('A line does not belong to this purchase order.');
      if (w.quantity.gt(line.left)) {
        fieldErrors[qtyField(w.id)] = [`Only ${line.left.toString()} outstanding.`];
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('You cannot receive more than is outstanding.', fieldErrors);
    }

    const grn = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId,
        receivedOn: new Date(`${data.receivedOn}T00:00:00Z`),
        receivedById: actor.id,
        notes: data.notes,
        lines: {
          create: wanted.map((w) => ({ purchaseOrderLineId: w.id, quantity: w.quantity })),
        },
      },
      include: { lines: true },
    });

    for (const gl of grn.lines) {
      const line = outstanding.get(gl.purchaseOrderLineId)!;
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          warehouseId: po.warehouseId,
          type: 'RECEIPT',
          quantity: gl.quantity,
          goodsReceiptLineId: gl.id,
          createdById: actor.id,
        },
      });
      await applyStockDelta(tx, line.productId, po.warehouseId, gl.quantity);
      line.left = line.left.minus(gl.quantity);
    }

    const status = [...outstanding.values()].every((l) => l.left.lte(0))
      ? 'RECEIVED'
      : 'PARTIALLY_RECEIVED';
    await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status } });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'RECEIVED',
      entity: 'PurchaseOrder',
      entityId: purchaseOrderId,
      details: { grnNumber: grn.grnNumber, status, lines: grn.lines.length },
    });
    return { ...grn, status };
  });
}
