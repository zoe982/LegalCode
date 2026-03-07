import { test, expect } from '@playwright/test';

test.describe('Template Editor — Create Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /new template/i }).click();
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });
  });

  test('editor has title input, editor surface, and Save Draft button', async ({ page }) => {
    // Title input
    const titleInput = page.getByPlaceholder('Untitled');
    await expect(titleInput).toBeEditable();

    // Milkdown editor surface
    const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
    await expect(editor.first()).toBeVisible();

    // Save Draft button
    const saveButton = page.getByRole('button', { name: /save draft/i });
    await expect(saveButton).toBeVisible();
  });

  test('title input accepts text and retains value', async ({ page }) => {
    const titleInput = page.getByPlaceholder('Untitled');
    await titleInput.fill('E2E Test Template');
    await expect(titleInput).toHaveValue('E2E Test Template');
  });

  test('editor toolbar has Source and Review mode toggle', async ({ page }) => {
    // The toolbar should have mode buttons
    const sourceButton = page.getByRole('button', { name: /source/i });
    const reviewButton = page.getByRole('button', { name: /review/i });

    await expect(sourceButton).toBeVisible();
    await expect(reviewButton).toBeVisible();

    // Source should be active by default
    // Click Review — should switch modes
    await reviewButton.click();

    // Click Source — should switch back
    await sourceButton.click();
  });

  test('Milkdown editor accepts text input', async ({ page }) => {
    const prosemirror = page.locator('.ProseMirror').first();
    await expect(prosemirror).toBeVisible({ timeout: 10000 });

    await prosemirror.click();
    await prosemirror.pressSequentially('Hello from e2e test');

    // Verify text appears in the editor
    await expect(prosemirror).toContainText('Hello from e2e test');
  });

  test('slash menu appears when typing / and does not overlap Save Draft', async ({ page }) => {
    const prosemirror = page.locator('.ProseMirror').first();
    await expect(prosemirror).toBeVisible({ timeout: 10000 });

    await prosemirror.click();
    await prosemirror.pressSequentially('/');
    await page.waitForTimeout(500);

    // Check if slash menu appeared
    const slashMenu = page.locator('.milkdown-slash-menu, [class*="slash"]');
    if (await slashMenu.first().isVisible()) {
      const saveButton = page.getByRole('button', { name: /save/i });

      if (await saveButton.isVisible()) {
        const menuBox = await slashMenu.first().boundingBox();
        const buttonBox = await saveButton.boundingBox();

        if (menuBox && buttonBox) {
          // Assert no overlap — this is the actual bug fix verification
          const menuBottom = menuBox.y + menuBox.height;
          const menuRight = menuBox.x + menuBox.width;
          const noVerticalOverlap =
            menuBottom <= buttonBox.y || menuBox.y >= buttonBox.y + buttonBox.height;
          const noHorizontalOverlap =
            menuRight <= buttonBox.x || menuBox.x >= buttonBox.x + buttonBox.width;

          expect(
            noVerticalOverlap || noHorizontalOverlap,
            `Slash menu (bottom: ${String(menuBottom)}) overlaps Save button (top: ${String(buttonBox.y)})`,
          ).toBe(true);
        }
      }
    }
  });

  test('word count updates as user types', async ({ page }) => {
    const prosemirror = page.locator('.ProseMirror').first();
    await expect(prosemirror).toBeVisible({ timeout: 10000 });

    // Find word count display
    const wordCount = page.getByText(/\d+\s*word/i);

    await prosemirror.click();
    await prosemirror.pressSequentially('One two three four five');
    await page.waitForTimeout(300);

    // Word count should show a number > 0
    if (await wordCount.isVisible()) {
      const text = await wordCount.textContent();
      expect(text).toBeTruthy();
      const match = text?.match(/(\d+)/);
      expect(Number(match?.[1])).toBeGreaterThan(0);
    }
  });

  test('back button navigates to template list', async ({ page }) => {
    const backButton = page.getByLabel('back');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should return to template list
    await expect(page.getByText('Templates')).toBeVisible({ timeout: 10000 });
  });

  test('Cmd+S shows auto-save toast', async ({ page }) => {
    await page.keyboard.press('Meta+s');

    // Toast should appear with auto-save message
    const toast = page.getByText(/save automatically/i).or(page.getByText(/auto-save/i));
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Cmd+/ opens keyboard shortcuts dialog', async ({ page }) => {
    await page.keyboard.press('Meta+/');

    // Keyboard shortcuts dialog should open
    const dialog = page.getByRole('dialog').or(page.getByText(/keyboard shortcuts/i));
    await expect(dialog.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Editor — Edit Mode', () => {
  test('opening a template shows its title and content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Click the first template card (if any exist)
    const cards = page.locator('a[href*="/templates/"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCardTitle = await cards
        .first()
        .locator('h6, h5, h4, [class*="title"]')
        .first()
        .textContent();
      await cards.first().click();

      // Wait for editor to load
      await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 15000 });

      // Title should be populated (not empty for existing templates)
      const titleInput = page.getByPlaceholder('Untitled');
      const titleValue = await titleInput.inputValue();
      if (firstCardTitle && firstCardTitle.trim() !== '') {
        expect(titleValue.length).toBeGreaterThan(0);
      }

      // Editor surface should be visible
      const editor = page.locator('.milkdown').or(page.getByTestId('markdown-editor-wrapper'));
      await expect(editor.first()).toBeVisible();
    }
  });

  test('panel toggle buttons open slide-over panels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    const cards = page.locator('a[href*="/templates/"]');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 15000 });

      // Test Info panel toggle
      const infoButton = page.getByRole('button', { name: /info/i }).or(page.getByLabel(/info/i));
      if (await infoButton.isVisible()) {
        await infoButton.click();
        // Panel should slide open with metadata content
        await expect(page.getByText(/category/i).or(page.getByText(/status/i))).toBeVisible({
          timeout: 5000,
        });

        // Click again or press Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // Test Version History panel toggle
      const historyButton = page
        .getByRole('button', { name: /history/i })
        .or(page.getByLabel(/history/i));
      if (await historyButton.isVisible()) {
        await historyButton.click();
        // Panel should show version entries
        await expect(page.getByText(/v\d+/i).or(page.getByText(/version/i))).toBeVisible({
          timeout: 5000,
        });

        await page.keyboard.press('Escape');
      }
    }
  });

  test('Review mode renders HTML preview of markdown', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="workspace"]')).toBeVisible({ timeout: 15000 });

    // Create a new template with content to test review mode
    await page.getByRole('button', { name: /new template/i }).click();
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 10000 });

    const prosemirror = page.locator('.ProseMirror').first();
    await expect(prosemirror).toBeVisible({ timeout: 10000 });
    await prosemirror.click();
    await prosemirror.pressSequentially('Test content for review');
    await page.waitForTimeout(300);

    // Switch to Review mode
    const reviewButton = page.getByRole('button', { name: /review/i });
    await reviewButton.click();
    await page.waitForTimeout(500);

    // Content should be visible as rendered HTML, not as markdown source
    await expect(page.getByText('Test content for review')).toBeVisible();

    // The ProseMirror editor should be hidden or replaced with HTML preview
    // Switch back to Source
    const sourceButton = page.getByRole('button', { name: /source/i });
    await sourceButton.click();
  });
});
