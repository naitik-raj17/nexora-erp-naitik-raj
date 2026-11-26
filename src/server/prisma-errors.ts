import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/server/errors';

/** Maps unique-key and missing-row errors from Prisma to user-facing errors. */
export function mapPrismaError(
  e: unknown,
  unique: { field: string; message: string },
  what = 'Record',
): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002')
      return new ValidationError(unique.message, { [unique.field]: [unique.message] });
    if (e.code === 'P2025' || e.code === 'P2023') return new NotFoundError(what);
    if (e.code === 'P2003') return new ValidationError('A linked record does not exist.');
  }
  return e;
}
