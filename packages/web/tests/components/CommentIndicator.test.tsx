/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentIndicator } from '../../src/components/CommentIndicator.js';

function renderIndicator(
  props: Partial<{
    resolved: boolean;
    commentId: string;
    onClick: (commentId: string) => void;
    top: number;
  }> = {},
) {
  const defaultProps = {
    resolved: false,
    commentId: 'comment-1',
    onClick: vi.fn(),
    top: 100,
    ...props,
  };
  return {
    ...render(<CommentIndicator {...defaultProps} />),
    onClick: defaultProps.onClick,
  };
}

describe('CommentIndicator', () => {
  it('renders with correct size (8px width/height)', () => {
    renderIndicator();
    const el = screen.getByTestId('comment-indicator-comment-1');
    expect(el).toHaveStyle({ width: '8px', height: '8px' });
  });

  it('shows amber color for unresolved', () => {
    renderIndicator({ resolved: false });
    const el = screen.getByTestId('comment-indicator-comment-1');
    expect(el).toHaveStyle({ backgroundColor: '#D97706' });
  });

  it('shows gray color for resolved', () => {
    renderIndicator({ resolved: true });
    const el = screen.getByTestId('comment-indicator-comment-1');
    expect(el).toHaveStyle({ backgroundColor: '#9B9DB0' });
  });

  it('calls onClick with commentId when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderIndicator({ onClick, commentId: 'thread-7' });
    await user.click(screen.getByTestId('comment-indicator-thread-7'));
    expect(onClick).toHaveBeenCalledWith('thread-7');
  });

  it('positions at specified top value', () => {
    renderIndicator({ top: 250 });
    const el = screen.getByTestId('comment-indicator-comment-1');
    expect(el).toHaveStyle({ top: '250px' });
  });

  it('has correct data-testid', () => {
    renderIndicator({ commentId: 'xyz-999' });
    expect(screen.getByTestId('comment-indicator-xyz-999')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderIndicator();
    expect(screen.getByLabelText('Go to comment')).toBeInTheDocument();
  });

  it('has border-radius 50% (circle)', () => {
    renderIndicator();
    const el = screen.getByTestId('comment-indicator-comment-1');
    expect(el).toHaveStyle({ borderRadius: '50%' });
  });
});
