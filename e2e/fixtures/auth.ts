import { test as base } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Auth fixture that loads stored auth state from PLAYWRIGHT_AUTH_STATE env var.
 * The env var should contain the path to a storageState JSON file
 * with auth cookies from a pre-authenticated session.
 *
 * Usage: Import `test` from this module instead of @playwright/test.
 * When PLAYWRIGHT_AUTH_STATE is not set, tests using this fixture will skip.
 */
export const test = base.extend<Record<string, never>>({
  // eslint-disable-next-line no-empty-pattern
  storageState: async ({}, use) => {
    const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE;
    if (!authStatePath) {
      test.skip(true, 'PLAYWRIGHT_AUTH_STATE env var not set — skipping authenticated test');
    }
    await use(authStatePath ?? '');
  },
});

export { expect } from '@playwright/test';
