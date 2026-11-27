import { Prisma, type PoStatus } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { PO_STATUSES, purchaseOrderSchema, rejectSchema } from '@/lib/schemas/procurement';
import { writeAudit } from '@/server/core/audit';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { ForbiddenError, NotFoundError, ValidationError } from '@/server/errors';
import { canApprovePo, canCancelPo, canEditPo } from '@/server/procurement/po-rules';

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;

/** D4: a PO total is always calculated from its lines. */
export function poTotal(lines: { quantity: Prisma.Decimal; unitPrice: Prisma.Decimal }[]) {
  return lines.reduce((sum, l) => sum.plus(l.quantity.times(l.unitPrice)), new D(0));
}

export type PoFilter = {
  q?: string;
  status?: string;
  vendorId?: string;
  mine?: boolean;
  page?: number;
};

/** FR-10: list with status and vendor filters; `q` matches the PO number (42 or PO-000042) or vendor name. */
export async function listPurchaseOrders(actor: Actor, f: PoFilter = {}) {
  requireRole(actor, ...ALL_ROLES);
  const page = f.page ?? 1;
  const q = f.q?.trim() ?? '';
  const num = /^(po-?)?0*(\d{1,9})$/i.exec(q)?.[2];
  const where: Prisma.PurchaseOrderWhereInput = {
    ...((PO_STATUSES as readonly string[]).includes(f.status ?? '')
      ? { status: f.status as PoStatus }
      : {}),
    ...(isUuid(f.vendorId) ? { vendorId: f.vendorId } : {}),
    ...(f.mine ? { createdById: actor.id } : {}),
    ...(q
      ? num
        ? { poNumber: Number(num) }
        : { vendor: { name: { contains: q, mode: 'insensitive' as const } } }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        warehouse: { select: { code: true } },
        createdBy: { select: { name: true } },
        lines: { select: { quantity: true, unitPrice: true } },
      },
      orderBy: { poNumber: 'desc' },
      ...pageArgs(page),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return toPage(
    rows.map(({ lines, ...po }) => ({ ...po, lineCount: lines.length, total: poTotal(lines) })),
    total,
    page,
  );
}

export async function getPurchaseOrder(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  const po = isUuid(id)
    ? await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          vendor: true,
          warehouse: true,
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { name: true } },
          lines: {
            include: {
              product: { select: { id: true, sku: true, name: true, unit: true } },
              goodsReceiptLines: { select: { quantity: true } },
            },
            orderBy: { product: { name: 'asc' } },
          },
          goodsReceipts: {
            include: {
              receivedBy: { select: { name: true } },
              lines: {
                select: {
                  id: true,
                  quantity: true,
                  purchaseOrderLine: { select: { product: { select: { sku: true } } } },
                },
              },
            },
            orderBy: { grnNumber: 'asc' },
          },
        },
      })
    : null;
  if (!po) throw new NotFoundError('Purchase order');
  const history = await prisma.auditLog.findMany({
    where: { entity: 'PurchaseOrder', entityId: po.id },
    include: { user: { select: { name: true } } },
    orderBy: { id: 'asc' },
  });
  const lines = po.lines.map(({ goodsReceiptLines, ...l }) => ({
    ...l,
    received: goodsReceiptLines.reduce((s, g) => s.plus(g.quantity), new D(0)), // D5
    lineTotal: l.quantity.times(l.unitPrice),
  }));
  return { ...po, lines, total: poTotal(po.lines), history };
}

async function assertRefs(
  tx: Tx,
  data: { vendorId: string; warehouseId: string; lines: { productId: string }[] },
) {
  const [vendor, warehouse, products] = await Promise.all([
    tx.vendor.findUnique({ where: { id: data.vendorId }, select: { isActive: true } }),
    tx.warehouse.findUnique({ where: { id: data.warehouseId }, select: { isActive: true } }),
    tx.product.findMany({
      where: { id: { in: data.lines.map((l) => l.productId) }, isActive: true },
      select: { id: true },
    }),
  ]);
  if (!vendor?.isActive)
    throw new ValidationError('Choose an active vendor.', {
      vendorId: ['Choose an active vendor.'],
    });
  if (!warehouse?.isActive) {
    throw new ValidationError('Choose an active warehouse.', {
      warehouseId: ['Choose an active warehouse.'],
    });
  }
  if (products.length !== data.lines.length) {
    throw new ValidationError('Every line needs an active product.', {
      lines: ['Every line needs an active product.'],
    });
  }
}

