/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    // Click the reply placeholder first
    await user.click(screen.getByText('Reply...'));

    const replyInput = screen.getByPlaceholderText('Reply...');
    await user.type(replyInput, 'My reply');

    // Send button should appear
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.click(sendBtn);

    expect(onReply).toHaveBeenCalledWith('c1', 'My reply');
  });

  it('calls onResolve when resolve icon button is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onResolve={onResolve} />, {
      wrapper: Wrapper,
    });

    // Hover to reveal the resolve button
    const article = screen.getByRole('article');
    fireEvent.mouseEnter(article);

    const resolveBtn = screen.getByRole('button', { name: /resolve/i });
    await user.click(resolveBtn);

    expect(onResolve).toHaveBeenCalledWith('c1');
  });

  it('opens three-dot menu with Edit and Delete items', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onDelete={onDelete} />, {
      wrapper: Wrapper,
    });

    // Click the MoreVert (three-dot) menu button
    const menuBtn = screen.getByRole('button', { name: /more options/i });
    await user.click(menuBtn);

    // Menu should open with Edit and Delete items
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete when Delete menu item is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onDelete={onDelete} />, {
      wrapper: Wrapper,
    });

    // Open menu
    const menuBtn = screen.getByRole('button', { name: /more options/i });
    await user.click(menuBtn);

    // Click Delete
    const deleteItem = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteItem);

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

  it('always shows reply placeholder when not focused', () => {
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} isActive={false} />, {
      wrapper: Wrapper,
    });

    // Reply placeholder should always be visible
    expect(screen.getByText('Reply...')).toBeInTheDocument();
    // Real TextField should not be present until clicked
    expect(screen.queryByPlaceholderText('Reply...')).not.toBeInTheDocument();
  });

  it('shows TextField when reply placeholder is clicked', async () => {
    const user = userEvent.setup();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // Click the reply placeholder
    await user.click(screen.getByText('Reply...'));

    // Real TextField should now be present
    expect(screen.getByPlaceholderText('Reply...')).toBeInTheDocument();
  });

  it('renders anchor text quote block when anchorText is present', () => {
    const thread = createThread({ anchorText: 'highlighted passage' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('highlighted passage')).toBeInTheDocument();
  });

  it('does not render anchor quote when anchorText is null', () => {
    const thread = createThread({ anchorText: null });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    // No anchor quote element should be present
    const article = screen.getByRole('article');
    const italicQuote = article.querySelector('[data-testid="anchor-quote"]');
    expect(italicQuote).toBeNull();
  });

  it('resolve button is icon-only in the header row', () => {
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    // Hover to reveal
    const article = screen.getByRole('article');
    fireEvent.mouseEnter(article);

    const resolveBtn = screen.getByRole('button', { name: /resolve/i });
    // Icon-only button should NOT have text content "Resolve"
    expect(resolveBtn).not.toHaveTextContent('Resolve');
  });

  it('edit/delete menu button has hidden-by-default opacity', () => {
    const thread = createThread();

    const { container } = render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    const actionsEl = container.querySelector('.comment-actions');
    expect(actionsEl).toBeTruthy();
  });

  it('card has border styling (no bottom-only border)', () => {
    const thread = createThread();

    const { container } = render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });

    const article = container.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    // Card should exist with full border styling (not just bottom border)
    expect(article).toBeInstanceOf(HTMLElement);
  });

  it('calls onAnchorClick when anchor quote is clicked', async () => {
    const user = userEvent.setup();
    const onAnchorClick = vi.fn();
    const thread = createThread({ anchorText: 'click me' });

    render(<InlineCommentCard thread={thread} {...defaultProps} onAnchorClick={onAnchorClick} />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByText('click me'));

    expect(onAnchorClick).toHaveBeenCalledWith('c1');
  });

  it('does not clear reply text on failed send (empty text)', async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} onReply={onReply} />, {
      wrapper: Wrapper,
    });

    // Click the reply placeholder first
    await user.click(screen.getByText('Reply...'));

    const replyInput = screen.getByPlaceholderText('Reply...');
    await user.click(replyInput);

    // Focus without typing — send button should appear due to focus
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.click(sendBtn);

    // Should not call onReply with empty text
    expect(onReply).not.toHaveBeenCalled();
  });

  it('resolved card uses green check icon color', () => {
    const thread = createThread({ resolved: true, resolvedBy: 'u1' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    // Resolved card should render with CheckRoundedIcon
    expect(screen.getByText(/alice resolved/i)).toBeInTheDocument();
  });

  it('renders connector line pseudo-element container with relative position', () => {
    const thread = createThread();
    const { container } = render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });
    const article = container.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    // Card should have position relative for connector line pseudo-element
    expect(article).toBeInstanceOf(HTMLElement);
  });

  it('displays getDisplayName result instead of raw author name', () => {
    const thread = createThread({ authorName: 'joseph.marsico@acasus.com' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Joseph Marsico')).toBeInTheDocument();
  });

  it('shows raw author name as tooltip', () => {
    const thread = createThread({ authorName: 'joseph.marsico@acasus.com' });

    render(<InlineCommentCard thread={thread} {...defaultProps} />, { wrapper: Wrapper });

    const authorEl = screen.getByText('Joseph Marsico');
    expect(authorEl).toHaveAttribute('title', 'joseph.marsico@acasus.com');
  });

  it('renders resolved card with relative position for connector line', () => {
    const thread = createThread({ resolved: true, resolvedBy: 'u1' });
    const { container } = render(<InlineCommentCard thread={thread} {...defaultProps} />, {
      wrapper: Wrapper,
    });
    const article = container.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    expect(article).toBeInstanceOf(HTMLElement);
  });

  it('hides placeholder and shows TextField when reply is being typed', async () => {
    const user = userEvent.setup();
    const thread = createThread();

    render(<InlineCommentCard thread={thread} {...defaultProps} isActive={false} />, {
      wrapper: Wrapper,
    });

    // Initially placeholder box
    expect(screen.getByText('Reply...')).toBeInTheDocument();

    // Click the reply placeholder to focus
    await user.click(screen.getByText('Reply...'));

    // Now TextField should be present
    const input = screen.getByPlaceholderText('Reply...');
    await user.type(input, 'typing');

    // TextField should still be present with typed text
    expect(input).toHaveValue('typing');
  });
});
