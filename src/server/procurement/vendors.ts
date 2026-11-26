import type { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { pageArgs, toPage } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { vendorSchema } from '@/lib/schemas/procurement';
import { ALL_ROLES, MANAGERS, requireRole, type Actor } from '@/server/core/roles';
import { NotFoundError } from '@/server/errors';

/** FR-06. Vendor names are not unique: two branches of one company may both be vendors. */
export async function listVendors(
  actor: Actor,
  { q = '', page = 1 }: { q?: string; page?: number },
) {
  requireRole(actor, ...ALL_ROLES);
  const where: Prisma.VendorWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.vendor.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(page) }),
    prisma.vendor.count({ where }),
  ]);
  return toPage(rows, total, page);
}

export async function vendorOptions(actor: Actor) {
  requireRole(actor, ...ALL_ROLES);
  return prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export async function getVendor(actor: Actor, id: string) {
  requireRole(actor, ...ALL_ROLES);
  const row = isUuid(id) ? await prisma.vendor.findUnique({ where: { id } }) : null;
  if (!row) throw new NotFoundError('Vendor');
  return row;
}

export async function createVendor(actor: Actor, input: unknown) {
  requireRole(actor, ...MANAGERS);
  return prisma.vendor.create({ data: vendorSchema.parse(input) });
}

export async function updateVendor(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ...MANAGERS);
  const data = vendorSchema.parse(input);
  const exists = isUuid(id) && (await prisma.vendor.count({ where: { id } })) > 0;
  if (!exists) throw new NotFoundError('Vendor');
  return prisma.vendor.update({ where: { id }, data });
}
