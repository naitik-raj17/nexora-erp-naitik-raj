import type { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { warehouseSchema } from '@/lib/schemas/inventory';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { NotFoundError } from '@/server/errors';
import { mapPrismaError } from '@/server/prisma-errors';

const UNIQUE = { field: 'code', message: 'A warehouse with this code already exists.' };

export async function listWarehouses(
  actor: Actor,
  { q = '', page = 1 }: { q?: string; page?: number },
) {
  requireRole(actor, ...ALL_ROLES);
  const where: Prisma.WarehouseWhereInput = q
    ? {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.warehouse.findMany({ where, orderBy: { code: 'asc' }, ...pageArgs(page) }),
    prisma.warehouse.count({ where }),
  ]);
  return toPage(rows, total, page);
}

/** Active warehouses for select boxes. */
export async function warehouseOptions(actor: Actor) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
}

export async function getWarehouse(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  const row = isUuid(id) ? await prisma.warehouse.findUnique({ where: { id } }) : null;
  if (!row) throw new NotFoundError('Warehouse');
  return row;
}

export async function createWarehouse(actor: Actor, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = warehouseSchema.parse(input);
  return prisma.warehouse.create({ data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Warehouse');
  });
}

export async function updateWarehouse(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = warehouseSchema.parse(input);
  return prisma.warehouse.update({ where: { id }, data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Warehouse');
  });
}
