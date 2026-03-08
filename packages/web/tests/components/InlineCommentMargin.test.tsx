/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { InlineCommentMargin } from '../../src/components/InlineCommentMargin.js';
import type { CommentThread } from '../../src/types/comments.js';

// Mock useCommentPositions
vi.mock('../../src/hooks/useCommentPositions.js', () => ({
  useCommentPositions: (_ref: unknown, commentIds: string[]) =>
    commentIds.map((id, idx) => ({ commentId: id, top: 100 + idx * 200 })),
}));

// Mock InlineCommentCard to simplify margin tests
vi.mock('../../src/components/InlineCommentCard.js', () => ({
  InlineCommentCard: ({
    thread,
    isActive,
    style,
  }: {
    thread: CommentThread;
    threadIndex: number;
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
    onReply: (parentId: string, content: string) => void;
    isActive?: boolean;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid={`inline-card-${thread.comment.id}`}
      data-active={isActive === true ? 'true' : undefined}
      style={style}
    >
      {thread.comment.content}
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

function createThread(id: string, content: string, resolved = false): CommentThread {
  return {
    comment: {
      id,
      templateId: 't1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@acasus.com',
      content,
      anchorFrom: '0',
      anchorTo: '10',
      anchorText: 'anchor',
      resolved,
      resolvedBy: resolved ? 'u1' : null,
      createdAt: '2026-03-08T10:00:00Z',
      updatedAt: '2026-03-08T10:00:00Z',
    },
    replies: [],
  };
}

const defaultProps = {
  contentRef: { current: document.createElement('div') },
  onResolve: vi.fn(),
  onDelete: vi.fn(),
  onReply: vi.fn(),
};

describe('InlineCommentMargin', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders empty state when there are no threads', () => {
    render(<InlineCommentMargin threads={[]} {...defaultProps} />, { wrapper: Wrapper });

    const margin = screen.getByRole('complementary', { name: /comments/i });
    expect(margin).toBeInTheDocument();
    // No cards should be rendered
    expect(screen.queryByTestId(/inline-card-/)).not.toBeInTheDocument();
  });

  it('renders a single comment card', () => {
    const threads = [createThread('c1', 'First comment')];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByText('First comment')).toBeInTheDocument();
  });

  it('renders multiple comment cards', () => {
    const threads = [
      createThread('c1', 'First'),
      createThread('c2', 'Second'),
      createThread('c3', 'Third'),
    ];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c3')).toBeInTheDocument();
  });

  it('toggles collapse and expand', async () => {
    const user = userEvent.setup();
    const threads = [createThread('c1', 'Comment')];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    // Should initially be expanded
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();

    // Click collapse button
    const collapseBtn = screen.getByRole('button', { name: /hide comments/i });
    await user.click(collapseBtn);

    // Cards should be hidden
    expect(screen.queryByTestId('inline-card-c1')).not.toBeInTheDocument();

    // Click expand button
    const expandBtn = screen.getByRole('button', { name: /show comments/i });
    await user.click(expandBtn);

    // Cards should reappear
    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
  });

  it('highlights active card', () => {
    const threads = [createThread('c1', 'First'), createThread('c2', 'Second')];

    render(<InlineCommentMargin threads={threads} {...defaultProps} activeCommentId="c2" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('inline-card-c1').getAttribute('data-active')).toBeNull();
    expect(screen.getByTestId('inline-card-c2').getAttribute('data-active')).toBe('true');
  });

  it('filters out resolved threads by default', () => {
    const threads = [
      createThread('c1', 'Open comment', false),
      createThread('c2', 'Resolved comment', true),
    ];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-card-c2')).not.toBeInTheDocument();
  });

  it('shows resolved threads when toggle is clicked', async () => {
    const user = userEvent.setup();
    const threads = [
      createThread('c1', 'Open comment', false),
      createThread('c2', 'Resolved comment', true),
    ];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    // Click "Show resolved" toggle
    const showResolvedBtn = screen.getByRole('button', { name: /show resolved/i });
    await user.click(showResolvedBtn);

    expect(screen.getByTestId('inline-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-c2')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<InlineCommentMargin threads={[]} {...defaultProps} />, { wrapper: Wrapper });

    const margin = screen.getByRole('complementary', { name: /comments/i });
    expect(margin).toBeInTheDocument();
  });

  it('calls onCommentClick when a card is clicked', async () => {
    const user = userEvent.setup();
    const onCommentClick = vi.fn();
    const threads = [createThread('c1', 'Comment')];

    render(
      <InlineCommentMargin threads={threads} {...defaultProps} onCommentClick={onCommentClick} />,
      { wrapper: Wrapper },
    );

    // Click the card
    await user.click(screen.getByTestId('inline-card-c1'));
    expect(onCommentClick).toHaveBeenCalledWith('c1');
  });

  it('does not show "Show resolved" button when no resolved threads exist', () => {
    const threads = [createThread('c1', 'Open only', false)];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.queryByRole('button', { name: /show resolved/i })).not.toBeInTheDocument();
  });

  it('shows collapse toggle with correct aria-expanded state', async () => {
    const user = userEvent.setup();
    const threads = [createThread('c1', 'Comment')];

    render(<InlineCommentMargin threads={threads} {...defaultProps} />, { wrapper: Wrapper });

    const collapseBtn = screen.getByRole('button', { name: /hide comments/i });
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');

    await user.click(collapseBtn);

    const expandBtn = screen.getByRole('button', { name: /show comments/i });
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
  });
});
