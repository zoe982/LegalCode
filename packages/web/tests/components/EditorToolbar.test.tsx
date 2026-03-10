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
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clause Reference' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Variable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Horizontal Rule' })).toBeInTheDocument();
  });

  it('hides markdown helpers in source mode', () => {
    renderToolbar({ mode: 'source' });
    expect(screen.queryByRole('button', { name: 'Heading' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bold' })).not.toBeInTheDocument();
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

  it('calls crepeRef.editor.action for Heading button', async () => {
    const user = userEvent.setup();
    renderToolbar({ crepeRef: mockCrepeRef as never });
    await user.click(screen.getByRole('button', { name: 'Heading' }));
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

  it('Bold/Italic/Heading/List/OrderedList/HR buttons do nothing when crepeRef is null', async () => {
    const user = userEvent.setup();
    const nullCrepeRef = { current: null };
    renderToolbar({ crepeRef: nullCrepeRef as never });
    // Should not throw when clicking any Milkdown command button with null crepeRef
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    await user.click(screen.getByRole('button', { name: 'List' }));
    await user.click(screen.getByRole('button', { name: 'Ordered List' }));
    await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
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

  describe('Undo/Redo buttons', () => {
    it('renders Undo and Redo buttons in edit mode', () => {
      renderToolbar({ mode: 'edit' });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    });

    it('hides Undo and Redo buttons in source mode', () => {
      renderToolbar({ mode: 'source' });
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
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
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
    });
  });
});
