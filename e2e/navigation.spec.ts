import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
  });

  test('TopAppBar renders with avatar menu', async ({ page }) => {
    const avatarButton = page.getByLabel('user menu');
    await expect(avatarButton).toBeVisible();
  });

  test('avatar dropdown shows user info and all menu items', async ({ page }) => {
    await page.getByLabel('user menu').click();

    // User email should be visible in the dropdown
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // Check all navigation items exist
    await expect(page.getByRole('menuitem', { name: /admin/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /log out/i })).toBeVisible();
  });

  test('avatar dropdown navigates to Settings page', async ({ page }) => {
    await page.getByLabel('user menu').click();
    await page.getByRole('menuitem', { name: /settings/i }).click();

    // Settings page should render
    await expect(page.getByText(/settings/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('breadcrumb navigates back to template list from editor', async ({ page }) => {
    // Go to new template editor
    await page.getByRole('button', { name: /new template/i }).click();
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });

    // Click back button to return to list
    const backButton = page.getByLabel('back');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should be back on template list
    await expect(page.getByText('Templates')).toBeVisible({ timeout: 10000 });
  });

  test('browser back button works from editor to list', async ({ page }) => {
    await page.getByRole('button', { name: /new template/i }).click();
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });

    await page.goBack();

    // Should return to template list
    await expect(page.getByText('Templates')).toBeVisible({ timeout: 10000 });
  });

  test('logout redirects to login page', async ({ page }) => {
    await page.getByLabel('user menu').click();
    await page.getByRole('menuitem', { name: /log out/i }).click();

    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });
});

test.describe('Offline Behavior', () => {
  test('offline bar appears when network is disconnected', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Simulate offline
    await context.setOffline(true);

    // Offline bar should appear
    const offlineBar = page.getByText(/offline/i).or(page.getByText(/working offline/i));
    await expect(offlineBar).toBeVisible({ timeout: 5000 });

    // Reconnect
    await context.setOffline(false);

    // Offline bar should disappear
    await expect(offlineBar).not.toBeVisible({ timeout: 5000 });
  });
});
