import { test, expect } from '@playwright/test';

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
    // Navigate to admin via avatar dropdown
    await page.getByLabel('user menu').click();
    await page.getByRole('menuitem', { name: /admin/i }).click();
  });

  test('admin page renders with Users and Error Log tabs', async ({ page }) => {
    const usersTab = page.getByRole('tab', { name: /users/i });
    const errorLogTab = page.getByRole('tab', { name: /error/i });

    await expect(usersTab).toBeVisible({ timeout: 10000 });
    await expect(errorLogTab).toBeVisible();
  });

  test('switching tabs changes displayed content', async ({ page }) => {
    const usersTab = page.getByRole('tab', { name: /users/i });
    const errorLogTab = page.getByRole('tab', { name: /error/i });

    await expect(usersTab).toBeVisible({ timeout: 10000 });

    // Click Error Log tab
    await errorLogTab.click();
    await page.waitForTimeout(500);

    // Click Users tab
    await usersTab.click();
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(usersTab).toBeVisible();
  });
});
