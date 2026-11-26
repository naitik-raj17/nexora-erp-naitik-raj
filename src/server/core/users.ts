import { Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { prisma } from '@/lib/prisma';
import { pageArgs, toPage } from '@/lib/pagination';
import { createUserSchema, updateUserSchema } from '@/lib/schemas/core';
import { NotFoundError, ValidationError } from '@/server/errors';
import { hashPassword } from '@/server/core/password';
import { requireRole, type Actor } from '@/server/core/roles';

const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export async function listUsers(actor: Actor, { q = '', page = 1 }: { q?: string; page?: number }) {
  requireRole(actor, 'ADMIN');
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select, orderBy: { name: 'asc' }, ...pageArgs(page) }),
    prisma.user.count({ where }),
  ]);
  return toPage(rows, total, page);
}

export async function getUser(actor: Actor, id: string) {
  requireRole(actor, 'ADMIN');
  if (!isUuid(id)) throw new NotFoundError('User');
  const user = await prisma.user.findUnique({ where: { id }, select });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function createUser(actor: Actor, input: unknown) {
  requireRole(actor, 'ADMIN');
  const data = createUserSchema.parse(input);
  try {
    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: await hashPassword(data.password),
      },
      select,
    });
  } catch (e) {
    throw uniqueEmail(e);
  }
}

export async function updateUser(actor: Actor, id: string, input: unknown) {
  requireRole(actor, 'ADMIN');
  const data = updateUserSchema.parse(input);
  if (id === actor.id && data.role !== 'ADMIN') {
    throw new ValidationError('You cannot remove your own Admin role.', {
      role: ['Keep your own role as Admin.'],
    });
  }
  try {
    return await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
      },
      select,
    });
  } catch (e) {
    throw uniqueEmail(e);
  }
}

/** FR-02: deactivate or reactivate. A deactivated user's session stops working on the next request. */
export async function setUserActive(actor: Actor, id: string, isActive: boolean) {
  requireRole(actor, 'ADMIN');
  if (id === actor.id && !isActive)
    throw new ValidationError('You cannot deactivate your own account.');
  return prisma.user.update({ where: { id }, data: { isActive }, select });
}

function uniqueEmail(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ValidationError('A user with this email already exists.', {
      email: ['Already in use.'],
    });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
    return new NotFoundError('User');
  return e;
}
