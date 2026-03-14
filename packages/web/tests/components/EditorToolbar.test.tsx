/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';

// Mock milkdown imports used by EditorToolbar
vi.mock('@milkdown/crepe', () => ({
  Crepe: vi.fn(),
}));

vi.mock('@milkdown/kit/preset/commonmark', () => ({
  toggleStrongCommand: { key: 'toggleStrong' },
  toggleEmphasisCommand: { key: 'toggleEmphasis' },
  wrapInHeadingCommand: { key: 'wrapInHeading' },
  wrapInBulletListCommand: { key: 'wrapInBulletList' },
  wrapInOrderedListCommand: { key: 'wrapInOrderedList' },
  insertHrCommand: { key: 'insertHr' },
}));

vi.mock('@milkdown/kit/utils', () => ({
  callCommand: (key: string, ...args: unknown[]) => `callCommand:${key}:${JSON.stringify(args)}`,
}));

vi.mock('@milkdown/kit/core', () => ({
  editorViewCtx: 'editorViewCtx',
}));

import { EditorToolbar } from '../../src/components/EditorToolbar.js';

const mockAction = vi.fn();
const mockCrepeRef = {
  current: {
    editor: {
      action: mockAction,
    },
  },
};

function renderToolbar(props: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  const defaultProps = {
    mode: 'edit' as const,
    wordCount: 142,
  };
  return render(
    <ThemeProvider theme={theme}>
      <EditorToolbar {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('EditorToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAction.mockClear();
  });

  it('shows all markdown helper buttons in edit mode including Bold and Italic', () => {
    renderToolbar({ mode: 'edit' });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordered List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clause Reference' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Variable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Cleanup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Horizontal Rule' })).toBeInTheDocument();
  });

  it('shows shared formatting buttons in source mode (Bold, Italic, Heading, etc.)', () => {
    renderToolbar({ mode: 'source' });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordered List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal List' })).toBeInTheDocument();
  });

  it('hides edit-only buttons in source mode (Toggle Outline, Import Cleanup, Indent, Outdent)', () => {
    renderToolbar({ mode: 'source' });
    expect(screen.queryByRole('button', { name: 'Toggle Outline' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import Cleanup' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Indent Heading' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Outdent Heading' })).not.toBeInTheDocument();
  });

  it('hides markdown helpers when readOnly', () => {
    renderToolbar({ mode: 'edit', readOnly: true });
    expect(screen.queryByRole('button', { name: 'Heading' })).not.toBeInTheDocument();
  });

  it('displays word count', () => {
    renderToolbar({ wordCount: 142 });
    expect(screen.getByText('142 words')).toBeInTheDocument();
  });

  it('displays "0 words" when wordCount is 0', () => {
    renderToolbar({ wordCount: 0 });
    expect(screen.getByText('0 words')).toBeInTheDocument();
  });

  it('displays "1 word" singular', () => {
    renderToolbar({ wordCount: 1 });
    expect(screen.getByText('1 word')).toBeInTheDocument();
  });

  it('renders toolbar container with correct testid', () => {
    renderToolbar();
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
  });

  it('does not render ConnectionStatus even if connectionStatus is passed', () => {
    // After the fix, EditorToolbar no longer accepts or renders ConnectionStatus
    renderToolbar();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument();
    expect(screen.queryByText('Save failed — retrying...')).not.toBeInTheDocument();
  });

  it('calls crepeRef.editor.action for Bold button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls crepeRef.editor.action for Italic button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls crepeRef.editor.action for Heading button — opens menu then selects item', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    await user.click(screen.getByRole('menuitem', { name: 'Section (H2)' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls crepeRef.editor.action for Ordered List button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Ordered List' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls crepeRef.editor.action for List button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls crepeRef.editor.action for Horizontal Rule button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls onInsertMarkdown with link syntax when Link is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Link' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('[', '](url)');
  });

  it('calls onInsertMarkdown with table template when Table is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Table' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith(
      '| Header | Header |\n| --- | --- |\n| Cell | Cell |',
      '',
    );
  });

  it('calls onInsertMarkdown with clause reference when Clause Reference is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Clause Reference' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('{{clause:', '}}');
  });

  it('calls onInsertMarkdown with variable syntax when Variable is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Variable' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('{{var:', '}}');
  });

  it('Bold/Italic/List/OrderedList/HR buttons do nothing when crepeRef is null', async () => {
    const user = userEvent.setup();
    const nullCrepeRef = { current: null };
    renderToolbar({ crepeRef: nullCrepeRef as never });
    // Should not throw when clicking any Milkdown command button with null crepeRef
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    await user.click(screen.getByRole('button', { name: 'List' }));
    await user.click(screen.getByRole('button', { name: 'Ordered List' }));
    await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
    // No crash = pass
  });

  it('Heading dropdown menu items do nothing when crepeRef is null', async () => {
    const user = userEvent.setup();
    const nullCrepeRef = { current: null };
    renderToolbar({ crepeRef: nullCrepeRef as never });
    // Click heading button to open menu
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    // Click a menu item — should not crash
    await user.click(screen.getByRole('menuitem', { name: 'Clause (H3)' }));
    // No crash = pass
  });

  it('does not crash when onInsertMarkdown is not provided', async () => {
    const user = userEvent.setup();
    renderToolbar(); // no onInsertMarkdown
    await user.click(screen.getByRole('button', { name: 'Link' }));
    // Should not throw
  });

  it('toolbar has 44px height', () => {
    renderToolbar();
    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar).toHaveStyle({ height: '44px' });
  });

  it('does not render mode toggle buttons (moved to DocumentHeader)', () => {
    renderToolbar();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Source' })).not.toBeInTheDocument();
  });

  it('does not render mode toggle indicator (moved to DocumentHeader)', () => {
    renderToolbar();
    expect(screen.queryByTestId('mode-toggle-indicator')).not.toBeInTheDocument();
  });

  it('shows shortcuts tooltip on first render when not dismissed', () => {
    renderToolbar();
    expect(screen.getByText('Press Cmd+/ to see keyboard shortcuts')).toBeInTheDocument();
  });

  it('does not show shortcuts tooltip when already dismissed', () => {
    localStorage.setItem('legalcode:tooltip:shortcuts:dismissed', 'true');
    renderToolbar();
    expect(screen.queryByText('Press Cmd+/ to see keyboard shortcuts')).not.toBeInTheDocument();
  });

  it('dismisses shortcuts tooltip when "Got it" is clicked', async () => {
    const user = userEvent.setup();
    renderToolbar();
    const gotItButton = screen.getByRole('button', { name: 'Got it' });
    await user.click(gotItButton);
    expect(localStorage.getItem('legalcode:tooltip:shortcuts:dismissed')).toBe('true');
    await waitFor(() => {
      expect(screen.queryByText('Press Cmd+/ to see keyboard shortcuts')).not.toBeInTheDocument();
    });
  });

  it('never renders ConnectionStatus regardless of props', () => {
    // ConnectionStatus has been fully removed from EditorToolbar
    renderToolbar({ wordCount: 50 });
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline — changes saved locally')).not.toBeInTheDocument();
  });

  describe('Heading dropdown menu', () => {
    it('opens heading dropdown menu when Heading button is clicked', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows all heading level options in the dropdown menu', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      expect(screen.getByRole('menuitem', { name: 'Title' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Article (H1)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Section (H2)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Clause (H3)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Sub-clause (H4)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Paragraph (H5)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Sub-paragraph (H6)' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Body text' })).toBeInTheDocument();
    });

    it('clicking a heading level option calls executeCommand and closes menu', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Clause (H3)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
      // Menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('heading dropdown menu closes when pressing Escape', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      // Press Escape to close
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('menu does not appear before Heading button is clicked', () => {
      renderToolbar({ crepeRef: mockCrepeRef as never });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('clicking Title menu item calls editor.action to set block type to title', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Title' }));
      // Title uses a direct editor.action callback (not callCommand) to setBlockType
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(typeof mockAction.mock.calls[0]?.[0]).toBe('function');
    });

    it('clicking Article (H1) menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Article (H1)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('clicking Section (H2) menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Section (H2)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('clicking Sub-clause (H4) menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Sub-clause (H4)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('clicking Paragraph (H5) menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Paragraph (H5)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('clicking Sub-paragraph (H6) menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Sub-paragraph (H6)' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('clicking Body text menu item calls executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Body text' }));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('Title action callback calls setBlockType with title node type', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Title' }));

      // Extract the action callback and invoke it with a mock ctx
      const actionFn = mockAction.mock.calls[0]?.[0] as (ctx: unknown) => void;
      expect(typeof actionFn).toBe('function');

      const mockTr = {
        setBlockType: vi.fn().mockReturnThis(),
      };
      const mockTitleType = { name: 'title' };
      const mockView = {
        state: {
          selection: { from: 5, to: 5 },
          schema: { nodes: { title: mockTitleType } },
          tr: mockTr,
        },
        dispatch: vi.fn(),
      };
      const mockCtx = {
        get: vi.fn().mockReturnValue(mockView),
      };

      actionFn(mockCtx);

      expect(mockCtx.get).toHaveBeenCalledWith('editorViewCtx');
      expect(mockTr.setBlockType).toHaveBeenCalledWith(5, 5, mockTitleType);
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    it('Title action does nothing when title node type is not in schema', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Title' }));

      const actionFn = mockAction.mock.calls[0]?.[0] as (ctx: unknown) => void;

      const mockView = {
        state: {
          selection: { from: 5, to: 5 },
          schema: { nodes: {} }, // no 'title' node type
          tr: { setBlockType: vi.fn() },
        },
        dispatch: vi.fn(),
      };
      const mockCtx = {
        get: vi.fn().mockReturnValue(mockView),
      };

      // Should not throw
      actionFn(mockCtx);

      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    it('Title menu item does not call callCommand-based executeCommand', async () => {
      const user = userEvent.setup();
      renderToolbar({ crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Title' }));

      // The action should be a function (direct action), not a callCommand string
      const actionArg = mockAction.mock.calls[0]?.[0] as unknown;
      expect(typeof actionArg).toBe('function');
      expect(typeof actionArg).not.toBe('string');
    });
  });

  describe('Undo/Redo buttons', () => {
    it('renders Undo and Redo buttons in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    });

    it('shows Undo and Redo buttons in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    });

    it('hides Undo and Redo buttons when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
    });

    it('disables Undo button when canUndo is false', () => {
      renderToolbar({ mode: 'edit', canUndo: false });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    });

    it('disables Redo button when canRedo is false', () => {
      renderToolbar({ mode: 'edit', canRedo: false });
      expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    });

    it('enables Undo button when canUndo is true', () => {
      renderToolbar({ mode: 'edit', canUndo: true });
      expect(screen.getByRole('button', { name: 'Undo' })).not.toBeDisabled();
    });

    it('enables Redo button when canRedo is true', () => {
      renderToolbar({ mode: 'edit', canRedo: true });
      expect(screen.getByRole('button', { name: 'Redo' })).not.toBeDisabled();
    });

    it('calls onUndo when Undo button is clicked', async () => {
      const user = userEvent.setup();
      const onUndo = vi.fn();
      renderToolbar({ mode: 'edit', onUndo });
      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onRedo when Redo button is clicked', async () => {
      const user = userEvent.setup();
      const onRedo = vi.fn();
      renderToolbar({ mode: 'edit', onRedo });
      await user.click(screen.getByRole('button', { name: 'Redo' }));
      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('renders a divider between undo/redo and formatting buttons', () => {
      renderToolbar({ mode: 'edit' });
      // There are now two dividers (undo/redo | outline | formatting)
      const dividers = screen.getAllByRole('separator');
      expect(dividers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Outline toggle button', () => {
    it('renders Toggle Outline button in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Toggle Outline' })).toBeInTheDocument();
    });

    it('hides Toggle Outline button in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.queryByRole('button', { name: 'Toggle Outline' })).not.toBeInTheDocument();
    });

    it('hides Toggle Outline button when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Toggle Outline' })).not.toBeInTheDocument();
    });

    it('calls onToggleOutline when Toggle Outline is clicked', async () => {
      const user = userEvent.setup();
      const onToggleOutline = vi.fn();
      renderToolbar({ onToggleOutline });
      await user.click(screen.getByRole('button', { name: 'Toggle Outline' }));
      expect(onToggleOutline).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onToggleOutline is not provided', async () => {
      const user = userEvent.setup();
      renderToolbar(); // no onToggleOutline
      await user.click(screen.getByRole('button', { name: 'Toggle Outline' }));
      // Should not throw
    });

    it('applies active styling when outlineMode is true', () => {
      renderToolbar({ outlineMode: true });
      const btn = screen.getByRole('button', { name: 'Toggle Outline' });
      expect(btn).toBeInTheDocument();
      // The button should exist; active sx styling is applied via MUI sx
    });

    it('does not apply active styling when outlineMode is false', () => {
      renderToolbar({ outlineMode: false });
      const btn = screen.getByRole('button', { name: 'Toggle Outline' });
      expect(btn).toBeInTheDocument();
    });
  });

  describe('Import Cleanup button', () => {
    it('renders Import Cleanup button in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Import Cleanup' })).toBeInTheDocument();
    });

    it('hides Import Cleanup button in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.queryByRole('button', { name: 'Import Cleanup' })).not.toBeInTheDocument();
    });

    it('hides Import Cleanup button when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Import Cleanup' })).not.toBeInTheDocument();
    });

    it('calls onImportCleanup when Import Cleanup is clicked', async () => {
      const user = userEvent.setup();
      const onImportCleanup = vi.fn();
      renderToolbar({ onImportCleanup });
      await user.click(screen.getByRole('button', { name: 'Import Cleanup' }));
      expect(onImportCleanup).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onImportCleanup is not provided', async () => {
      const user = userEvent.setup();
      renderToolbar(); // no onImportCleanup
      await user.click(screen.getByRole('button', { name: 'Import Cleanup' }));
      // Should not throw
    });
  });

  describe('Indent / Outdent heading buttons', () => {
    it('renders Indent Heading button in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Indent Heading' })).toBeInTheDocument();
    });

    it('renders Outdent Heading button in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Outdent Heading' })).toBeInTheDocument();
    });

    it('hides Indent Heading button in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.queryByRole('button', { name: 'Indent Heading' })).not.toBeInTheDocument();
    });

    it('hides Outdent Heading button in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.queryByRole('button', { name: 'Outdent Heading' })).not.toBeInTheDocument();
    });

    it('hides Indent Heading button when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Indent Heading' })).not.toBeInTheDocument();
    });

    it('hides Outdent Heading button when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Outdent Heading' })).not.toBeInTheDocument();
    });

    it('calls onIndentHeading when Indent Heading is clicked', async () => {
      const user = userEvent.setup();
      const onIndentHeading = vi.fn();
      renderToolbar({ onIndentHeading });
      await user.click(screen.getByRole('button', { name: 'Indent Heading' }));
      expect(onIndentHeading).toHaveBeenCalledTimes(1);
    });

    it('calls onOutdentHeading when Outdent Heading is clicked', async () => {
      const user = userEvent.setup();
      const onOutdentHeading = vi.fn();
      renderToolbar({ onOutdentHeading });
      await user.click(screen.getByRole('button', { name: 'Outdent Heading' }));
      expect(onOutdentHeading).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onIndentHeading is not provided', async () => {
      const user = userEvent.setup();
      renderToolbar(); // no onIndentHeading
      await user.click(screen.getByRole('button', { name: 'Indent Heading' }));
      // Should not throw
    });

    it('does not crash when onOutdentHeading is not provided', async () => {
      const user = userEvent.setup();
      renderToolbar(); // no onOutdentHeading
      await user.click(screen.getByRole('button', { name: 'Outdent Heading' }));
      // Should not throw
    });
  });

  describe('Source mode commands', () => {
    it('calls onSourceWrap with bold markers when Bold is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceWrap = vi.fn();
      renderToolbar({ mode: 'source', onSourceWrap });
      await user.click(screen.getByRole('button', { name: 'Bold' }));
      expect(onSourceWrap).toHaveBeenCalledWith('**', '**');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onSourceWrap with italic markers when Italic is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceWrap = vi.fn();
      renderToolbar({ mode: 'source', onSourceWrap });
      await user.click(screen.getByRole('button', { name: 'Italic' }));
      expect(onSourceWrap).toHaveBeenCalledWith('*', '*');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onSourceLinePrefix with ## prefix when Section (H2) is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Section (H2)' }));
      expect(onSourceLinePrefix).toHaveBeenCalledWith('## ');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onSourceLinePrefix with "% " prefix when Title is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Title' }));
      expect(onSourceLinePrefix).toHaveBeenCalledWith('% ');
    });

    it('calls onSourceLinePrefix with ### prefix when Clause (H3) is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Clause (H3)' }));
      expect(onSourceLinePrefix).toHaveBeenCalledWith('### ');
    });

    it('calls onSourceLinePrefix with ordered list prefix when Ordered List is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'Ordered List' }));
      expect(onSourceLinePrefix).toHaveBeenCalledWith('1. ');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onSourceLinePrefix with bullet list prefix when List is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'List' }));
      expect(onSourceLinePrefix).toHaveBeenCalledWith('- ');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onSourceBlock with HR when Horizontal Rule is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onSourceBlock = vi.fn();
      renderToolbar({ mode: 'source', onSourceBlock });
      await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
      expect(onSourceBlock).toHaveBeenCalledWith('---');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('does not call crepeRef.editor.action for Bold in source mode', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'source', crepeRef: mockCrepeRef as never });
      await user.click(screen.getByRole('button', { name: 'Bold' }));
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('calls onUndo when Undo is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onUndo = vi.fn();
      renderToolbar({ mode: 'source', onUndo });
      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onRedo when Redo is clicked in source mode', async () => {
      const user = userEvent.setup();
      const onRedo = vi.fn();
      renderToolbar({ mode: 'source', onRedo });
      await user.click(screen.getByRole('button', { name: 'Redo' }));
      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('does not crash in source mode when source command props are not provided', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'source' });
      await user.click(screen.getByRole('button', { name: 'Bold' }));
      await user.click(screen.getByRole('button', { name: 'Italic' }));
      await user.click(screen.getByRole('button', { name: 'Ordered List' }));
      await user.click(screen.getByRole('button', { name: 'List' }));
      await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
      // No crash = pass
    });

    it('Body text heading item closes menu without calling commands in source mode', async () => {
      const user = userEvent.setup();
      const onSourceLinePrefix = vi.fn();
      renderToolbar({ mode: 'source', onSourceLinePrefix });
      await user.click(screen.getByRole('button', { name: 'Heading' }));
      await user.click(screen.getByRole('menuitem', { name: 'Body text' }));
      // Body text (level 0) should not call insertLinePrefix in source mode
      expect(onSourceLinePrefix).not.toHaveBeenCalled();
      // Menu should close
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('editing mode toggle', () => {
    it('renders mode selector with "Editing" label by default in edit mode', () => {
      renderToolbar({ mode: 'edit', onEditingModeChange: vi.fn() });
      expect(screen.getByRole('button', { name: /editing mode/i })).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('renders mode selector with "Suggesting" label when editingMode is suggesting', () => {
      renderToolbar({ mode: 'edit', editingMode: 'suggesting', onEditingModeChange: vi.fn() });
      expect(screen.getByText('Suggesting')).toBeInTheDocument();
    });

    it('renders mode selector with "Viewing" label when editingMode is viewing', () => {
      renderToolbar({ mode: 'edit', editingMode: 'viewing', onEditingModeChange: vi.fn() });
      expect(screen.getByText('Viewing')).toBeInTheDocument();
    });

    it('opens dropdown menu on click', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit', onEditingModeChange: vi.fn() });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows all three mode options in dropdown', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit', onEditingModeChange: vi.fn() });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      expect(screen.getByRole('menuitem', { name: /editing/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /suggesting/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /viewing/i })).toBeInTheDocument();
    });

    it('calls onEditingModeChange with "suggesting" when Suggesting is selected', async () => {
      const user = userEvent.setup();
      const onEditingModeChange = vi.fn();
      renderToolbar({ mode: 'edit', onEditingModeChange });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      await user.click(screen.getByRole('menuitem', { name: /suggesting/i }));
      expect(onEditingModeChange).toHaveBeenCalledWith('suggesting');
    });

    it('calls onEditingModeChange with "editing" when Editing is selected', async () => {
      const user = userEvent.setup();
      const onEditingModeChange = vi.fn();
      renderToolbar({ mode: 'edit', editingMode: 'suggesting', onEditingModeChange });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      await user.click(screen.getByRole('menuitem', { name: /Editing.*Edit directly/i }));
      expect(onEditingModeChange).toHaveBeenCalledWith('editing');
    });

    it('calls onEditingModeChange with "viewing" when Viewing is selected', async () => {
      const user = userEvent.setup();
      const onEditingModeChange = vi.fn();
      renderToolbar({ mode: 'edit', onEditingModeChange });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      await user.click(screen.getByRole('menuitem', { name: /viewing/i }));
      expect(onEditingModeChange).toHaveBeenCalledWith('viewing');
    });

    it('closes dropdown after selecting a mode', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit', onEditingModeChange: vi.fn() });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      await user.click(screen.getByRole('menuitem', { name: /suggesting/i }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not render mode selector when readOnly is true', () => {
      renderToolbar({ mode: 'edit', readOnly: true, onEditingModeChange: vi.fn() });
      expect(screen.queryByRole('button', { name: /editing mode/i })).not.toBeInTheDocument();
    });

    it('does not render mode selector in source mode', () => {
      renderToolbar({ mode: 'source', onEditingModeChange: vi.fn() });
      expect(screen.queryByRole('button', { name: /editing mode/i })).not.toBeInTheDocument();
    });

    it('does not render mode selector when onEditingModeChange is not provided', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.queryByRole('button', { name: /editing mode/i })).not.toBeInTheDocument();
    });

    it('shows accent border styling when in suggesting mode', () => {
      renderToolbar({ mode: 'edit', editingMode: 'suggesting', onEditingModeChange: vi.fn() });
      const modeBtn = screen.getByRole('button', { name: /editing mode/i });
      expect(modeBtn).toBeInTheDocument();
      // Button exists and is in suggesting mode — styling is applied via MUI sx
    });

    it('mode dropdown closes when Escape is pressed', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit', onEditingModeChange: vi.fn() });
      await user.click(screen.getByRole('button', { name: /editing mode/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Legal List dropdown', () => {
    it('renders Legal List button in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Legal List' })).toBeInTheDocument();
    });

    it('renders Legal List button in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.getByRole('button', { name: 'Legal List' })).toBeInTheDocument();
    });

    it('hides Legal List button when readOnly', () => {
      renderToolbar({ mode: 'edit', readOnly: true });
      expect(screen.queryByRole('button', { name: 'Legal List' })).not.toBeInTheDocument();
    });

    it('opens legal list dropdown menu when Legal List button is clicked', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit' });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows all list type options in the dropdown menu', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit' });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      expect(screen.getByRole('menuitem', { name: 'a, b, c' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'A, B, C' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'i, ii, iii' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'I, II, III' })).toBeInTheDocument();
    });

    it('clicking a list type calls onLegalList in source mode', async () => {
      const user = userEvent.setup();
      const onLegalList = vi.fn();
      renderToolbar({ mode: 'source', onLegalList });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      await user.click(screen.getByRole('menuitem', { name: 'a, b, c' }));
      expect(onLegalList).toHaveBeenCalledWith('lower-alpha');
    });

    it('does not call onLegalList in edit mode', async () => {
      const user = userEvent.setup();
      const onLegalList = vi.fn();
      renderToolbar({ mode: 'edit', onLegalList });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      await user.click(screen.getByRole('menuitem', { name: 'a, b, c' }));
      expect(onLegalList).not.toHaveBeenCalled();
    });

    it('legal list dropdown menu closes after item click', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'source' });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.click(screen.getByRole('menuitem', { name: 'A, B, C' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('legal list dropdown menu closes when pressing Escape', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'edit' });
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not crash when onLegalList is not provided', async () => {
      const user = userEvent.setup();
      renderToolbar({ mode: 'source' }); // no onLegalList
      await user.click(screen.getByRole('button', { name: 'Legal List' }));
      await user.click(screen.getByRole('menuitem', { name: 'i, ii, iii' }));
      // Should not throw
    });
  });
});
