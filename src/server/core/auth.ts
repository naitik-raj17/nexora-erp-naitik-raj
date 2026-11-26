import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasRole, type Actor } from '@/server/core/roles';
import { signInLimiter } from '@/server/core/rate-limit';
import { verifyPassword } from '@/server/core/password';

/**
 * The signed-in user, reloaded from the database on every request so that
 * deactivation and role changes take effect immediately (FR-01).
 */
export const getCurrentUser = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** For pages and actions: the signed-in user, or a redirect to sign-in. */
export async function requireUser(): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  return user;
}

/** For pages: users without one of the roles are sent back to the dashboard. */
export async function requirePageRole(...roles: Role[]): Promise<Actor> {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) redirect('/dashboard');
  return user;
}

export type SignInResult = { ok: true; userId: string } | { ok: false; error: string };

const INVALID = 'Email or password is incorrect.';

/** Checks credentials. Does not touch the session, so it can be unit-tested. */
export async function authenticate(emailInput: string, password: string): Promise<SignInResult> {
  const email = emailInput.trim().toLowerCase();
  if (!signInLimiter.attempt(email)) {
    return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { ok: false, error: INVALID };
  if (!user.isActive) return { ok: false, error: 'This account has been deactivated.' };
  signInLimiter.reset(email);
  return { ok: true, userId: user.id };
}
