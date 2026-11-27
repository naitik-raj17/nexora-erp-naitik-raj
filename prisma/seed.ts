/**
 * Demo data. Safe to re-run: existing rows are kept (upsert by unique key).
 * Demo accounts all use the password in DEMO_PASSWORD.
 */
import { PrismaClient, type Role, type Unit } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Nexora@2026';

const USERS: { email: string; name: string; role: Role }[] = [
  { email: 'admin@nexora.test', name: 'Asha Admin', role: 'ADMIN' },
  { email: 'manager@nexora.test', name: 'Manoj Manager', role: 'MANAGER' },
  { email: 'staff@nexora.test', name: 'Sara Staff', role: 'STAFF' },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`users: ${USERS.length}`);
}

const CATEGORIES: { name: string; unit: Unit; items: string[] }[] = [
  {
    name: 'Fasteners',
    unit: 'BOX',
    items: ['Hex bolt', 'Wood screw', 'Rivet', 'Washer', 'Anchor', 'Nut'],
  },
  {
    name: 'Electrical',
    unit: 'PCS',
    items: ['Switch', 'Socket', 'MCB', 'LED bulb', 'Junction box', 'Plug'],
  },
  {
    name: 'Cables',
    unit: 'METRE',
    items: ['Copper wire', 'Flat cable', 'Coaxial cable', 'LAN cable'],
  },
  { name: 'Paints', unit: 'LITRE', items: ['Primer', 'Enamel', 'Emulsion', 'Thinner', 'Varnish'] },
  { name: 'Plumbing', unit: 'PCS', items: ['PVC pipe', 'Elbow', 'Ball valve', 'Tap', 'Coupler'] },
  {
    name: 'Tools',
    unit: 'PCS',
    items: ['Hammer', 'Spanner', 'Screwdriver', 'Plier', 'Drill bit', 'Tape'],
  },
  { name: 'Safety', unit: 'PCS', items: ['Helmet', 'Gloves', 'Goggles', 'Ear plug', 'Vest'] },
  { name: 'Raw materials', unit: 'KG', items: ['Cement', 'Sand', 'Steel rod', 'Gravel', 'Lime'] },
];
const SIZES = ['S', 'M', 'L', 'XL', '6 mm', '8 mm', '10 mm', '12 mm'];

const WAREHOUSES = [
  { code: 'WH-MAIN', name: 'Main warehouse', address: 'Plot 12, Industrial Area, Pune' },
  { code: 'WH-NORTH', name: 'North depot', address: 'Sector 63, Noida' },
  { code: 'WH-SOUTH', name: 'South depot', address: 'Peenya Phase 2, Bengaluru' },
];

const VENDOR_NAMES = [
  'Acme Industrial Supplies',
  'Bharat Hardware Co',
  'Crown Electricals',
  'Deccan Paints',
  'Eastern Fasteners',
  'Fortune Tools',
  'Ganga Pipes',
  'Himalaya Safety Gear',
  'Indus Cables',
  'Jaipur Metals',
  'Kaveri Traders',
  'Lotus Building Materials',
  'Mahindra Components',
  'Narmada Electricals',
  'Orient Hardware',
  'Pioneer Plumbing',
  'Quality Paints',
  'Royal Steel',
  'Sahyadri Supplies',
  'Triveni Traders',
];

