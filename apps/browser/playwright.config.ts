import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: 'line',
  use: {
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node ../../scripts/serve-fixtures.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
