import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('login page renders with Google sign-in button', async ({ page }) => {
    await page.goto('/login');
    // Verify the page loads and has a Google sign-in element
    const googleButton = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }))
      .or(
        page.locator('[data-testid*="google"], [class*="google"], a[href*="accounts.google.com"]'),
      );
    await expect(googleButton.first()).toBeVisible({ timeout: 10000 });
  });
});