function poData(data: ReturnType<typeof purchaseOrderSchema.parse>) {
  return {
    vendorId: data.vendorId,
    warehouseId: data.warehouseId,
    expectedDate: data.expectedDate ? new Date(`${data.expectedDate}T00:00:00Z`) : null,
    notes: data.notes,
  };
}

/** FR-10: any role creates a draft. */
export async function createPurchaseOrder(actor: Actor, input: unknown) {
  requireRole(actor, ...ALL_ROLES);
  const data = purchaseOrderSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await assertRefs(tx, data);
    const po = await tx.purchaseOrder.create({
      data: { ...poData(data), createdById: actor.id, lines: { create: data.lines } },
    });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'CREATED',
      entity: 'PurchaseOrder',
      entityId: po.id,
    });
    return po;
  });
}

/** Lock the PO row so concurrent status changes are serialised. */
export async function lockPo(tx: Tx, id: string) {
  if (!isUuid(id)) throw new NotFoundError('Purchase order');
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM purchase_orders WHERE id = ${id}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundError('Purchase order');
  return tx.purchaseOrder.findUniqueOrThrow({ where: { id } });
}

/** FR-10: edit a draft; lines are replaced. */
export async function updatePurchaseOrder(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...ALL_ROLES);
  const data = purchaseOrderSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, id);
    if (!canEditPo(actor, po)) throw editError(po);
    await assertRefs(tx, data);
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
    return tx.purchaseOrder.update({
      where: { id },
      data: { ...poData(data), lines: { create: data.lines } },
    });
  });
}

function editError(po: { status: PoStatus }) {
  if (po.status !== 'DRAFT')
    return new ValidationError('Only draft purchase orders can be changed.');
  return new ForbiddenError('You can only change your own purchase orders.');
}

/** FR-10: DRAFT → SUBMITTED. */
export async function submitPurchaseOrder(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, id);
    if (!canEditPo(actor, po)) throw editError(po);
    const lineCount = await tx.purchaseOrderLine.count({ where: { purchaseOrderId: id } });
    if (lineCount === 0) throw new ValidationError('Add at least one line before submitting.');
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: 'SUBMITTED' } });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'SUBMITTED',
      entity: 'PurchaseOrder',
      entityId: id,
    });
    return updated;
  });
}

function approvalError(actor: Actor, po: { status: PoStatus; createdById: string }) {
  if (po.status !== 'SUBMITTED')
    return new ValidationError('Only submitted purchase orders can be approved or rejected.');
  if (po.createdById === actor.id)
    return new ForbiddenError('You cannot approve or reject your own purchase order.');
  return new ForbiddenError();
}

/** FR-11: SUBMITTED → APPROVED, by an Admin or Manager who did not create it. */
export async function approvePurchaseOrder(actor: Actor, id: string) {
  requireRole(actor, ...MANAGERS);
  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, id);
    if (!canApprovePo(actor, po)) throw approvalError(actor, po);
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: actor.id, approvedAt: new Date() },
    });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'APPROVED',
      entity: 'PurchaseOrder',
      entityId: id,
    });
    return updated;
  });
}

/** FR-11: SUBMITTED → DRAFT with a reason stored in the audit log. */
export async function rejectPurchaseOrder(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const { reason } = rejectSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, id);
    if (!canApprovePo(actor, po)) throw approvalError(actor, po);
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: 'DRAFT' } });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'REJECTED',
      entity: 'PurchaseOrder',
      entityId: id,
      details: { reason },
    });
    return updated;
  });
}

/** FR-16: cancel a PO that has nothing received. */
export async function cancelPurchaseOrder(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.$transaction(async (tx) => {
    const po = await lockPo(tx, id);
    if (!canCancelPo(actor, po)) {
      if (['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].includes(po.status)) {
        throw new ValidationError('This purchase order can no longer be cancelled.');
      }
      throw new ForbiddenError(
        'You can only cancel your own purchase orders before they are approved.',
      );
    }
    if ((await tx.goodsReceipt.count({ where: { purchaseOrderId: id } })) > 0) {
      throw new ValidationError('Goods have already been received against this purchase order.');
    }
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'CANCELLED',
      entity: 'PurchaseOrder',
      entityId: id,
    });
    return updated;
  });
}
