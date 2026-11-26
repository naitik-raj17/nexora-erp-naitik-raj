import type { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { categorySchema } from '@/lib/schemas/inventory';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { NotFoundError } from '@/server/errors';
import { mapPrismaError } from '@/server/prisma-errors';

const UNIQUE = { field: 'name', message: 'A category with this name already exists.' };

export async function listCategories(
  actor: Actor,
  { q = '', page = 1 }: { q?: string; page?: number },
) {
  requireRole(actor, ...ALL_ROLES);
  const where: Prisma.CategoryWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
      ...pageArgs(page),
    }),
    prisma.category.count({ where }),
  ]);
  return toPage(rows, total, page);
}

export async function categoryOptions(actor: Actor) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
}

export async function getCategory(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  const row = isUuid(id) ? await prisma.category.findUnique({ where: { id } }) : null;
  if (!row) throw new NotFoundError('Category');
  return row;
}

export async function createCategory(actor: Actor, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = categorySchema.parse(input);
  return prisma.category.create({ data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Category');
  });
}

export async function updateCategory(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = categorySchema.parse(input);
  return prisma.category.update({ where: { id }, data }).catch((e) => {
    throw mapPrismaError(e, UNIQUE, 'Category');
  });
}
