import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: 'line',
  webServer: [
    {
      command: 'node apps/api/dist/index.js',
      url: 'http://localhost:8787/health',
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: 'node scripts/serve-fixtures.mjs',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 10_000,
    },
  ],
});
