import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    browserName: 'chromium',
    baseURL: 'https://legalcode.ax1access.com',
    serviceWorkers: 'allow',
  },
});
