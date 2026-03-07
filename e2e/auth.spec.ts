import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('login page has correct branding and structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 15000 });

    // Wordmark renders
    await expect(page.getByText('Acasus', { exact: true })).toBeVisible();
    await expect(page.getByText('LegalCode')).toBeVisible();

    // Sign-in button is interactive
    const signInButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();

    // Footer security text
    await expect(page.getByText('Secured with Google OAuth')).toBeVisible();
    await expect(page.getByText('© 2026 Acasus')).toBeVisible();
  });

  test('login page is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 15000 });

    // Tab to the sign-in button
    await page.keyboard.press('Tab');
    const signInButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(signInButton).toBeFocused();
  });
});
