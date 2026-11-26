import { describe, expect, it } from 'vitest';
import { hasRole, requireRole } from '@/server/core/roles';
import { ForbiddenError } from '@/server/errors';

describe('requireRole', () => {
  it('passes when the role is allowed', () => {
    expect(() => requireRole({ role: 'MANAGER' }, 'ADMIN', 'MANAGER')).not.toThrow();
  });

  it('throws ForbiddenError when the role is not allowed', () => {
    expect(() => requireRole({ role: 'STAFF' }, 'ADMIN', 'MANAGER')).toThrow(ForbiddenError);
  });

  it('throws when nobody is signed in', () => {
    expect(() => requireRole(null, 'ADMIN')).toThrow(/signed in/);
  });

  it('hasRole is a plain check', () => {
    expect(hasRole({ role: 'ADMIN' }, 'ADMIN')).toBe(true);
    expect(hasRole({ role: 'STAFF' }, 'ADMIN')).toBe(false);
  });
});
