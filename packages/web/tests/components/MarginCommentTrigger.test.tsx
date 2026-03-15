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
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveStyle({ visibility: 'hidden' });
  });

  it('does not render when top is null', () => {
    renderTrigger({ top: null });
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveStyle({ visibility: 'hidden' });
  });

  it('does not render when visible is false and top is null', () => {
    renderTrigger({ visible: false, top: null });
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveStyle({ visibility: 'hidden' });
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

  it('is positioned to the right of its container (right: -18px)', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ right: '-18px' });
  });

  it('renders with z-index 10', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ zIndex: 10 });
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

  it('prevents default on mousedown to preserve editor selection', () => {
    renderTrigger();
    const trigger = screen.getByTestId('margin-comment-trigger');
    const mousedownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const prevented = !trigger.dispatchEvent(mousedownEvent);
    expect(prevented).toBe(true);
  });

  it('always renders a DOM element even when visible=false', () => {
    renderTrigger({ visible: false });
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveStyle({ visibility: 'hidden', opacity: '0', pointerEvents: 'none' });
  });

  it('does not add/remove DOM elements when visibility toggles', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <MarginCommentTrigger top={100} visible={true} onClick={onClick} />
      </ThemeProvider>,
    );
    const triggerBefore = screen.getByTestId('margin-comment-trigger');
    rerender(
      <ThemeProvider theme={theme}>
        <MarginCommentTrigger top={100} visible={false} onClick={onClick} />
      </ThemeProvider>,
    );
    const triggerAfter = screen.getByTestId('margin-comment-trigger');
    expect(triggerAfter).toBeInTheDocument();
    expect(triggerBefore).toBe(triggerAfter);
  });

  it('has position:absolute styling when visible', () => {
    renderTrigger({ visible: true, top: 50 });
    const trigger = screen.getByTestId('margin-comment-trigger');
    expect(trigger).toHaveStyle({ position: 'absolute' });
  });
});
