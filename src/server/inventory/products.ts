import type { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/schemas/inventory';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { NotFoundError } from '@/server/errors';
import { mapPrismaError } from '@/server/prisma-errors';

const UNIQUE = { field: 'sku', message: 'A product with this SKU already exists.' };

export type ProductFilter = { q?: string; categoryId?: string; page?: number };

/** FR-04: search by SKU or name, filter by category, 25 per page. */
export async function listProducts(
  actor: Actor,
  { q = '', categoryId = '', page = 1 }: ProductFilter,
) {
  requireRole(actor, ...ALL_ROLES);
  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(isUuid(categoryId) ? { categoryId } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
      ...pageArgs(page),
    }),
    prisma.product.count({ where }),
  ]);
  return toPage(rows, total, page);
}

/** Active products for select boxes. */
export async function productOptions(actor: Actor) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, sku: true, name: true, unit: true },
  });
}

export async function getProduct(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  const row = isUuid(id)
    ? await prisma.product.findUnique({
        where: { id },
        include: { category: { select: { name: true } } },
      })
    : null;
  if (!row) throw new NotFoundError('Product');
  return row;
}

export async function createProduct(actor: Actor, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = productSchema.parse(input);
  return prisma.product.create({ data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Product');
  });
}

export async function updateProduct(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = productSchema.parse(input);
  return prisma.product.update({ where: { id }, data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Product');
  });
}
