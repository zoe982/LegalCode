import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('shows desktop-only guard on narrow viewports', async ({ page }) => {
    // Set viewport to mobile size (below 900px breakpoint)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // ResponsiveGuard should block the app and show a message
    await expect(page.getByText(/designed for desktop/i)).toBeVisible({ timeout: 15000 });

    // The workspace should NOT be visible
    await expect(page.locator('[data-testid="workspace"]')).not.toBeVisible();
  });

  test('desktop viewport shows the full app', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // ResponsiveGuard should pass through — workspace visible
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Desktop-only message should NOT be visible
    await expect(page.getByText(/designed for desktop/i)).not.toBeVisible();
  });

  test('editor content area is centered at max 720px width', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /new template/i }).click();
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });

    // The title input container should be centered and not wider than 720px
    const titleInput = page.getByPlaceholder('Untitled');
    const box = await titleInput.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(720);
      // Should be roughly centered (at least 100px from left edge on a 1400px viewport)
      expect(box.x).toBeGreaterThan(100);
    }
  });
});
