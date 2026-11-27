import { describe, expect, it } from 'vitest';
import { navForRole } from '@/lib/nav';

const hrefs = (role: Parameters<typeof navForRole>[0]) =>
  navForRole(role).flatMap((s) => s.items.map((i) => i.href));

describe('navForRole', () => {
  it('shows Users only to Admin', () => {
    expect(hrefs('ADMIN')).toContain('/users');
    expect(hrefs('MANAGER')).not.toContain('/users');
    expect(hrefs('STAFF')).not.toContain('/users');
  });

  it('shows the audit log to Admin and Manager only (FR-15)', () => {
    expect(hrefs('ADMIN')).toContain('/audit-log');
    expect(hrefs('MANAGER')).toContain('/audit-log');
    expect(hrefs('STAFF')).not.toContain('/audit-log');
  });

  it('drops sections with no visible items', () => {
    expect(navForRole('STAFF').map((s) => s.title)).not.toContain('Admin');
  });
});
