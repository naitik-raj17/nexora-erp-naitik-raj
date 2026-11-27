import type { AuditAction, Prisma } from '@prisma/client';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { MANAGERS, requireRole, type Actor } from '@/server/core/roles';

type Tx = Prisma.TransactionClient;

/** FR-15: one row per document action, written in the same transaction as the change. */
export function writeAudit(
  tx: Tx,
  entry: {
    userId: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    details?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({ data: entry });
}

export const AUDIT_ACTIONS = [
  'CREATED',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'CANCELLED',
  'ADJUSTED',
] as const satisfies readonly AuditAction[];

export type AuditFilter = { action?: string; from?: string; to?: string; page?: number };

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

/**
 * FR-15: the audit log, newest first, for Admin and Manager.
 * Each row gets a readable reference (PO number, or the adjusted product's SKU).
 */
export async function listAuditLog(actor: Actor, f: AuditFilter = {}) {
  requireRole(actor, ...MANAGERS);
  const page = f.page ?? 1;
  const createdAt: Prisma.DateTimeFilter = {};
  if (isDate(f.from)) createdAt.gte = new Date(`${f.from}T00:00:00Z`);
  if (isDate(f.to)) createdAt.lt = new Date(Date.parse(`${f.to}T00:00:00Z`) + 86_400_000);
  const where: Prisma.AuditLogWhereInput = {
    ...((AUDIT_ACTIONS as readonly string[]).includes(f.action ?? '')
      ? { action: f.action as AuditAction }
      : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { id: 'desc' },
      ...pageArgs(page),
    }),
    prisma.auditLog.count({ where }),
  ]);

  const ids = (entity: string) => rows.filter((r) => r.entity === entity).map((r) => r.entityId);
  const [pos, movements] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { id: { in: ids('PurchaseOrder') } },
      select: { id: true, poNumber: true },
    }),
    prisma.stockMovement.findMany({
      where: { id: { in: ids('StockMovement') } },
      select: { id: true, product: { select: { id: true, sku: true } } },
    }),
  ]);
  const poById = new Map(pos.map((p) => [p.id, p]));
  const productByMovement = new Map(movements.map((m) => [m.id, m.product]));

  return toPage(
    rows.map((r) => {
      const po = r.entity === 'PurchaseOrder' ? poById.get(r.entityId) : undefined;
      const product = r.entity === 'StockMovement' ? productByMovement.get(r.entityId) : undefined;
      return {
        ...r,
        id: r.id.toString(),
        ref: po
          ? { kind: 'po' as const, id: po.id, poNumber: po.poNumber }
          : product
            ? { kind: 'product' as const, id: product.id, sku: product.sku }
            : null,
      };
    }),
    total,
    page,
  );
}