async function seedMasterData() {
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name },
    });
    categoryIds.set(c.name, row.id);
  }
  for (const w of WAREHOUSES) {
    await prisma.warehouse.upsert({ where: { code: w.code }, update: {}, create: w });
  }
  if ((await prisma.vendor.count()) === 0) {
    await prisma.vendor.createMany({
      data: VENDOR_NAMES.map((name, i) => ({
        name,
        contactName:
          ['Ravi', 'Priya', 'Arjun', 'Neha', 'Vikram'][i % 5] +
          ' ' +
          ['Sharma', 'Iyer', 'Patel', 'Gupta'][i % 4],
        email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, '')}.in`,
        phone: `+91 98${String(10000000 + i * 7919).slice(0, 8)}`,
        isActive: i !== 19,
      })),
    });
  }
  // 200 products: each category's items crossed with sizes, round-robin until 200.
  let n = 0;
  for (let size = 0; n < 200; size++) {
    for (const c of CATEGORIES) {
      for (const item of c.items) {
        if (n >= 200) break;
        n += 1;
        const sku = `${c.name.slice(0, 3).toUpperCase()}-${String(n).padStart(4, '0')}`;
        await prisma.product.upsert({
          where: { sku },
          update: {},
          create: {
            sku,
            name: `${item} ${SIZES[size % SIZES.length]}`,
            categoryId: categoryIds.get(c.name)!,
            unit: c.unit,
            reorderLevel: [5, 10, 20, 50][n % 4]!,
            isActive: n % 50 !== 0,
          },
        });
      }
    }
  }
  console.log(
    `categories: ${CATEGORIES.length}, warehouses: ${WAREHOUSES.length}, vendors: 20, products: ${n}`,
  );
}

/** Opening balances as ADJUSTMENT movements, so the ledger always explains stock_levels (rule D7). */
async function seedOpeningStock() {
  if ((await prisma.stockMovement.count()) > 0) return;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@nexora.test' } });
  const warehouses = await prisma.warehouse.findMany({ orderBy: { code: 'asc' } });
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sku: 'asc' },
  });
  const movements: { productId: string; warehouseId: string; quantity: number }[] = [];
  products.forEach((p, i) => {
    if (i % 12 === 11) return; // some products have no stock at all
    const low = i % 9 === 0; // and some sit at or below their reorder level
    warehouses.forEach((w, wi) => {
      if (wi > 0 && (i + wi) % 3 === 0) return;
      const qty = low ? 1 : 20 + ((i * 37 + wi * 11) % 180);
      movements.push({ productId: p.id, warehouseId: w.id, quantity: qty });
    });
  });
  await prisma.$transaction([
    prisma.stockMovement.createMany({
      data: movements.map((m) => ({
        ...m,
        type: 'ADJUSTMENT' as const,
        reason: 'Opening balance',
        createdById: admin.id,
      })),
    }),
    prisma.stockLevel.createMany({
      data: movements.map((m) => ({
        productId: m.productId,
        warehouseId: m.warehouseId,
        onHand: m.quantity,
      })),
    }),
  ]);
  console.log(`opening stock rows: ${movements.length}`);
}

/** A handful of POs in each pre-receipt status (expanded to 100 with receipts on Day 14). */
async function seedPurchaseOrders() {
  if ((await prisma.purchaseOrder.count()) > 0) return;
  const users = Object.fromEntries(
    (await prisma.user.findMany({ where: { email: { in: USERS.map((u) => u.email) } } })).map(
      (u) => [u.role, u],
    ),
  );
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  const warehouses = await prisma.warehouse.findMany({ orderBy: { code: 'asc' } });
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sku: 'asc' },
  });
  const plan = [
    'DRAFT',
    'SUBMITTED',
    'SUBMITTED',
    'APPROVED',
    'APPROVED',
    'APPROVED',
    'CANCELLED',
    'REJECTED',
  ] as const;

  for (const [i, kind] of [...plan, ...plan].entries()) {
    const creator = i % 3 === 0 ? users.MANAGER! : users.STAFF!;
    const approver = creator.role === 'MANAGER' ? users.ADMIN! : users.MANAGER!;
    const status = kind === 'REJECTED' ? 'DRAFT' : kind;
    const po = await prisma.purchaseOrder.create({
      data: {
        vendorId: vendors[i % vendors.length]!.id,
        warehouseId: warehouses[i % warehouses.length]!.id,
        status,
        expectedDate: new Date(Date.UTC(2026, 11, 1 + (i % 20))),
        createdById: creator.id,
        ...(status === 'APPROVED' ? { approvedById: approver.id, approvedAt: new Date() } : {}),
        lines: {
          create: [0, 1, 2].slice(0, 1 + (i % 3)).map((k) => ({
            productId: products[(i * 7 + k * 13) % products.length]!.id,
            quantity: 10 + ((i + k) % 5) * 10,
            unitPrice: 25 + ((i * 3 + k) % 40) * 5,
          })),
        },
      },
    });
    const log = (
      action: 'CREATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
      userId: string,
      details?: object,
    ) =>
      prisma.auditLog.create({
        data: { userId, action, entity: 'PurchaseOrder', entityId: po.id, details },
      });
    await log('CREATED', creator.id);
    if (kind !== 'DRAFT' && kind !== 'CANCELLED') await log('SUBMITTED', creator.id);
    if (kind === 'APPROVED') await log('APPROVED', approver.id);
    if (kind === 'REJECTED')
      await log('REJECTED', approver.id, { reason: 'Please get a second quotation.' });
    if (kind === 'CANCELLED') await log('CANCELLED', creator.id);
  }
  console.log(`purchase orders: ${plan.length * 2}`);
}

async function main() {
  await seedUsers();
  await seedMasterData();
  await seedOpeningStock();
  await seedPurchaseOrders();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
