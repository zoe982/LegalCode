/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { InlineCommentCard } from '../../src/components/InlineCommentCard.js';
import type { CommentThread } from '../../src/types/comments.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function createThread(
  overrides: Partial<CommentThread['comment']> = {},
  replies: CommentThread['replies'] = [],
): CommentThread {
  return {
    comment: {
      id: 'c1',
      templateId: 't1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@acasus.com',
      content: 'This needs revision.',
      anchorFrom: '0',
      anchorTo: '10',
      anchorText: 'some text',
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-08T10:00:00Z',
      updatedAt: '2026-03-08T10:00:00Z',
      ...overrides,
    },
    replies,
  };
}

const defaultProps = {
  threadIndex: 0,
  onResolve: vi.fn(),
  onDelete: vi.fn(),
  onReply: vi.fn(),
};

describe('InlineCommentCard', () => {
  it('renders comment with author name, content, and timestamp', () => {
    const thread = createThread();
    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('article', { name: /comment by alice/i })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('This needs revision.')).toBeInTheDocument();
  });

  it('renders replies indented below the parent comment', () => {
    const replies = [
      {
        id: 'r1',
        templateId: 't1',
        parentId: 'c1',
        authorId: 'u2',
        authorName: 'Bob',
        authorEmail: 'bob@acasus.com',
        content: 'Agreed, will fix.',
        anchorFrom: null,
        anchorTo: null,
        anchorText: null,
        resolved: false,
        resolvedBy: null,
        createdAt: '2026-03-08T11:00:00Z',
        updatedAt: '2026-03-08T11:00:00Z',
      },
    ];
    const thread = createThread({}, replies);

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Agreed, will fix.')).toBeInTheDocument();
  });

  it('shows collapsed resolved state', () => {
    const thread = createThread({ resolved: true, resolvedBy: 'u1' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText(/alice resolved/i)).toBeInTheDocument();
    // Content should not be visible in collapsed resolved state
    expect(screen.queryByText('This needs revision.')).not.toBeVisible();
  });

  it('expands resolved thread on click', async () => {
    const user = userEvent.setup();
    const thread = createThread({ resolved: true, resolvedBy: 'u1' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    // Click to expand
    await user.click(screen.getByText(/alice resolved/i));

    // After expansion, the content should be visible
    expect(screen.getByText('This needs revision.')).toBeVisible();
  });

  it('applies active styling when isActive is true', () => {
    const thread = createThread();

    const { container } = render(<InlineCommentCard thread={thread} {...defaultProps} isActive />, {
      wrapper: Wrapper,
    });

    const article = container.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    // Active state adds data-active attribute
    expect(article?.getAttribute('data-active')).toBe('true');
  });

  it('does not apply active styling when isActive is false', () => {
    const thread = createThread();

    const { container } = render(
      <InlineCommentCard thread={thread} {...defaultProps} isActive={false} />,
      { wrapper: Wrapper },
    );

    const article = container.querySelector('[role="article"]');
    expect(article?.getAttribute('data-active')).toBeNull();
  });

  it('calls onReply when reply text is submitted', async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onReply={onReply} />, {
      wrapper: Wrapper,
    });

    const replyInput = screen.getByPlaceholderText('Reply...');
    await user.click(replyInput);
    await user.type(replyInput, 'My reply');

    // Send button should appear
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.click(sendBtn);

    expect(onReply).toHaveBeenCalledWith('c1', 'My reply');
  });

  it('calls onResolve when resolve button is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onResolve={onResolve} />, {
      wrapper: Wrapper,
    });

    const resolveBtn = screen.getByRole('button', { name: /resolve/i });
    await user.click(resolveBtn);

    expect(onResolve).toHaveBeenCalledWith('c1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onDelete={onDelete} />, {
      wrapper: Wrapper,
    });

    const deleteBtn = screen.getByRole('button', { name: /delete comment/i });
    await user.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('applies style prop for absolute positioning', () => {
    const thread = createThread();

    const { container } = render(
      <InlineCommentCard
        thread={thread}
        {...defaultProps}
        style={{ position: 'absolute', top: 120 }}
      />,
      { wrapper: Wrapper },
    );

    const article = container.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    const style = (article as HTMLElement).style;
    expect(style.position).toBe('absolute');
    expect(style.top).toBe('120px');
  });

  it('does not show send button when reply input is empty and not focused', () => {
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
  });

  it('shows anchor text quote when available', () => {
    const thread = createThread({ anchorText: 'highlighted passage' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('highlighted passage')).toBeInTheDocument();
  });

  it('does not clear reply text on failed send (empty text)', async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onReply={onReply} />, {
      wrapper: Wrapper,
    });

    const replyInput = screen.getByPlaceholderText('Reply...');
    await user.click(replyInput);

    // Focus without typing — send button should appear due to focus
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.click(sendBtn);

    // Should not call onReply with empty text
    expect(onReply).not.toHaveBeenCalled();
  });
});
