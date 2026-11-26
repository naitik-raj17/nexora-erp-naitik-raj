import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Integration tests run against a separate database so they never touch dev data.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://nexora:nexora@localhost:5432/nexora_test?schema=public';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: 'test-only-session-secret-at-least-32-chars',
    },
    globalSetup: ['tests/helpers/global-setup.ts'],
    // Integration files share one database, so run files one at a time.
    fileParallelism: false,
    coverage: { provider: 'v8', include: ['src/server/**', 'src/lib/**'] },
  },
});
