import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

/**
 * Creates the test database if it does not exist, then applies pending migrations.
 * Tests truncate their tables, so no destructive reset is needed.
 */
export default async function setup() {
  const url = new URL(
    process.env.TEST_DATABASE_URL ??
      'postgresql://nexora:nexora@localhost:5432/nexora_test?schema=public',
  );
  const dbName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(dbName)) throw new Error(`Unexpected test database name: ${dbName}`);

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new PrismaClient({ datasourceUrl: admin.toString() });
  try {
    const rows = await client.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) await client.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.$disconnect();
  }

  execSync('node_modules/.bin/prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url.toString(), PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: 'ignore',
  });
}
