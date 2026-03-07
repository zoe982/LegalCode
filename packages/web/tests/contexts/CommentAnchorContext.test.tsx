/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  CommentAnchorProvider,
  useCommentAnchor,
} from '../../src/contexts/CommentAnchorContext.js';

function TestConsumer() {
  const {
    pendingAnchor,
    activeCommentId,
    setPendingAnchor,
    clearPendingAnchor,
    setActiveCommentId,
  } = useCommentAnchor();

  return (
    <div>
      <span data-testid="anchor-text">{pendingAnchor?.anchorText ?? 'none'}</span>
      <span data-testid="anchor-from">{pendingAnchor?.anchorFrom ?? 'none'}</span>
      <span data-testid="anchor-to">{pendingAnchor?.anchorTo ?? 'none'}</span>
      <span data-testid="active-comment">{activeCommentId ?? 'none'}</span>
      <button
        onClick={() => {
          setPendingAnchor({
            anchorText: 'selected text',
            anchorFrom: 'p:0:5',
            anchorTo: 'p:0:18',
          });
        }}
      >
        Set Anchor
      </button>
      <button onClick={clearPendingAnchor}>Clear Anchor</button>
      <button
        onClick={() => {
          setActiveCommentId('comment-1');
        }}
      >
        Set Active
      </button>
      <button
        onClick={() => {
          setActiveCommentId(null);
        }}
      >
        Clear Active
      </button>
    </div>
  );
}

describe('CommentAnchorContext', () => {
  it('renders children within provider', () => {
    render(
      <CommentAnchorProvider>
        <span>child content</span>
      </CommentAnchorProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('throws when useCommentAnchor is used outside provider', () => {
    function BadConsumer() {
      useCommentAnchor();
      return <div />;
    }
    expect(() => {
      render(<BadConsumer />);
    }).toThrow('useCommentAnchor must be used within a CommentAnchorProvider');
  });

  it('provides default null state', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );
    expect(screen.getByTestId('anchor-text')).toHaveTextContent('none');
    expect(screen.getByTestId('anchor-from')).toHaveTextContent('none');
    expect(screen.getByTestId('anchor-to')).toHaveTextContent('none');
    expect(screen.getByTestId('active-comment')).toHaveTextContent('none');
  });

  it('sets pending anchor via setPendingAnchor', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Anchor' }).click();
    });

    expect(screen.getByTestId('anchor-text')).toHaveTextContent('selected text');
    expect(screen.getByTestId('anchor-from')).toHaveTextContent('p:0:5');
    expect(screen.getByTestId('anchor-to')).toHaveTextContent('p:0:18');
  });

  it('clears pending anchor via clearPendingAnchor', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Anchor' }).click();
    });
    expect(screen.getByTestId('anchor-text')).toHaveTextContent('selected text');

    act(() => {
      screen.getByRole('button', { name: 'Clear Anchor' }).click();
    });
    expect(screen.getByTestId('anchor-text')).toHaveTextContent('none');
    expect(screen.getByTestId('anchor-from')).toHaveTextContent('none');
    expect(screen.getByTestId('anchor-to')).toHaveTextContent('none');
  });

  it('sets activeCommentId via setActiveCommentId', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Active' }).click();
    });
    expect(screen.getByTestId('active-comment')).toHaveTextContent('comment-1');
  });

  it('clears activeCommentId by setting null', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Active' }).click();
    });
    expect(screen.getByTestId('active-comment')).toHaveTextContent('comment-1');

    act(() => {
      screen.getByRole('button', { name: 'Clear Active' }).click();
    });
    expect(screen.getByTestId('active-comment')).toHaveTextContent('none');
  });

  it('handles multiple state updates independently', () => {
    render(
      <CommentAnchorProvider>
        <TestConsumer />
      </CommentAnchorProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Anchor' }).click();
    });
    act(() => {
      screen.getByRole('button', { name: 'Set Active' }).click();
    });

    expect(screen.getByTestId('anchor-text')).toHaveTextContent('selected text');
    expect(screen.getByTestId('active-comment')).toHaveTextContent('comment-1');

    // Clearing anchor should not affect active comment
    act(() => {
      screen.getByRole('button', { name: 'Clear Anchor' }).click();
    });
    expect(screen.getByTestId('anchor-text')).toHaveTextContent('none');
    expect(screen.getByTestId('active-comment')).toHaveTextContent('comment-1');
  });
});
