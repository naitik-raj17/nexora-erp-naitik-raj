import { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { stockAdjustmentSchema, stockIssueSchema } from '@/lib/schemas/inventory';
import { writeAudit } from '@/server/core/audit';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { NotFoundError, ValidationError } from '@/server/errors';

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;

/**
 * Changes `stock_levels.on_hand` by `delta` in one statement (rule D7).
 * A decrease only happens when enough stock is there, so two concurrent issues
 * can never take stock below zero; `CHECK (on_hand >= 0)` is the last safeguard.
 * Returns the new on-hand quantity.
 */
export async function applyStockDelta(
  tx: Tx,
  productId: string,
  warehouseId: string,
  delta: Prisma.Decimal,
) {
  if (delta.isZero()) throw new Error('applyStockDelta: delta must not be zero');

  if (delta.isPositive()) {
    const rows = await tx.$queryRaw<{ on_hand: Prisma.Decimal }[]>`
      INSERT INTO stock_levels (product_id, warehouse_id, on_hand, updated_at)
      VALUES (${productId}::uuid, ${warehouseId}::uuid, ${delta}::numeric, now())
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET on_hand = stock_levels.on_hand + EXCLUDED.on_hand, updated_at = now()
      RETURNING on_hand`;
    return rows[0]!.on_hand;
  }

  const rows = await tx.$queryRaw<{ on_hand: Prisma.Decimal }[]>`
    UPDATE stock_levels
       SET on_hand = on_hand + ${delta}::numeric, updated_at = now()
     WHERE product_id = ${productId}::uuid
       AND warehouse_id = ${warehouseId}::uuid
       AND on_hand + ${delta}::numeric >= 0
    RETURNING on_hand`;
  if (rows.length === 0) {
    const level = await tx.stockLevel.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    const available = level?.onHand ?? new D(0);
    throw new ValidationError(
      `Not enough stock: ${available.toString()} available in this warehouse.`,
      {
        quantity: [`Only ${available.toString()} available.`],
      },
    );
  }
  return rows[0]!.on_hand;
}

async function assertActiveTargets(tx: Tx, productId: string, warehouseId: string) {
  const [product, warehouse] = await Promise.all([
    tx.product.findUnique({ where: { id: productId }, select: { isActive: true } }),
    tx.warehouse.findUnique({ where: { id: warehouseId }, select: { isActive: true } }),
  ]);
  if (!product)
    throw new ValidationError('Product not found.', { productId: ['Choose a product.'] });
  if (!warehouse)
    throw new ValidationError('Warehouse not found.', { warehouseId: ['Choose a warehouse.'] });
  if (!warehouse.isActive) {
    throw new ValidationError('This warehouse is inactive.', {
      warehouseId: ['Choose an active warehouse.'],
    });
  }
}

/** FR-08: goods out. Any role. Stock can never go below zero. */
export async function issueStock(actor: Actor, input: unknown) {
  requireRole(actor, ...ALL_ROLES);
  const data = stockIssueSchema.parse(input);
  const delta = new D(data.quantity).negated();
  return prisma.$transaction(async (tx) => {
    await assertActiveTargets(tx, data.productId, data.warehouseId);
    const onHand = await applyStockDelta(tx, data.productId, data.warehouseId, delta);
    const movement = await tx.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        type: 'ISSUE',
        quantity: delta,
        reason: data.reason,
        createdById: actor.id,
      },
    });
    return { movement, onHand };
  });
}

/** FR-08: stock correction with a reason. Admin and Manager only; audited (FR-15). */
export async function adjustStock(actor: Actor, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = stockAdjustmentSchema.parse(input);
  const delta = new D(data.quantity);
  return prisma.$transaction(async (tx) => {
    await assertActiveTargets(tx, data.productId, data.warehouseId);
    const onHand = await applyStockDelta(tx, data.productId, data.warehouseId, delta);
    const movement = await tx.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        type: 'ADJUSTMENT',
        quantity: delta,
        reason: data.reason,
        createdById: actor.id,
      },
    });
    await writeAudit(tx, {
      userId: actor.id,
      action: 'ADJUSTED',
      entity: 'StockMovement',
      entityId: movement.id,
      details: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: delta.toString(),
        reason: data.reason,
      },
    });
    return { movement, onHand };
  });
}

export type StockFilter = { q?: string; warehouseId?: string; page?: number };

/** FR-07: on hand per product per warehouse. */
export async function listStockLevels(
  actor: Actor,
  { q = '', warehouseId = '', page = 1 }: StockFilter,
) {
  requireRole(actor, ...ALL_ROLES);
  const where: Prisma.StockLevelWhereInput = {
    ...(isUuid(warehouseId) ? { warehouseId } : {}),
    ...(q
      ? {
          product: {
            OR: [
              { sku: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.stockLevel.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, reorderLevel: true } },
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { warehouse: { code: 'asc' } }],
      ...pageArgs(page),
    }),
    prisma.stockLevel.count({ where }),
  ]);
  return toPage(rows, total, page);
}

/** On hand per warehouse for one product, plus the total. */
export async function productStock(actor: Actor, productId: string) {
  requireRole(actor, ...ALL_ROLES);
  if (!isUuid(productId)) throw new NotFoundError('Product');
  const levels = await prisma.stockLevel.findMany({
    where: { productId },
    include: { warehouse: { select: { code: true, name: true } } },
    orderBy: { warehouse: { code: 'asc' } },
  });
  const total = levels.reduce((sum, l) => sum.plus(l.onHand), new D(0));
  return { levels, total };
}

export type LedgerFilter = { warehouseId?: string; from?: string; to?: string; page?: number };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** FR-09: a product's movement history, newest first, filterable by warehouse and date range. */
export async function productLedger(actor: Actor, productId: string, f: LedgerFilter = {}) {
  requireRole(actor, ...ALL_ROLES);
  if (!isUuid(productId)) throw new NotFoundError('Product');
  const page = f.page ?? 1;
  const createdAt: Prisma.DateTimeFilter = {};
  if (f.from && DATE.test(f.from)) createdAt.gte = new Date(`${f.from}T00:00:00`);
  if (f.to && DATE.test(f.to)) {
    const end = new Date(`${f.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    createdAt.lt = end;
  }
  const where: Prisma.StockMovementWhereInput = {
    productId,
    ...(isUuid(f.warehouseId) ? { warehouseId: f.warehouseId } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      include: {
        warehouse: { select: { code: true } },
        createdBy: { select: { name: true } },
        goodsReceiptLine: {
          select: { goodsReceipt: { select: { grnNumber: true, purchaseOrderId: true } } },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(page),
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return toPage(rows, total, page);
}
