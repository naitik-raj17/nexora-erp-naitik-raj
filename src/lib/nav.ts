import type { Role } from '@prisma/client';

export type NavItem = {
  href: string;
  label: string;
  /** Roles that see this item. Mirrors the permission matrix in docs/proposal.md. */
  roles: readonly Role[];
};

const ALL: readonly Role[] = ['ADMIN', 'MANAGER', 'STAFF'];

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', roles: ALL }],
  },
  {
    title: 'Procurement',
    items: [
      { href: '/purchase-orders', label: 'Purchase orders', roles: ALL },
      { href: '/vendors', label: 'Vendors', roles: ALL },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/stock', label: 'Stock levels', roles: ALL },
      { href: '/products', label: 'Products', roles: ALL },
      { href: '/warehouses', label: 'Warehouses', roles: ALL },
      { href: '/categories', label: 'Categories', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Admin',
    items: [{ href: '/users', label: 'Users', roles: ['ADMIN'] }],
  },
];

/** Navigation filtered to what a role may see; empty sections are dropped. */
export function navForRole(role: Role) {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles.includes(role)),
  })).filter((s) => s.items.length > 0);
}
