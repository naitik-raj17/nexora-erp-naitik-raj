/**
 * Demo data. Safe to re-run: existing rows are kept (upsert by unique key).
 * Demo accounts all use the password in DEMO_PASSWORD.
 */
import { PrismaClient, type Role } from '@prisma/client';
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

async function main() {
  await seedUsers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
