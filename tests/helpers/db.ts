import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Actor } from '@/server/core/roles';

const TABLES = [
  'audit_logs',
  'stock_movements',
  'stock_levels',
  'goods_receipt_lines',
  'goods_receipts',
  'purchase_order_lines',
  'purchase_orders',
  'products',
  'categories',
  'warehouses',
  'vendors',
  'users',
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

let n = 0;

/** Inserts a user and returns it as an Actor. The hash is a placeholder; use hashPassword for sign-in tests. */
export async function makeActor(
  role: Role,
  overrides: { passwordHash?: string; isActive?: boolean } = {},
): Promise<Actor> {
  n += 1;
  const user = await prisma.user.create({
    data: {
      email: `${role.toLowerCase()}${n}@test.io`,
      name: `${role} ${n}`,
      role,
      passwordHash: overrides.passwordHash ?? 'x',
      isActive: overrides.isActive ?? true,
    },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** A category, one product and one warehouse, ready for stock tests. */
export async function makeStockFixture() {
  const category = await prisma.category.create({ data: { name: `Cat ${++n}` } });
  const product = await prisma.product.create({
    data: {
      sku: `SKU-${n}`,
      name: `Product ${n}`,
      categoryId: category.id,
      unit: 'PCS',
      reorderLevel: 5,
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { code: `WH-${n}`, name: `Warehouse ${n}` },
  });
  return { category, product, warehouse };
}

/** Checks rule D7: every stock level equals the sum of its movements. */
export async function stockLedgerMismatches() {
  return prisma.$queryRaw<{ product_id: string }[]>`
    SELECT l.product_id
      FROM stock_levels l
      LEFT JOIN (
        SELECT product_id, warehouse_id, SUM(quantity) AS total
          FROM stock_movements GROUP BY product_id, warehouse_id
      ) m USING (product_id, warehouse_id)
     WHERE l.on_hand <> COALESCE(m.total, 0)`;
}
