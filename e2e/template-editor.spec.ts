import { test, expect } from './fixtures/auth.js';

test.describe('Template Editor', () => {
  // API routes (/templates/*) take precedence over SPA fallback on Cloudflare Workers.
  // Authenticated tests must load the SPA from "/" then navigate client-side.

  test('editor page loads with Milkdown editor', async ({ page }) => {
    // Load SPA, then navigate client-side to /templates/new
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/templates/new');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Verify the editor surface renders
    const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
    await expect(editor.first()).toBeVisible({ timeout: 15000 });
  });

  test('block menu does not overlap Save Draft button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/templates/new');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Wait for editor to load
    const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
    await expect(editor.first()).toBeVisible({ timeout: 15000 });

    // Click into the editor to potentially trigger the block menu
    const editorContent = page.locator('.milkdown .editor, .ProseMirror').first();
    if (await editorContent.isVisible()) {
      await editorContent.click();
      // Type "/" to trigger the slash menu
      await editorContent.pressSequentially('/');
      // Wait a moment for the menu to appear
      await page.waitForTimeout(500);

      const slashMenu = page.locator('.milkdown-slash-menu');
      const saveButton = page.getByRole('button', { name: /save/i });

      if ((await slashMenu.isVisible()) && (await saveButton.isVisible())) {
        const menuBox = await slashMenu.boundingBox();
        const buttonBox = await saveButton.boundingBox();

        if (menuBox && buttonBox) {
          // The menu should not visually overlap the save button
          const menuBottom = menuBox.y + menuBox.height;
          const menuRight = menuBox.x + menuBox.width;
          const noVerticalOverlap =
            menuBottom <= buttonBox.y || menuBox.y >= buttonBox.y + buttonBox.height;
          const noHorizontalOverlap =
            menuRight <= buttonBox.x || menuBox.x >= buttonBox.x + buttonBox.width;

          expect(noVerticalOverlap || noHorizontalOverlap).toBe(true);
        }
      }
    }
  });

  test('editor toolbar renders mode toggle', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/templates/new');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Look for Source/Review mode toggle or editor toolbar elements
    const toolbar = page
      .getByRole('button', { name: /source/i })
      .or(page.getByRole('button', { name: /review/i }))
      .or(page.getByRole('tab', { name: /source|review/i }));
    await expect(toolbar.first()).toBeVisible({ timeout: 15000 });
  });
});
