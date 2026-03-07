/**
 * Re-export @playwright/test for authenticated tests.
 *
 * The `authenticated` project in playwright.config.ts injects storageState
 * automatically via the `setup` dependency. No custom fixture needed.
 */
export { test, expect } from '@playwright/test';
