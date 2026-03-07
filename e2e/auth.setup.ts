import { test as setup, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const AUTH_STATE_PATH = 'e2e/.auth/state.json';

setup('authenticate via Google OAuth', async ({ page }) => {
  // Skip if valid auth state already exists
  if (existsSync(AUTH_STATE_PATH)) {
    // Quick validation: try loading the app with saved state
    const context = page.context();
    await context.clearCookies();
    const raw = readFileSync(AUTH_STATE_PATH, 'utf-8');
    const savedState = JSON.parse(raw) as {
      cookies: { name: string; value: string; domain: string; path: string }[];
    };
    await context.addCookies(savedState.cookies);
    await page.goto('/');

    // If we land on the app (not /login), credentials are still valid
    try {
      await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 10000 });
      return; // Credentials valid, skip re-auth
    } catch {
      // Credentials expired, fall through to re-authenticate
    }
  }

  // Navigate to the app — unauthenticated users land on /login
  await page.goto('/');
  await page.waitForURL('**/login', { timeout: 15000 });

  // Click "Sign in with Google" — starts OAuth redirect
  await page.getByRole('button', { name: /sign in with google/i }).click();

  // Wait for OAuth flow to complete (user must manually sign in with Google)
  await page.waitForURL(
    (url) => {
      const isApp = url.hostname === 'legalcode.ax1access.com';
      const isPastLogin = !url.pathname.includes('/login') && !url.pathname.includes('/auth/');
      return isApp && isPastLogin;
    },
    { timeout: 300000 },
  );

  await page.waitForTimeout(3000);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
