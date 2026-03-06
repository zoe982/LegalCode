/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { EditorToolbar } from '../../src/components/EditorToolbar.js';

function renderToolbar(props: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  const defaultProps = {
    mode: 'source' as const,
    onModeChange: vi.fn(),
    wordCount: 142,
  };
  return render(
    <ThemeProvider theme={theme}>
      <EditorToolbar {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('EditorToolbar', () => {
  it('renders Source and Review toggle buttons', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Source' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('has a sliding indicator element', () => {
    renderToolbar({ mode: 'source' });
    const indicator = screen.getByTestId('mode-toggle-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('indicator position changes when mode changes', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <EditorToolbar mode="source" onModeChange={vi.fn()} wordCount={10} />
      </ThemeProvider>,
    );
    const indicator = screen.getByTestId('mode-toggle-indicator');
    const sourceTransform = indicator.style.transform;

    rerender(
      <ThemeProvider theme={theme}>
        <EditorToolbar mode="review" onModeChange={vi.fn()} wordCount={10} />
      </ThemeProvider>,
    );
    const reviewTransform = indicator.style.transform;
    expect(sourceTransform).not.toBe(reviewTransform);
  });

  it('calls onModeChange when Review is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderToolbar({ mode: 'source', onModeChange });
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(onModeChange).toHaveBeenCalledWith('review');
  });

  it('calls onModeChange when Source is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderToolbar({ mode: 'review', onModeChange });
    await user.click(screen.getByRole('button', { name: 'Source' }));
    expect(onModeChange).toHaveBeenCalledWith('source');
  });

  it('shows markdown helper buttons in source mode', () => {
    renderToolbar({ mode: 'source' });
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
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
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows ordered list button in source mode', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Ordered List' })).toBeInTheDocument();
  });

  it('shows clause reference button in source mode', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Clause Reference' })).toBeInTheDocument();
  });

  it('shows variable button in source mode', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Variable' })).toBeInTheDocument();
  });

  it('shows horizontal rule button in source mode', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Horizontal Rule' })).toBeInTheDocument();
  });

  it('calls onInsertMarkdown with heading prefix when Heading is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('## ', '');
  });

  it('calls onInsertMarkdown with bold markers when Bold is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('**', '**');
  });

  it('calls onInsertMarkdown with italic markers when Italic is clicked', async () => {
    const user = userEvent.setup();
    const onInsertMarkdown = vi.fn();
    renderToolbar({ onInsertMarkdown });
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    expect(onInsertMarkdown).toHaveBeenCalledWith('*', '*');
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
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    // Should not throw
  });
});
