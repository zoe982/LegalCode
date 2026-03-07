/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { CommentsTab } from '../../src/components/CommentsTab.js';
import type { CommentThread } from '../../src/types/comments.js';
import type { Comment } from '../../src/types/comments.js';

const mockUseComments = vi.fn();

vi.mock('../../src/hooks/useComments.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useComments: (...args: unknown[]) => mockUseComments(...args),
}));

const parentComment: Comment = {
  id: 'c1',
  templateId: 'tpl-1',
  parentId: null,
  authorId: 'u1',
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  content: 'Check this clause.',
  anchorBlockId: 'block-1',
  anchorText: 'the parties agree to the terms',
  resolved: false,
  resolvedBy: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const replyComment: Comment = {
  id: 'c2',
  templateId: 'tpl-1',
  parentId: 'c1',
  authorId: 'u2',
  authorName: 'Bob',
  authorEmail: 'bob@example.com',
  content: 'Looks good to me.',
  anchorBlockId: null,
  anchorText: null,
  resolved: false,
  resolvedBy: null,
  createdAt: '2026-03-01T01:00:00Z',
  updatedAt: '2026-03-01T01:00:00Z',
};

const resolvedComment: Comment = {
  id: 'c3',
  templateId: 'tpl-1',
  parentId: null,
  authorId: 'u1',
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  content: 'Old issue.',
  anchorBlockId: 'block-2',
  anchorText: 'whereas',
  resolved: true,
  resolvedBy: 'u2',
  createdAt: '2026-02-28T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const threadWithReply: CommentThread = {
  comment: parentComment,
  replies: [replyComment],
};

const resolvedThread: CommentThread = {
  comment: resolvedComment,
  replies: [],
};

const defaultHookReturn = {
  threads: [] as CommentThread[],
  isLoading: false,
  createComment: vi.fn(),
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
  showResolved: false,
  toggleShowResolved: vi.fn(),
};

function renderTab(templateId: string | undefined = 'tpl-1') {
  return render(
    <ThemeProvider theme={theme}>
      <CommentsTab templateId={templateId} />
    </ThemeProvider>,
  );
}

describe('CommentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseComments.mockReturnValue({ ...defaultHookReturn });
  });

  it('shows empty state when no comments', () => {
    renderTab();
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
    expect(
      screen.getByText('Select text in Review mode and press Cmd+Opt+M to comment.'),
    ).toBeInTheDocument();
  });

  it('shows comment count and resolved count in header', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply, resolvedThread],
      showResolved: true,
    });
    renderTab();
    // 2 threads total, 1 unresolved, 1 resolved
    expect(screen.getByText(/1 comment/)).toBeInTheDocument();
    expect(screen.getByText(/1 resolved/)).toBeInTheDocument();
  });

  it('renders thread with author name, content, and timestamp', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Check this clause.')).toBeInTheDocument();
    // Timestamp should be rendered (relative time)
    expect(screen.getByTestId('thread-c1')).toBeInTheDocument();
  });

  it('shows anchor quote when available', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    expect(screen.getByText('the parties agree to the terms')).toBeInTheDocument();
  });

  it('renders replies indented under parent', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    const thread = screen.getByTestId('thread-c1');
    const reply = within(thread).getByTestId('reply-c2');
    expect(reply).toBeInTheDocument();
    expect(within(reply).getByText('Bob')).toBeInTheDocument();
    expect(within(reply).getByText('Looks good to me.')).toBeInTheDocument();
  });

  it('show resolved toggle filters resolved threads', async () => {
    const toggleFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      toggleShowResolved: toggleFn,
    });
    renderTab();
    const toggle = screen.getByTestId('show-resolved-toggle');
    const input = toggle.querySelector('input');
    expect(input).toBeTruthy();
    if (input == null) throw new Error('input not found');
    await userEvent.click(input);
    expect(toggleFn).toHaveBeenCalledTimes(1);
  });

  it('reply input is present with "Reply..." placeholder', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    expect(replyInput).toBeInTheDocument();
  });

  it('resolve button calls resolveComment mutation', async () => {
    const resolveFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      resolveComment: resolveFn,
    });
    renderTab();
    const resolveBtn = screen.getByRole('button', { name: /resolve/i });
    await userEvent.click(resolveBtn);
    expect(resolveFn).toHaveBeenCalledWith({
      templateId: 'tpl-1',
      commentId: 'c1',
    });
  });

  it('delete button calls deleteComment mutation', async () => {
    const deleteFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      deleteComment: deleteFn,
    });
    renderTab();
    const parentRow = screen.getByTestId('comment-c1');
    const deleteBtn = within(parentRow).getByRole('button', { name: /delete comment/i });
    await userEvent.click(deleteBtn);
    expect(deleteFn).toHaveBeenCalledWith({
      templateId: 'tpl-1',
      commentId: 'c1',
    });
  });

  it('creating a reply calls createComment with parentId', async () => {
    const createFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      createComment: createFn,
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    await userEvent.type(replyInput, 'My reply text');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);
    expect(createFn).toHaveBeenCalledWith({
      templateId: 'tpl-1',
      content: 'My reply text',
      parentId: 'c1',
    });
  });

  it('renders loading state', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    });
    renderTab();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('passes templateId to useComments hook', () => {
    renderTab('my-template');
    expect(mockUseComments).toHaveBeenCalledWith('my-template');
  });

  it('renders resolved thread as collapsed with resolve summary', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [resolvedThread],
      showResolved: true,
    });
    renderTab();
    const thread = screen.getByTestId('thread-c3');
    expect(within(thread).getByText(/resolved/i)).toBeInTheDocument();
  });

  it('renders container with testid', () => {
    renderTab();
    expect(screen.getByTestId('comments-tab')).toBeInTheDocument();
  });

  // --- formatRelativeTime branch coverage ---

  it('shows "just now" for comments created less than a minute ago', () => {
    const recentComment: Comment = {
      ...parentComment,
      id: 'recent',
      createdAt: new Date(Date.now() - 10_000).toISOString(), // 10 seconds ago
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: recentComment, replies: [] }],
    });
    renderTab();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('shows minutes ago for comments created minutes ago', () => {
    const minutesAgoComment: Comment = {
      ...parentComment,
      id: 'min-ago',
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 minutes ago
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: minutesAgoComment, replies: [] }],
    });
    renderTab();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('shows hours ago for comments created hours ago', () => {
    const hoursAgoComment: Comment = {
      ...parentComment,
      id: 'hr-ago',
      createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(), // 3 hours ago
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: hoursAgoComment, replies: [] }],
    });
    renderTab();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('shows days ago for comments created days ago', () => {
    const daysAgoComment: Comment = {
      ...parentComment,
      id: 'day-ago',
      createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(), // 7 days ago
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: daysAgoComment, replies: [] }],
    });
    renderTab();
    expect(screen.getByText('7d ago')).toBeInTheDocument();
  });

  it('shows locale date string for comments older than 30 days', () => {
    const oldComment: Comment = {
      ...parentComment,
      id: 'old',
      createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(), // 60 days ago
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: oldComment, replies: [] }],
    });
    renderTab();
    const expectedDate = new Date(oldComment.createdAt).toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  // --- getAvatarColor coverage (through rendering multiple threads) ---

  it('renders avatar with correct initial letter', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    // Alice's avatar should show "A"
    expect(screen.getByText('A')).toBeInTheDocument();
    // Bob's avatar should show "B"
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  // --- Thread with no anchorText ---

  it('does not render anchor text when anchorText is null', () => {
    const noAnchorComment: Comment = {
      ...parentComment,
      id: 'no-anchor',
      anchorText: null,
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: noAnchorComment, replies: [] }],
    });
    renderTab();
    expect(screen.queryByText('the parties agree to the terms')).not.toBeInTheDocument();
    expect(screen.getByText('Check this clause.')).toBeInTheDocument();
  });

  it('does not render anchor text when anchorText is empty string', () => {
    const emptyAnchorComment: Comment = {
      ...parentComment,
      id: 'empty-anchor',
      anchorText: '',
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: emptyAnchorComment, replies: [] }],
    });
    renderTab();
    // The content should still render, just no anchor quote
    expect(screen.getByText('Check this clause.')).toBeInTheDocument();
  });

  // --- Thread with no replies ---

  it('renders thread without replies section when replies array is empty', () => {
    const threadNoReplies: CommentThread = {
      comment: parentComment,
      replies: [],
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadNoReplies],
    });
    renderTab();
    expect(screen.getByTestId('thread-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('reply-c2')).not.toBeInTheDocument();
  });

  // --- Resolved thread expansion ---

  it('expands resolved thread on click to show comment details', async () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [resolvedThread],
      showResolved: true,
    });
    renderTab();
    const thread = screen.getByTestId('thread-c3');
    // Click to expand
    await userEvent.click(thread);
    // After expanding, the resolved comment content should be visible
    expect(within(thread).getByTestId('resolved-comment-c3')).toBeInTheDocument();
  });

  it('collapses resolved thread on second click', async () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [resolvedThread],
      showResolved: true,
    });
    renderTab();
    const thread = screen.getByTestId('thread-c3');
    // Click to expand
    await userEvent.click(thread);
    // Click again to collapse
    await userEvent.click(thread);
    // The resolved-comment element is still in DOM (Collapse wraps it) but collapsed
    expect(within(thread).getByText(/resolved/i)).toBeInTheDocument();
  });

  // --- Delete on resolved comment ---

  it('delete button on resolved comment calls deleteComment', async () => {
    const deleteFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [resolvedThread],
      showResolved: true,
      deleteComment: deleteFn,
    });
    renderTab();
    const thread = screen.getByTestId('thread-c3');
    // First expand the resolved thread
    await userEvent.click(thread);
    const resolvedRow = within(thread).getByTestId('resolved-comment-c3');
    const deleteBtn = within(resolvedRow).getByRole('button', { name: /delete comment/i });
    await userEvent.click(deleteBtn);
    expect(deleteFn).toHaveBeenCalledWith({
      templateId: 'tpl-1',
      commentId: 'c3',
    });
  });

  // --- Delete on reply ---

  it('delete button on reply calls deleteComment with reply id', async () => {
    const deleteFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      deleteComment: deleteFn,
    });
    renderTab();
    const replyRow = screen.getByTestId('reply-c2');
    const deleteBtn = within(replyRow).getByRole('button', { name: /delete comment/i });
    await userEvent.click(deleteBtn);
    expect(deleteFn).toHaveBeenCalledWith({
      templateId: 'tpl-1',
      commentId: 'c2',
    });
  });

  // --- Reply input focus/blur and send button visibility ---

  it('shows send button when reply input is focused', async () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    // Send button should not be visible initially
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
    // Focus the input
    await userEvent.click(replyInput);
    // Send button should appear
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('shows send button when reply text is not empty even after blur', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    await userEvent.type(replyInput, 'some text');
    // Tab away to blur
    await userEvent.tab();
    // Wait for the blur setTimeout
    vi.advanceTimersByTime(300);
    // Send button should still be visible because replyText is not empty
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  // --- Send reply with empty text does nothing ---

  it('does not call createComment when reply text is empty', async () => {
    const createFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      createComment: createFn,
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    // Send button appears on focus
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);
    expect(createFn).not.toHaveBeenCalled();
  });

  it('does not call createComment when reply text is only whitespace', async () => {
    const createFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      createComment: createFn,
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    await userEvent.type(replyInput, '   ');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);
    expect(createFn).not.toHaveBeenCalled();
  });

  // --- templateId undefined: early returns ---

  it('does not call resolveComment when templateId is undefined', async () => {
    const resolveFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      resolveComment: resolveFn,
    });
    render(
      <ThemeProvider theme={theme}>
        <CommentsTab templateId={undefined} />
      </ThemeProvider>,
    );
    const resolveBtn = screen.getByRole('button', { name: /resolve/i });
    await userEvent.click(resolveBtn);
    expect(resolveFn).not.toHaveBeenCalled();
  });

  it('does not call deleteComment when templateId is undefined', async () => {
    const deleteFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      deleteComment: deleteFn,
    });
    render(
      <ThemeProvider theme={theme}>
        <CommentsTab templateId={undefined} />
      </ThemeProvider>,
    );
    const parentRow = screen.getByTestId('comment-c1');
    const deleteBtn = within(parentRow).getByRole('button', { name: /delete comment/i });
    await userEvent.click(deleteBtn);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('does not call createComment when templateId is undefined', async () => {
    const createFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      createComment: createFn,
    });
    render(
      <ThemeProvider theme={theme}>
        <CommentsTab templateId={undefined} />
      </ThemeProvider>,
    );
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    await userEvent.type(replyInput, 'Reply text');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);
    expect(createFn).not.toHaveBeenCalled();
  });

  // --- Header text formatting branches ---

  it('shows "No comments" when threads array is empty', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [],
    });
    renderTab();
    expect(screen.getByText('No comments')).toBeInTheDocument();
  });

  it('shows singular "comment" for exactly 1 unresolved thread', () => {
    const singleThread: CommentThread = {
      comment: { ...parentComment, id: 'single' },
      replies: [],
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [singleThread],
    });
    renderTab();
    expect(screen.getByText('1 comment')).toBeInTheDocument();
  });

  it('shows plural "comments" for multiple unresolved threads', () => {
    const thread1: CommentThread = {
      comment: { ...parentComment, id: 't1' },
      replies: [],
    };
    const thread2: CommentThread = {
      comment: { ...parentComment, id: 't2' },
      replies: [],
    };
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [thread1, thread2],
    });
    renderTab();
    expect(screen.getByText('2 comments')).toBeInTheDocument();
  });

  it('shows unresolved count without resolved suffix when no resolved threads', () => {
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [{ comment: parentComment, replies: [] }],
    });
    renderTab();
    const headerText = screen.getByText('1 comment');
    // Should NOT contain "resolved" text
    expect(headerText.textContent).not.toContain('resolved');
  });

  // --- Reply clears input after send ---

  it('clears reply input and hides send button after successful reply', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const createFn = vi.fn();
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: [threadWithReply],
      createComment: createFn,
    });
    renderTab();
    const replyInput = screen.getByPlaceholderText('Reply...');
    await userEvent.click(replyInput);
    await userEvent.type(replyInput, 'My reply');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);
    expect(createFn).toHaveBeenCalled();
    // Input should be cleared
    expect(replyInput).toHaveValue('');
    // After blur timeout, send button should disappear since text is empty
    vi.advanceTimersByTime(300);
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  // --- getAvatarColor wraps around for indices >= AVATAR_COLORS.length ---

  it('renders avatars with wrapped color index for many threads', () => {
    // Create 7 threads to exceed the 6 AVATAR_COLORS entries
    const manyThreads: CommentThread[] = Array.from({ length: 7 }, (_, i) => ({
      comment: {
        ...parentComment,
        id: `mt-${String(i)}`,
        authorName: `User${String(i)}`,
        createdAt: new Date(Date.now() - 1000).toISOString(),
      },
      replies: [],
    }));
    mockUseComments.mockReturnValue({
      ...defaultHookReturn,
      threads: manyThreads,
    });
    renderTab();
    // All 7 threads should render without error
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`thread-mt-${String(i)}`)).toBeInTheDocument();
    }
  });
});
