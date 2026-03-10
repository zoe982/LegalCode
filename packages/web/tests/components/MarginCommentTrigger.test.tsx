/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { MarginCommentTrigger } from '../../src/components/MarginCommentTrigger.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function renderTrigger(
  props: Partial<{
    top: number | null;
    visible: boolean;
    onClick: () => void;
  }> = {},
) {
  const defaultProps = {
    top: 100 as number | null,
    visible: true,
    onClick: vi.fn(),
    ...props,
  };
  return {
    ...render(<MarginCommentTrigger {...defaultProps} />, { wrapper: Wrapper }),
    onClick: defaultProps.onClick,
  };
}

describe('MarginCommentTrigger', () => {
  it('renders when visible is true and top is provided', () => {
    renderTrigger();
    expect(screen.getByTestId('margin-comment-trigger')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    renderTrigger({ visible: false });
    expect(screen.queryByTestId('margin-comment-trigger')).not.toBeInTheDocument();
  });

  it('does not render when top is null', () => {
    renderTrigger({ top: null });
    expect(screen.queryByTestId('margin-comment-trigger')).not.toBeInTheDocument();
  });

  it('does not render when visible is false and top is null', () => {
    renderTrigger({ visible: false, top: null });
    expect(screen.queryByTestId('margin-comment-trigger')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const { onClick } = renderTrigger();
    await user.click(screen.getByTestId('margin-comment-trigger'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has aria-label "Add comment"', () => {
    renderTrigger();
    expect(screen.getByLabelText('Add comment')).toBeInTheDocument();
  });

  it('has data-testid "margin-comment-trigger"', () => {
    renderTrigger();
    expect(screen.getByTestId('margin-comment-trigger')).toBeInTheDocument();
  });

  it('has circular shape (borderRadius: 50%)', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ borderRadius: '50%' });
  });

  it('is positioned at the specified top value', () => {
    renderTrigger({ top: 75 });
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ top: '75px' });
  });

  it('has absolute positioning', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ position: 'absolute' });
  });

  it('has ChatBubbleOutlineRounded icon (svg present)', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    const svg = trigger.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('is positioned to the right of its container (left: calc(100% + 16px))', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ left: 'calc(100% + 16px)' });
  });

  it('has white background color', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('renders with correct dimensions (36px)', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ width: '36px', height: '36px' });
  });
});
