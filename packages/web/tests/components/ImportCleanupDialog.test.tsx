/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { ImportCleanupDialog } from '../../src/components/ImportCleanupDialog.js';
import type { DetectedConversion } from '../../src/editor/importCleanup.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConversion(
  overrides: Partial<DetectedConversion> & { originalText: string },
): DetectedConversion {
  return {
    pos: 1,
    headingLevel: 1,
    cleanedText: overrides.originalText,
    confidence: 'high',
    pattern: 'numbered-h1',
    selected: true,
    sourceType: 'paragraph',
    ...overrides,
  };
}

const defaultConversions: DetectedConversion[] = [
  makeConversion({
    pos: 1,
    originalText: '1. Introduction',
    cleanedText: 'Introduction',
    headingLevel: 1,
    confidence: 'high',
    selected: true,
  }),
  makeConversion({
    pos: 21,
    originalText: '1.1 Definitions',
    cleanedText: 'Definitions',
    headingLevel: 2,
    confidence: 'high',
    pattern: 'numbered-h2',
    selected: true,
  }),
  makeConversion({
    pos: 41,
    originalText: '(a) The parties',
    cleanedText: 'The parties',
    headingLevel: 3,
    confidence: 'medium',
    pattern: 'letter-paren',
    selected: true,
  }),
  makeConversion({
    pos: 61,
    originalText: 'a. First clause',
    cleanedText: 'First clause',
    headingLevel: 3,
    confidence: 'low',
    pattern: 'letter-dot',
    selected: false,
  }),
];

