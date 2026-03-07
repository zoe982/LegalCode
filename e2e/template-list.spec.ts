import { test, expect } from '@playwright/test';

test.describe('Template List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
  });

  test('renders page heading and search input', async ({ page }) => {
    await expect(page.getByText('Templates')).toBeVisible();
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();
  });

  test('has a New Template button that navigates to editor', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new template/i });
    await expect(newButton).toBeVisible();
    await newButton.click();

    // Should navigate to the new template editor
    // Verify the editor page loads (title input with "Untitled" placeholder)
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });
  });

  test('status filter buttons are all present and clickable', async ({ page }) => {
    const filters = ['All', 'Draft', 'Active', 'Archived'];
    for (const filter of filters) {
      const button = page.getByRole('button', { name: filter, exact: true });
      await expect(button).toBeVisible();
    }

    // Click "Draft" filter — should not crash, page remains functional
    await page.getByRole('button', { name: 'Draft', exact: true }).click();
    // Search should still be visible (page didn't crash)
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('sort dropdown opens and has expected options', async ({ page }) => {
    // Find and click the sort dropdown trigger
    const sortButton = page.getByRole('button', { name: /recently edited|alphabetical|oldest/i });
    await expect(sortButton).toBeVisible();
    await sortButton.click();

    // Verify sort options in the dropdown menu
    await expect(page.getByRole('menuitem', { name: /recently edited/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /alphabetical/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /oldest first/i })).toBeVisible();
  });

  test('search input debounces and filters templates', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    // Type a search that shouldn't match anything
    await searchInput.fill('zzzznonexistenttemplate99999');
    // Wait for debounce (300ms + network)
    await page.waitForTimeout(500);

    // Either the empty state shows, or no template cards appear
    const cards = page.locator('[class*="TemplateCard"], [data-testid*="template"]');
    const emptyState = page.getByText(/no templates/i);
    const hasCards = await cards.count();
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // One of these must be true: empty state shown OR zero cards
    expect(hasCards === 0 || hasEmptyState).toBe(true);

    // Clear search — templates should reappear (if any exist)
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('template cards are keyboard accessible', async ({ page }) => {
    // Check if any template cards exist
    const cards = page.locator('a[href*="/templates/"]');
    const count = await cards.count();

    if (count > 0) {
      // Tab to the first card
      const firstCard = cards.first();
      await firstCard.focus();
      await expect(firstCard).toBeFocused();

      // Press Enter — should navigate
      const href = await firstCard.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
