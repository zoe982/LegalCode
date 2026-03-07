import { test, expect } from '@playwright/test';

test.describe('Admin Page', () => {
  test('admin tabs render', async ({ page }) => {
    // Load SPA from "/" — authenticated user sees template list
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Navigate to admin via avatar dropdown menu
    await page.getByLabel('user menu').click();
    await page.getByRole('menuitem', { name: /admin/i }).click();

    // Verify Users tab is visible
    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible({ timeout: 10000 });
    // Verify Error Log tab is visible
    const errorLogTab = page.getByRole('tab', { name: /error/i });
    await expect(errorLogTab).toBeVisible();
  });
});
