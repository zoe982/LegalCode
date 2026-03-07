/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { PanelToggleButtons } from '../../src/components/PanelToggleButtons.js';

function renderButtons(
  props: Partial<{
    activePanel: 'info' | 'comments' | 'history' | null;
    onToggle: (panel: 'info' | 'comments' | 'history') => void;
    commentCount: number;
  }> = {},
) {
  const defaultProps = {
    activePanel: null as 'info' | 'comments' | 'history' | null,
    onToggle: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <PanelToggleButtons {...defaultProps} />
      </ThemeProvider>,
    ),
    onToggle: defaultProps.onToggle,
  };
}

describe('PanelToggleButtons', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders three toggle buttons', () => {
    renderButtons();
    expect(screen.getByTestId('panel-toggle-info')).toBeInTheDocument();
    expect(screen.getByTestId('panel-toggle-comments')).toBeInTheDocument();
    expect(screen.getByTestId('panel-toggle-history')).toBeInTheDocument();
  });

  it('calls onToggle("info") when info button clicked', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderButtons();
    await user.click(screen.getByTestId('panel-toggle-info'));
    expect(onToggle).toHaveBeenCalledWith('info');
  });

  it('calls onToggle("comments") when comments button clicked', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderButtons();
    await user.click(screen.getByTestId('panel-toggle-comments'));
    expect(onToggle).toHaveBeenCalledWith('comments');
  });

  it('calls onToggle("history") when history button clicked', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderButtons();
    await user.click(screen.getByTestId('panel-toggle-history'));
    expect(onToggle).toHaveBeenCalledWith('history');
  });

  it('shows active styling when activePanel matches', () => {
    renderButtons({ activePanel: 'comments' });
    const commentsBtn = screen.getByTestId('panel-toggle-comments');
    // Active button should have accent color background
    expect(commentsBtn).toHaveStyle({ backgroundColor: 'rgba(128, 39, 255, 0.06)' });
  });

  it('shows comment count badge when commentCount > 0', () => {
    renderButtons({ commentCount: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show badge when commentCount is 0', () => {
    renderButtons({ commentCount: 0 });
    // No badge text should be present
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not show badge when commentCount is undefined', () => {
    renderButtons();
    // The badge container should not render count text
    const commentsBtn = screen.getByTestId('panel-toggle-comments');
    // No numeric text in the button area beyond the icon
    expect(commentsBtn.querySelector('[data-testid="comment-badge"]')).not.toBeInTheDocument();
  });

  it('has correct aria-labels', () => {
    // Dismiss tooltips so they don't override accessible names via aria-labelledby
    localStorage.setItem('legalcode:tooltip:comments:dismissed', 'true');
    localStorage.setItem('legalcode:tooltip:version-history:dismissed', 'true');
    renderButtons();
    expect(screen.getByRole('button', { name: 'Info panel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comments panel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History panel' })).toBeInTheDocument();
  });

  it('has correct data-testids', () => {
    renderButtons();
    expect(screen.getByTestId('panel-toggle-info')).toBeInTheDocument();
    expect(screen.getByTestId('panel-toggle-comments')).toBeInTheDocument();
    expect(screen.getByTestId('panel-toggle-history')).toBeInTheDocument();
  });

  it('shows history tooltip on first render', () => {
    renderButtons();
    expect(screen.getByText('See how your document evolved over time')).toBeInTheDocument();
  });

  it('shows comments tooltip on first render', () => {
    renderButtons();
    expect(screen.getByText('Leave feedback on specific sections')).toBeInTheDocument();
  });

  it('does not show history tooltip when already dismissed', () => {
    localStorage.setItem('legalcode:tooltip:version-history:dismissed', 'true');
    renderButtons();
    expect(screen.queryByText('See how your document evolved over time')).not.toBeInTheDocument();
  });

  it('does not show comments tooltip when already dismissed', () => {
    localStorage.setItem('legalcode:tooltip:comments:dismissed', 'true');
    renderButtons();
    expect(screen.queryByText('Leave feedback on specific sections')).not.toBeInTheDocument();
  });

  it('dismisses history tooltip when "Got it" is clicked', async () => {
    const user = userEvent.setup();
    renderButtons();
    const gotItButtons = screen.getAllByRole('button', { name: 'Got it' });
    // Find the one associated with the history tooltip
    expect(gotItButtons.length).toBeGreaterThanOrEqual(1);
    // Click the last "Got it" (history is the last button with a tooltip)
    const lastButton = gotItButtons[gotItButtons.length - 1];
    if (lastButton === undefined) throw new Error('Expected Got it button');
    await user.click(lastButton);
    expect(localStorage.getItem('legalcode:tooltip:version-history:dismissed')).toBe('true');
  });
});
