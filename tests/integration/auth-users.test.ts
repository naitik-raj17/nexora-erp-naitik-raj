import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/server/core/auth';
import { hashPassword } from '@/server/core/password';
import { signInLimiter } from '@/server/core/rate-limit';
import { createUser, listUsers, setUserActive, updateUser } from '@/server/core/users';
import { ForbiddenError, ValidationError } from '@/server/errors';
import { makeActor, resetDb } from '../helpers/db';

beforeEach(resetDb);

describe('authenticate (FR-01)', () => {
  it('accepts the right password, case-insensitive email', async () => {
    const admin = await makeActor('ADMIN', { passwordHash: await hashPassword('secret-123') });
    signInLimiter.reset(admin.email);
    const res = await authenticate(admin.email.toUpperCase(), 'secret-123');
    expect(res).toEqual({ ok: true, userId: admin.id });
  });

  it('rejects a wrong password with a generic message', async () => {
    const admin = await makeActor('ADMIN', { passwordHash: await hashPassword('secret-123') });
    signInLimiter.reset(admin.email);
    expect(await authenticate(admin.email, 'nope')).toEqual({
      ok: false,
      error: 'Email or password is incorrect.',
    });
  });

  it('rejects a deactivated user', async () => {
    const u = await makeActor('STAFF', {
      passwordHash: await hashPassword('secret-123'),
      isActive: false,
    });
    signInLimiter.reset(u.email);
    const res = await authenticate(u.email, 'secret-123');
    expect(res.ok).toBe(false);
  });

  it('blocks the sixth attempt in a minute (NFR-01)', async () => {
    signInLimiter.reset('nobody@test.io');
    for (let i = 0; i < 5; i++) await authenticate('nobody@test.io', 'x');
    const res = await authenticate('nobody@test.io', 'x');
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
  });
});

describe('users service (FR-02, FR-03)', () => {
  it('only Admin can list or create users', async () => {
    const manager = await makeActor('MANAGER');
    const staff = await makeActor('STAFF');
    await expect(listUsers(manager, {})).rejects.toThrow(ForbiddenError);
    await expect(
      createUser(staff, { name: 'X', email: 'x@test.io', role: 'STAFF', password: 'password1' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('creates a user with a lower-case email and a hashed password', async () => {
    const admin = await makeActor('ADMIN');
    const u = await createUser(admin, {
      name: 'New',
      email: 'New@Test.io',
      role: 'STAFF',
      password: 'password1',
    });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.email).toBe('new@test.io');
    expect(row.passwordHash).not.toBe('password1');
  });

  it('rejects a duplicate email', async () => {
    const admin = await makeActor('ADMIN');
    await createUser(admin, {
      name: 'A',
      email: 'dup@test.io',
      role: 'STAFF',
      password: 'password1',
    });
    await expect(
      createUser(admin, { name: 'B', email: 'DUP@test.io', role: 'STAFF', password: 'password1' }),
    ).rejects.toThrow(ValidationError);
  });

  it('keeps the password when the field is left blank', async () => {
    const admin = await makeActor('ADMIN');
    const u = await createUser(admin, {
      name: 'A',
      email: 'a@test.io',
      role: 'STAFF',
      password: 'password1',
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    await updateUser(admin, u.id, {
      name: 'A2',
      email: 'a@test.io',
      role: 'MANAGER',
      password: '',
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.role).toBe('MANAGER');
  });

  it('deactivates and reactivates, but never the Admin themself', async () => {
    const admin = await makeActor('ADMIN');
    const staff = await makeActor('STAFF');
    expect((await setUserActive(admin, staff.id, false)).isActive).toBe(false);
    expect((await setUserActive(admin, staff.id, true)).isActive).toBe(true);
    await expect(setUserActive(admin, admin.id, false)).rejects.toThrow(ValidationError);
  });
});