function renderDialog(props: Partial<Parameters<typeof ImportCleanupDialog>[0]> = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    conversions: defaultConversions,
    onApply: vi.fn(),
  };
  return render(
    <ThemeProvider theme={theme}>
      <ImportCleanupDialog {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportCleanupDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders dialog when open=true
  it('renders dialog when open=true', () => {
    renderDialog({ open: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // 2. Does not render content when open=false
  it('does not render content when open=false', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 3. Shows correct count in subtitle
  it('shows "4 numbered paragraphs detected" subtitle', () => {
    renderDialog({ conversions: defaultConversions });
    expect(screen.getByText('4 numbered paragraphs detected')).toBeInTheDocument();
  });

  it('shows "1 numbered paragraph detected" for single conversion', () => {
    const first = defaultConversions[0];
    if (!first) throw new Error('defaultConversions must not be empty');
    renderDialog({ conversions: [first] });
    expect(screen.getByText('1 numbered paragraph detected')).toBeInTheDocument();
  });

  // 4. Renders each conversion with checkbox and text
  it('renders each conversion with checkbox', () => {
    renderDialog();
    const checkboxes = screen.getAllByRole('checkbox');
    // 4 conversions + possibly select all checkbox = at least 4
    const convCheckboxes = checkboxes.filter(
      (cb) =>
        cb.getAttribute('aria-label') !== 'Select All' &&
        cb.getAttribute('aria-label') !== 'Deselect All',
    );
    expect(convCheckboxes.length).toBeGreaterThanOrEqual(4);
  });

  it('renders truncated original text for each conversion', () => {
    renderDialog();
    expect(screen.getByText(/1\. Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/1\.1 Definitions/)).toBeInTheDocument();
  });

  // 5. High/medium confidence conversions are checked by default
  it('high confidence conversions are checked by default', () => {
    renderDialog();
    // Find the checkbox for the first conversion (high confidence, selected=true)
    const checkboxes = screen.getAllByRole('checkbox');
    // The first conversion checkbox should be checked
    const checkedBoxes = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    expect(checkedBoxes.length).toBeGreaterThan(0);
  });

  // 6. Low confidence conversions are unchecked by default
  it('low confidence conversions are unchecked by default', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: 'a. First clause',
        cleanedText: 'First clause',
        headingLevel: 3,
        confidence: 'low',
        pattern: 'letter-dot',
        selected: false,
      }),
    ];
    renderDialog({ conversions });
    const checkboxes = screen.getAllByRole('checkbox');
    const uncheckedConvBoxes = checkboxes.filter(
      (cb) =>
        !(cb as HTMLInputElement).checked &&
        cb.getAttribute('aria-label') !== 'Select All' &&
        cb.getAttribute('aria-label') !== 'Deselect All',
    );
    expect(uncheckedConvBoxes.length).toBeGreaterThanOrEqual(1);
  });

  // 7. Toggling checkbox updates selection
  it('toggling a checked checkbox unchecks it', async () => {
    const user = userEvent.setup();
    renderDialog();
    // Find all conversion checkboxes (not select-all)
    const allCheckboxes = screen.getAllByRole('checkbox');
    // The first checked conversion checkbox
    const firstChecked = allCheckboxes.find((cb) => (cb as HTMLInputElement).checked);
    expect(firstChecked).toBeDefined();
    if (firstChecked) {
      await user.click(firstChecked);
      expect((firstChecked as HTMLInputElement).checked).toBe(false);
    }
  });

  it('toggling an unchecked checkbox checks it', async () => {
    const user = userEvent.setup();
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: 'a. First clause',
        cleanedText: 'First clause',
        headingLevel: 3,
        confidence: 'low',
        pattern: 'letter-dot',
        selected: false,
      }),
    ];
    renderDialog({ conversions });
    const checkboxes = screen.getAllByRole('checkbox');
    const unchecked = checkboxes.find((cb) => !(cb as HTMLInputElement).checked);
    expect(unchecked).toBeDefined();
    if (unchecked) {
      await user.click(unchecked);
      expect((unchecked as HTMLInputElement).checked).toBe(true);
    }
  });

  // 8. "Select All" selects all conversions
  it('"Select All" selects all conversions', async () => {
    const user = userEvent.setup();
    // Start with some unchecked
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: 'a. First clause',
        cleanedText: 'First clause',
        headingLevel: 3,
        confidence: 'low',
        pattern: 'letter-dot',
        selected: false,
      }),
      makeConversion({
        pos: 21,
        originalText: '1. Introduction',
        cleanedText: 'Introduction',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    const selectAllBtn = screen.getByRole('button', { name: /^select all$/i });
    await user.click(selectAllBtn);
    const checkboxes = screen.getAllByRole('checkbox');
    const allChecked = checkboxes.every((cb) => (cb as HTMLInputElement).checked);
    expect(allChecked).toBe(true);
  });

  // 9. "Deselect All" deselects all conversions
  it('"Deselect All" deselects all conversions', async () => {
    const user = userEvent.setup();
    renderDialog({ conversions: defaultConversions });
    const deselectAllBtn = screen.getByRole('button', { name: /deselect all/i });
    await user.click(deselectAllBtn);
    const checkboxes = screen.getAllByRole('checkbox');
    const allUnchecked = checkboxes.every((cb) => !(cb as HTMLInputElement).checked);
    expect(allUnchecked).toBe(true);
  });

  // 10. Apply button shows count of selected
  it('Apply button shows count of initially selected conversions', () => {
    // defaultConversions has 3 selected (high x2, medium x1) and 1 unselected (low)
    renderDialog({ conversions: defaultConversions });
    expect(screen.getByRole('button', { name: /apply 3 conversion/i })).toBeInTheDocument();
  });

  it('Apply button updates count after toggling', async () => {
    const user = userEvent.setup();
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1. Introduction',
        cleanedText: 'Introduction',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
      makeConversion({
        pos: 21,
        originalText: '1.1 Definitions',
        cleanedText: 'Definitions',
        headingLevel: 2,
        confidence: 'high',
        pattern: 'numbered-h2',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    // Initially "Apply 2 conversion(s)"
    expect(screen.getByRole('button', { name: /apply 2 conversion/i })).toBeInTheDocument();
    // Uncheck one
    const checkboxes = screen.getAllByRole('checkbox');
    const firstChecked = checkboxes.find((cb) => (cb as HTMLInputElement).checked);
    if (firstChecked) {
      await user.click(firstChecked);
    }
    // Now "Apply 1 conversion(s)"
    expect(screen.getByRole('button', { name: /apply 1 conversion/i })).toBeInTheDocument();
  });

  // 11. Apply button disabled when nothing selected
  it('Apply button is disabled when no conversions are selected', async () => {
    const user = userEvent.setup();
    renderDialog({ conversions: defaultConversions });
    // Deselect all
    const deselectAllBtn = screen.getByRole('button', { name: /deselect all/i });
    await user.click(deselectAllBtn);
    const applyBtn = screen.getByRole('button', { name: /apply 0 conversion/i });
    expect(applyBtn).toBeDisabled();
  });

  // 12. Apply calls onApply with selected conversions only
  it('Apply calls onApply with selected conversions only', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    // defaultConversions: 3 selected, 1 not selected
    renderDialog({ conversions: defaultConversions, onApply });
    const applyBtn = screen.getByRole('button', { name: /apply 3 conversion/i });
    await user.click(applyBtn);
    expect(onApply).toHaveBeenCalledTimes(1);
    const calledWith = onApply.mock.calls[0]?.[0] as DetectedConversion[];
    expect(calledWith).toHaveLength(3);
    // Should only include selected conversions
    expect(calledWith.every((c) => c.selected)).toBe(true);
  });

  // 13. Cancel calls onClose
  it('Cancel calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 14. Shows heading level badge (H1, H2, H3, H4)
  it('shows H1 badge for H1 heading level', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1. Introduction',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByText('H1')).toBeInTheDocument();
  });

  it('shows H2 badge for H2 heading level', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1.1 Definitions',
        headingLevel: 2,
        confidence: 'high',
        pattern: 'numbered-h2',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByText('H2')).toBeInTheDocument();
  });

  it('shows H3 badge for H3 heading level', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '(a) The parties',
        headingLevel: 3,
        confidence: 'medium',
        pattern: 'letter-paren',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByText('H3')).toBeInTheDocument();
  });

  it('shows H4 badge for H4 heading level', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1.1.1.1 Sub',
        headingLevel: 4,
        confidence: 'high',
        pattern: 'numbered-h3',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByText('H4')).toBeInTheDocument();
  });

  // 15. Shows confidence chip with correct color (via data attribute or chip color class)
  it('shows confidence chip for each conversion', () => {
    renderDialog({ conversions: defaultConversions });
    // All confidence levels should appear
    expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('medium').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('low').length).toBeGreaterThanOrEqual(1);
  });

  it('dialog title is "Import Cleanup"', () => {
    renderDialog();
    expect(screen.getByText('Import Cleanup')).toBeInTheDocument();
  });

  it('renders dialog structure correctly', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Import Cleanup')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  // 16. Truncation: long text is truncated with ellipsis
  it('truncates originalText longer than 60 characters', () => {
    const longText = 'A'.repeat(80); // 80 chars, well over the 60 limit
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: longText,
        cleanedText: 'cleaned',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    // Should show first 60 chars + ellipsis character
    const truncated = 'A'.repeat(60) + '\u2026';
    expect(screen.getByText(truncated)).toBeInTheDocument();
    // Full text should NOT appear as visible text
    expect(screen.queryByText(longText)).not.toBeInTheDocument();
  });

  // 17. Short text is NOT truncated (text exactly at boundary)
  it('does not truncate originalText of exactly 60 characters', () => {
    const exactText = 'B'.repeat(60);
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: exactText,
        cleanedText: 'cleaned',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByText(exactText)).toBeInTheDocument();
  });

  // 17b. confidenceColor returns 'warning' for medium confidence
  it('renders medium confidence chip with warning color', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '(a) The parties',
        cleanedText: 'The parties',
        headingLevel: 3,
        confidence: 'medium',
        pattern: 'letter-paren',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    const chip = screen.getByText('medium').closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
    // MUI warning color chip has class MuiChip-colorWarning
    expect(chip).toHaveClass('MuiChip-colorWarning');
  });

  // 17c. confidenceColor returns 'success' for high confidence
  it('renders high confidence chip with success color', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1. Introduction',
        cleanedText: 'Introduction',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
    ];
    renderDialog({ conversions });
    const chip = screen.getByText('high').closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
    // MUI success color chip has class MuiChip-colorSuccess
    expect(chip).toHaveClass('MuiChip-colorSuccess');
  });

  // 18. confidenceColor returns 'default' for low confidence (non-high, non-medium)
  it('renders low confidence chip with default color', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: 'a. Clause',
        cleanedText: 'Clause',
        headingLevel: 3,
        confidence: 'low',
        pattern: 'letter-dot',
        selected: false,
      }),
    ];
    renderDialog({ conversions });
    const chip = screen.getByText('low').closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
    // MUI default color chip has class MuiChip-colorDefault
    expect(chip).toHaveClass('MuiChip-colorDefault');
  });

  // 19. Apply singular label for exactly 1 selected conversion
  it('shows singular "conversion" label when exactly 1 is selected', () => {
    const conversions = [
      makeConversion({
        pos: 1,
        originalText: '1. Intro',
        cleanedText: 'Intro',
        headingLevel: 1,
        confidence: 'high',
        selected: true,
      }),
      makeConversion({
        pos: 21,
        originalText: 'a. Clause',
        cleanedText: 'Clause',
        headingLevel: 3,
        confidence: 'low',
        pattern: 'letter-dot',
        selected: false,
      }),
    ];
    renderDialog({ conversions });
    expect(screen.getByRole('button', { name: 'Apply 1 conversion' })).toBeInTheDocument();
  });
});
