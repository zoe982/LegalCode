import { test, expect } from './fixtures/auth.js';

test.describe('Admin Page', () => {
  test('admin tabs render', async ({ page }) => {
    // Load SPA from "/" then navigate client-side to /admin
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Verify Users tab is visible
    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible({ timeout: 10000 });
    // Verify Error Log tab is visible
    const errorLogTab = page.getByRole('tab', { name: /error/i });
    await expect(errorLogTab).toBeVisible();
  });
});
