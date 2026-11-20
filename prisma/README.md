# prisma

Database schema, migrations and seed data for PostgreSQL 17. Added on Day 8, after approval.

- `schema.prisma` implements the 12 tables and 5 enums in [`docs/erd.md`](../docs/erd.md).
- `migrations/` holds versioned migrations. The first one adds the check constraints Prisma cannot express (positive quantities, non-negative stock, no self-approval, required movement reasons).
- `seed.ts` creates three demo users (one per role), categories, 3 warehouses, 20 vendors, 200 products and 100 purchase orders in mixed statuses.
