import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/auth.setup.ts'],
  use: {
    baseURL: 'https://legalcode.ax1access.com',
    serviceWorkers: 'allow',
  },
  projects: [
    // Setup: manual Google OAuth login, saves state to e2e/.auth/state.json
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'authenticated',
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/state.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.(spec|test)\.ts$/,
      testIgnore: ['**/auth.spec.ts'],
    },
    {
      name: 'unauthenticated',
      use: {
        browserName: 'chromium',
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/auth.spec.ts'],
    },
  ],
});
