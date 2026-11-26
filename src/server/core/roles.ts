import type { Role } from '@prisma/client';
import { ForbiddenError } from '@/server/errors';

/** The user every service function acts on behalf of. */
export type Actor = { id: string; role: Role; name: string; email: string };

export function hasRole(actor: Pick<Actor, 'role'>, ...roles: Role[]) {
  return roles.includes(actor.role);
}

/** Called at the top of every service function that reads or changes protected data (FR-03). */
export function requireRole(
  actor: Pick<Actor, 'role'> | null | undefined,
  ...roles: Role[]
): asserts actor is Actor {
  if (!actor) throw new ForbiddenError('You must be signed in.');
  if (!hasRole(actor, ...roles)) throw new ForbiddenError();
}

export const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'STAFF'];
export const MANAGERS: Role[] = ['ADMIN', 'MANAGER'];
