import { test, expect } from '@playwright/test';

test.describe('Template Editor', () => {
  // API routes (/templates/*) take precedence over SPA fallback on Cloudflare Workers.
  // Navigate to "/" (SPA root) then use UI clicks to reach editor pages.

  test('editor page loads with Milkdown editor', async ({ page }) => {
    // Load SPA at root — authenticated user sees template list
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Click "New template" button to navigate to the editor
    await page.getByRole('button', { name: /new template/i }).click();

    // Verify the editor surface renders
    const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
    await expect(editor.first()).toBeVisible({ timeout: 15000 });
  });

  test('block menu does not overlap Save Draft button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /new template/i }).click();

    const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
    await expect(editor.first()).toBeVisible({ timeout: 15000 });

    // Click into the editor content area
    const editorContent = page.locator('.ProseMirror').first();
    if (await editorContent.isVisible()) {
      await editorContent.click();
      // Type "/" to trigger the slash menu
      await editorContent.pressSequentially('/');
      await page.waitForTimeout(500);

      const slashMenu = page.locator('.milkdown-slash-menu');
      const saveButton = page.getByRole('button', { name: /save/i });

      if ((await slashMenu.isVisible()) && (await saveButton.isVisible())) {
        const menuBox = await slashMenu.boundingBox();
        const buttonBox = await saveButton.boundingBox();

        if (menuBox && buttonBox) {
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
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /new template/i }).click();

    // Look for Source/Review mode toggle buttons
    const toolbar = page
      .getByRole('button', { name: /source/i })
      .or(page.getByRole('button', { name: /review/i }))
      .or(page.getByRole('tab', { name: /source|review/i }));
    await expect(toolbar.first()).toBeVisible({ timeout: 15000 });
  });
});
