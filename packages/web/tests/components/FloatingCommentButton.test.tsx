/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingCommentButton } from '../../src/components/FloatingCommentButton.js';

function renderButton(
  props: Partial<{
    position: { top: number; left: number } | null;
    visible: boolean;
    onClick: () => void;
  }> = {},
) {
  const defaultProps = {
    position: { top: 100, left: 200 } as { top: number; left: number } | null,
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
  it('renders button when visible and position is provided', () => {
    renderButton();
    expect(screen.getByTestId('floating-comment-button')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    renderButton({ visible: false });
    expect(screen.queryByTestId('floating-comment-button')).not.toBeInTheDocument();
  });

  it('does not render when position is null', () => {
    renderButton({ position: null });
    expect(screen.queryByTestId('floating-comment-button')).not.toBeInTheDocument();
  });

  it('displays "Comment" text', () => {
    renderButton();
    expect(screen.getByText('Comment')).toBeInTheDocument();
  });

  it('displays chat bubble icon', () => {
    renderButton();
    const button = screen.getByTestId('floating-comment-button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
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

  it('positions at the specified top/left', () => {
    renderButton({ position: { top: 50, left: 150 } });
    const button = screen.getByTestId('floating-comment-button');
    expect(button).toHaveStyle({ top: '50px', left: '150px' });
  });
});
