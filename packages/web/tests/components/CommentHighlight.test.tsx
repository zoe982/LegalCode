/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentHighlight } from '../../src/components/CommentHighlight.js';

function renderHighlight(
  props: Partial<{
    status: 'unresolved' | 'resolved' | 'active';
    commentId: string;
    onClick: (commentId: string) => void;
    children: React.ReactNode;
  }> = {},
) {
  const defaultProps = {
    status: 'unresolved' as const,
    commentId: 'comment-1',
    onClick: vi.fn(),
    children: 'Highlighted text',
    ...props,
  };
  return {
    ...render(<CommentHighlight {...defaultProps} />),
    onClick: defaultProps.onClick,
  };
}

describe('CommentHighlight', () => {
  it('renders children text', () => {
    renderHighlight({ children: 'Some highlighted content' });
    expect(screen.getByText('Some highlighted content')).toBeInTheDocument();
  });

  it('applies unresolved highlight background', () => {
    renderHighlight({ status: 'unresolved' });
    const el = screen.getByTestId('comment-highlight-comment-1');
    expect(el).toHaveStyle({ backgroundColor: 'rgba(251, 191, 36, 0.2)' });
  });

  it('applies resolved highlight background', () => {
    renderHighlight({ status: 'resolved' });
    const el = screen.getByTestId('comment-highlight-comment-1');
    expect(el).toHaveStyle({ backgroundColor: 'rgba(251, 191, 36, 0.06)' });
  });

  it('applies active highlight background', () => {
    renderHighlight({ status: 'active' });
    const el = screen.getByTestId('comment-highlight-comment-1');
    expect(el).toHaveStyle({ backgroundColor: 'rgba(251, 191, 36, 0.33)' });
  });

  it('calls onClick with commentId when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderHighlight({ onClick, commentId: 'thread-42' });
    await user.click(screen.getByTestId('comment-highlight-thread-42'));
    expect(onClick).toHaveBeenCalledWith('thread-42');
  });

  it('has correct data-testid', () => {
    renderHighlight({ commentId: 'abc-123' });
    expect(screen.getByTestId('comment-highlight-abc-123')).toBeInTheDocument();
  });

  it('renders as inline span element', () => {
    renderHighlight();
    const el = screen.getByTestId('comment-highlight-comment-1');
    expect(el.tagName).toBe('SPAN');
  });

  it('has cursor pointer style', () => {
    renderHighlight();
    const el = screen.getByTestId('comment-highlight-comment-1');
    expect(el).toHaveStyle({ cursor: 'pointer' });
  });

  // ── NEW TESTS ──────────────────────────────────────────────────────

  it('overlapping highlights both receive click events independently', async () => {
    const user = userEvent.setup();
    const onClick1 = vi.fn();
    const onClick2 = vi.fn();

    const { container } = render(
      <div>
        <CommentHighlight status="unresolved" commentId="comment-A" onClick={onClick1}>
          Shared text
        </CommentHighlight>
        <CommentHighlight status="unresolved" commentId="comment-B" onClick={onClick2}>
          Other text
        </CommentHighlight>
      </div>,
    );

    // Click first highlight
    const highlight1 = container.querySelector('[data-testid="comment-highlight-comment-A"]');
    expect(highlight1).toBeTruthy();
    if (highlight1 != null) {
      await user.click(highlight1 as HTMLElement);
    }
    expect(onClick1).toHaveBeenCalledWith('comment-A');
    expect(onClick2).not.toHaveBeenCalled();

    // Click second highlight
    const highlight2 = container.querySelector('[data-testid="comment-highlight-comment-B"]');
    expect(highlight2).toBeTruthy();
    if (highlight2 != null) {
      await user.click(highlight2 as HTMLElement);
    }
    expect(onClick2).toHaveBeenCalledWith('comment-B');
    expect(onClick1).toHaveBeenCalledTimes(1);
  });
});
