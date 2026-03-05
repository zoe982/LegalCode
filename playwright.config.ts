import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:5173',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
