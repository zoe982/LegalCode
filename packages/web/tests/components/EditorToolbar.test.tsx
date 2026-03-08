/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { EditorToolbar } from '../../src/components/EditorToolbar.js';

function renderToolbar(props: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  const defaultProps = {
    mode: 'source' as const,
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
  });

  it('shows markdown helper buttons in source mode (no Bold/Italic)', () => {
    renderToolbar({ mode: 'source' });
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordered List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clause Reference' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Variable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Horizontal Rule' })).toBeInTheDocument();
    // Bold and Italic are removed in v3
    expect(screen.queryByRole('button', { name: 'Bold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Italic' })).not.toBeInTheDocument();
  });

  it('hides markdown helpers in review mode', () => {
    renderToolbar({ mode: 'review' });
    expect(screen.queryByRole('button', { name: 'Heading' })).not.toBeInTheDocument();
  });

  it('hides markdown helpers when readOnly', () => {
    renderToolbar({ mode: 'source', readOnly: true });
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

  it('renders ConnectionStatus when connectionStatus is provided', () => {
    renderToolbar({ connectionStatus: 'connected' });
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('calls onInsertMarkdown with heading prefix when Heading is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('## ', '');
  });

  it('calls onInsertMarkdown with link syntax when Link is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Link' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('[', '](url)');
  });

  it('calls onInsertMarkdown with list prefix when List is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('- ', '');
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

  it('calls onInsertMarkdown with ordered list prefix when Ordered List is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Ordered List' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('1. ', '');
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

  it('calls onInsertMarkdown with horizontal rule when Horizontal Rule is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Horizontal Rule' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('\n---\n', '');
  });

  it('does not crash when onInsertMarkdown is not provided', async () => {
    const user = userEvent.setup();
    renderToolbar(); // no onInsertMarkdown
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    // Should not throw
  });

  it('toolbar has 44px height', () => {
    renderToolbar();
    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar).toHaveStyle({ height: '44px' });
  });

  it('does not render mode toggle buttons (moved to DocumentHeader)', () => {
    renderToolbar();
    expect(screen.queryByRole('button', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
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

  it('does not render ConnectionStatus when connectionStatus is not provided', () => {
    renderToolbar();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
  });
});
