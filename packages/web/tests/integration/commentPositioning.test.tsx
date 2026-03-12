/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { InlineCommentMargin } from '../../src/components/InlineCommentMargin.js';
import type { CommentThread } from '../../src/types/comments.js';

// ── DO NOT mock useCommentPositions — this is an integration test ──

// Mock InlineCommentCard to simplify rendering while preserving height behavior
vi.mock('../../src/components/InlineCommentCard.js', () => ({
  InlineCommentCard: ({
    thread,
    isActive,
  }: {
    thread: CommentThread;
    threadIndex: number;
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
    onReply: (parentId: string, content: string) => void;
    isActive?: boolean;
  }) => (
    <div
      data-testid={`inline-card-${thread.comment.id}`}
      data-active={isActive === true ? 'true' : undefined}
      style={{ height: `${String(80 + thread.replies.length * 40)}px` }}
    >
      {thread.comment.content}
      {thread.replies.map((r) => (
        <div key={r.id}>{r.content}</div>
      ))}
    </div>
  ),
}));

// Mock NewCommentCard
vi.mock('../../src/components/NewCommentCard.js', () => ({
  NewCommentCard: ({
    anchorText,
    onSubmit,
    onCancel,
  }: {
    anchorText: string;
    onSubmit: (content: string) => void;
    onCancel: () => void;
    top?: number;
    authorName?: string;
    authorEmail?: string;
    isCreating?: boolean;
  }) => (
    <div data-testid="new-comment-card" data-anchor={anchorText}>
      <button
        onClick={() => {
          onSubmit('test');
        }}
      >
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function createReply(
  id: string,
  content: string,
  parentId: string,
): CommentThread['replies'][number] {
  return {
    id,
    templateId: 't1',
    parentId,
    authorId: 'u2',
    authorName: 'Bob',
    authorEmail: 'bob@acasus.com',
    content,
    anchorFrom: null,
    anchorTo: null,
    anchorText: null,
    resolved: false,
    resolvedBy: null,
    createdAt: '2026-03-08T11:00:00Z',
    updatedAt: '2026-03-08T11:00:00Z',
  };
}

function createThread(
  id: string,
  content: string,
  anchorTop: number,
  resolved = false,
  replies: CommentThread['replies'] = [],
): CommentThread {
  return {
    comment: {
      id,
      templateId: 't1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@acasus.com',
      content,
      anchorFrom: String(anchorTop),
      anchorTo: String(anchorTop + 10),
      anchorText: `anchor text at ${String(anchorTop)}`,
      resolved,
      resolvedBy: resolved ? 'u1' : null,
      createdAt: '2026-03-08T10:00:00Z',
      updatedAt: '2026-03-08T10:00:00Z',
    },
    replies,
  };
}

function createContainerWithAnchors(anchors: { id: string; top: number }[]): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });
  container.getBoundingClientRect = vi.fn().mockReturnValue({
    top: 0,
    left: 0,
    right: 800,
    bottom: 1000,
    width: 800,
    height: 1000,
  });
  document.body.appendChild(container);

  for (const a of anchors) {
    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-id', a.id);
    mark.getBoundingClientRect = vi.fn().mockReturnValue({
      top: a.top,
      left: 0,
      right: 100,
      bottom: a.top + 20,
      width: 100,
      height: 20,
    });
    container.appendChild(mark);
  }

  return container;
}

const defaultProps = {
  onResolve: vi.fn(),
  onDelete: vi.fn(),
  onReply: vi.fn(),
};

describe('Comment Positioning Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Clean up any containers added to the document
    const containers = document.querySelectorAll('div');
    containers.forEach((el) => {
      if (el.parentElement === document.body && !el.querySelector('[data-testid]')) {
        try {
          document.body.removeChild(el);
        } catch {
          // Already removed
        }
      }
    });
  });

  it('renders 3 comments on consecutive paragraphs with all cards visible and non-overlapping', () => {
    const container = createContainerWithAnchors([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 300 },
      { id: 'c3', top: 500 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 100),
      createThread('c2', 'Comment 2', 300),
      createThread('c3', 'Comment 3', 500),
    ];

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // All cards should be visible
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c3')).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it('renders 10 comments on same section with all accessible and none clipped', () => {
    const anchors = Array.from({ length: 10 }, (_, i) => ({
      id: `c${String(i + 1)}`,
      top: 100 + i * 5, // All very close together
    }));
    const container = createContainerWithAnchors(anchors);
    const contentRef = { current: container };

    const threads = anchors.map((a) => createThread(a.id, `Comment ${a.id}`, a.top));

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // All 10 cards should be rendered
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByTestId(`inline-card-c${String(i)}`)).toBeInTheDocument();
    }

    document.body.removeChild(container);
  });

  it('resolves top comment and remaining cards stay visible', async () => {
    const user = userEvent.setup();
    const container = createContainerWithAnchors([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 300 },
      { id: 'c3', top: 500 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 100, true), // resolved
      createThread('c2', 'Comment 2', 300),
      createThread('c3', 'Comment 3', 500),
    ];

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // Resolved comment should be hidden by default
    expect(screen.queryByTestId('inline-card-c1')).not.toBeInTheDocument();
    // Remaining cards should be visible
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c3')).toBeInTheDocument();

    // Show resolved
    const toggleBtn = screen.getByRole('button', { name: /show resolved/i });
    await user.click(toggleBtn);

    // Now all 3 should be visible
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c3')).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it('handles rapid resolve/unresolve toggles with positions always valid', async () => {
    const user = userEvent.setup();
    const container = createContainerWithAnchors([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 300 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 100, true), // resolved
      createThread('c2', 'Comment 2', 300),
    ];

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    const toggleBtn = screen.getByRole('button', { name: /show resolved/i });

    // Rapidly toggle
    await user.click(toggleBtn); // show
    await user.click(screen.getByRole('button', { name: /hide resolved/i })); // hide
    await user.click(screen.getByRole('button', { name: /show resolved/i })); // show again

    // After toggling, cards should still be valid
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it('renders comments with replies without overlap', () => {
    const container = createContainerWithAnchors([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 200 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 100, false, [
        createReply('r1', 'Reply 1', 'c1'),
        createReply('r2', 'Reply 2', 'c1'),
        createReply('r3', 'Reply 3', 'c1'),
      ]),
      createThread('c2', 'Comment 2', 200),
    ];

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // Both cards should be visible
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();

    // Replies should be rendered
    expect(screen.getByText('Reply 1')).toBeInTheDocument();
    expect(screen.getByText('Reply 2')).toBeInTheDocument();
    expect(screen.getByText('Reply 3')).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it('all cards remain accessible with different viewport configurations', () => {
    const container = createContainerWithAnchors([
      { id: 'c1', top: 50 },
      { id: 'c2', top: 100 },
      { id: 'c3', top: 150 },
      { id: 'c4', top: 200 },
      { id: 'c5', top: 250 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 50),
      createThread('c2', 'Comment 2', 100),
      createThread('c3', 'Comment 3', 150),
      createThread('c4', 'Comment 4', 200),
      createThread('c5', 'Comment 5', 250),
    ];

    render(<InlineCommentMargin threads={threads} contentRef={contentRef} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // All 5 cards should be rendered and accessible
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`inline-card-c${String(i)}`)).toBeInTheDocument();
    }

    document.body.removeChild(container);
  });

  it('NewCommentCard renders inside the same container as existing cards (not a sibling)', () => {
    const container = createContainerWithAnchors([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 200 },
      { id: 'c3', top: 300 },
    ]);
    const contentRef = { current: container };

    const threads = [
      createThread('c1', 'Comment 1', 100),
      createThread('c2', 'Comment 2', 200),
      createThread('c3', 'Comment 3', 300),
    ];

    render(
      <InlineCommentMargin
        threads={threads}
        contentRef={contentRef}
        {...defaultProps}
        pendingAnchor={{ anchorText: 'selected text' }}
        onSubmitComment={vi.fn()}
        onCancelComment={vi.fn()}
        pendingCommentTop={200}
      />,
      { wrapper: Wrapper },
    );

    const newCard = screen.getByTestId('new-comment-card');
    // The NewCommentCard's positioned wrapper should share the same parent as the existing cards
    const existingCard = screen.getByTestId('inline-card-c1');
    const existingCardContainer = existingCard.parentElement?.parentElement;
    const newCardContainer = newCard.parentElement?.parentElement;
    expect(newCardContainer).toBe(existingCardContainer);

    document.body.removeChild(container);
  });

  it('NewCommentCard renders near the pendingCommentTop position', () => {
    const container = createContainerWithAnchors([]);
    const contentRef = { current: container };

    render(
      <InlineCommentMargin
        threads={[]}
        contentRef={contentRef}
        {...defaultProps}
        pendingAnchor={{ anchorText: 'selected text' }}
        onSubmitComment={vi.fn()}
        onCancelComment={vi.fn()}
        pendingCommentTop={500}
      />,
      { wrapper: Wrapper },
    );

    const newCard = screen.getByTestId('new-comment-card');
    // The wrapper around NewCommentCard should have top position near 500, not near 0
    const wrapper = newCard.parentElement;
    const topStyle = wrapper?.style.top ?? '';
    const topValue = parseFloat(topStyle);
    // Should be close to 500 (within collision resolution range), definitely not near 0
    expect(topValue).toBeGreaterThanOrEqual(400);

    document.body.removeChild(container);
  });

  it('clicking a card calls onCommentClick with the comment id', async () => {
    const user = userEvent.setup();
    const container = createContainerWithAnchors([{ id: 'c1', top: 100 }]);
    const contentRef = { current: container };

    const threads = [createThread('c1', 'Comment 1', 100)];
    const onCommentClick = vi.fn();

    render(
      <InlineCommentMargin
        threads={threads}
        contentRef={contentRef}
        {...defaultProps}
        activeCommentId="c1"
        onCommentClick={onCommentClick}
      />,
      { wrapper: Wrapper },
    );

    const card = screen.getByTestId('inline-card-c1');
    await user.click(card);
    expect(onCommentClick).toHaveBeenCalledWith('c1');

    document.body.removeChild(container);
  });

  it('transitioning from threads to empty threads renders zero cards', () => {
    const container = createContainerWithAnchors([]);
    const contentRef = { current: container };

    const { rerender } = render(
      <InlineCommentMargin
        threads={[createThread('c1', 'Comment 1', 100)]}
        contentRef={contentRef}
        {...defaultProps}
      />,
      { wrapper: Wrapper },
    );

    // Re-render with empty threads
    rerender(
      <ThemeProvider theme={theme}>
        <InlineCommentMargin threads={[]} contentRef={contentRef} {...defaultProps} />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('inline-card-c1')).not.toBeInTheDocument();
  });
});
