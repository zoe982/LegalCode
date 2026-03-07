import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  // The SPA is served at "/" by Cloudflare Workers Static Assets.
  // API routes (/templates, /admin, /auth) take precedence over SPA fallback,
  // so direct navigation to /templates hits the API (401 JSON), not the SPA.
  // All e2e tests must load the SPA from "/" and let React Router handle routing.

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    // Load the SPA from root — React Router redirects "/" -> "/templates",
    // then AuthGuard redirects to "/login" when not authenticated
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('login page renders with Google sign-in button', async ({ page }) => {
    await page.goto('/');
    // Wait for redirect to /login
    await page.waitForURL('**/login', { timeout: 15000 });
    // Verify the page has a Google sign-in element
    const googleButton = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }))
      .or(
        page.locator('[data-testid*="google"], [class*="google"], a[href*="accounts.google.com"]'),
      );
    await expect(googleButton.first()).toBeVisible({ timeout: 10000 });
  });
});
