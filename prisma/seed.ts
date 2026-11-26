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

async function main() {
  await seedUsers();
  await seedMasterData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
