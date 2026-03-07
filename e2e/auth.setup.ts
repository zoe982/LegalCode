import { test as setup, expect } from '@playwright/test';

const AUTH_STATE_PATH = 'e2e/.auth/state.json';

setup('authenticate via Google OAuth', async ({ page }) => {
  // Navigate to the app — unauthenticated users land on /login
  await page.goto('/');
  await page.waitForURL('**/login', { timeout: 15000 });

  // Click "Sign in with Google" — starts OAuth redirect to accounts.google.com
  await page.getByRole('button', { name: /sign in with google/i }).click();

  // Wait for the OAuth flow to complete and redirect back to the app.
  // The user must manually complete Google sign-in in the headed browser.
  // After OAuth callback, React Router redirects to /templates (template list).
  await page.waitForURL(
    (url) => {
      const isApp = url.hostname === 'legalcode.ax1access.com';
      const isPastLogin = !url.pathname.includes('/login') && !url.pathname.includes('/auth/');
      return isApp && isPastLogin;
    },
    { timeout: 300000 }, // 5 minutes for manual Google sign-in
  );

  // Verify we're actually authenticated by checking for app UI
  await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

  // Save auth state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
