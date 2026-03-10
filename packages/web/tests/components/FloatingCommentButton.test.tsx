/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingCommentButton } from '../../src/components/FloatingCommentButton.js';

function renderButton(
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
    ...render(<FloatingCommentButton {...defaultProps} />),
    onClick: defaultProps.onClick,
  };
}

describe('FloatingCommentButton', () => {
  it('renders button when visible and top is provided', () => {
    renderButton();
    expect(screen.getByTestId('floating-comment-button')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    renderButton({ visible: false });
    expect(screen.queryByTestId('floating-comment-button')).not.toBeInTheDocument();
  });

  it('does not render when top is null', () => {
    renderButton({ top: null });
    expect(screen.queryByTestId('floating-comment-button')).not.toBeInTheDocument();
  });

  it('displays chat bubble icon', () => {
    renderButton();
    const button = screen.getByTestId('floating-comment-button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not display "Comment" text label (icon-only)', () => {
    renderButton();
    expect(screen.queryByText('Comment')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const { onClick } = renderButton();
    await user.click(screen.getByTestId('floating-comment-button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has correct data-testid', () => {
    renderButton();
    expect(screen.getByTestId('floating-comment-button')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderButton();
    expect(screen.getByLabelText('Add comment')).toBeInTheDocument();
  });

  it('positions at the specified top', () => {
    renderButton({ top: 50 });
    const button = screen.getByTestId('floating-comment-button');
    expect(button).toHaveStyle({ top: '50px' });
  });

  it('renders as a circular button in the margin', () => {
    renderButton();
    const button = screen.getByTestId('floating-comment-button');
    expect(button).toHaveStyle({ left: '100%', borderRadius: '50%' });
  });
});
