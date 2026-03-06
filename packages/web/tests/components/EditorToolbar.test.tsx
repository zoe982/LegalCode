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

  it('highlights Source button when mode is source', () => {
    renderToolbar({ mode: 'source' });
    const sourceBtn = screen.getByRole('button', { name: 'Source' });
    expect(sourceBtn).toHaveStyle({ backgroundColor: '#8027FF' });
  });

  it('highlights Review button when mode is review', () => {
    renderToolbar({ mode: 'review' });
    const reviewBtn = screen.getByRole('button', { name: 'Review' });
    expect(reviewBtn).toHaveStyle({ backgroundColor: '#8027FF' });
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
});
