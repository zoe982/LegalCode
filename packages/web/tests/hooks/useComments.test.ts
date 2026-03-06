import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useComments } from '../../src/hooks/useComments.js';
import type { Comment } from '../../src/types/comments.js';

const { getCommentsFn, createCommentFn, resolveCommentFn, deleteCommentFn } = vi.hoisted(() => ({
  getCommentsFn: vi.fn(),
  createCommentFn: vi.fn(),
  resolveCommentFn: vi.fn(),
  deleteCommentFn: vi.fn(),
}));

vi.mock('../../src/services/comments.js', () => ({
  commentService: {
    getComments: getCommentsFn,
    createComment: createCommentFn,
    resolveComment: resolveCommentFn,
    deleteComment: deleteCommentFn,
  },
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
  anchorText: 'the parties agree',
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useComments', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns threads grouped correctly (parent + replies)', async () => {
    getCommentsFn.mockResolvedValue([parentComment, replyComment, resolvedComment]);

    const { result } = renderHook(() => useComments('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have 2 top-level threads (c1 with reply, c3 standalone) — resolved filtered out by default
    expect(result.current.threads).toHaveLength(1);
    expect(result.current.threads[0]?.comment.id).toBe('c1');
    expect(result.current.threads[0]?.replies).toHaveLength(1);
    expect(result.current.threads[0]?.replies[0]?.id).toBe('c2');
  });

  it('does not fetch when templateId is undefined', () => {
    const { result } = renderHook(() => useComments(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(getCommentsFn).not.toHaveBeenCalled();
  });

  it('showResolved toggle includes resolved comments', async () => {
    getCommentsFn.mockResolvedValue([parentComment, replyComment, resolvedComment]);

    const { result } = renderHook(() => useComments('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default: resolved filtered out
    expect(result.current.threads).toHaveLength(1);
    expect(result.current.showResolved).toBe(false);

    // Toggle showResolved
    act(() => {
      result.current.toggleShowResolved();
    });

    expect(result.current.showResolved).toBe(true);
    expect(result.current.threads).toHaveLength(2);
  });

  it('createComment mutation works', async () => {
    getCommentsFn.mockResolvedValue([parentComment]);
    const newComment: Comment = {
      ...parentComment,
      id: 'c-new',
      content: 'New comment',
    };
    createCommentFn.mockResolvedValue(newComment);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useComments('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.createComment({
        templateId: 'tpl-1',
        content: 'New comment',
      });
    });

    await waitFor(() => {
      expect(createCommentFn).toHaveBeenCalledWith({
        templateId: 'tpl-1',
        content: 'New comment',
      });
    });
  });

  it('resolveComment mutation works', async () => {
    getCommentsFn.mockResolvedValue([parentComment]);
    resolveCommentFn.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useComments('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.resolveComment({ templateId: 'tpl-1', commentId: 'c1' });
    });

    await waitFor(() => {
      expect(resolveCommentFn).toHaveBeenCalledWith('tpl-1', 'c1');
    });
  });

  it('deleteComment mutation works', async () => {
    getCommentsFn.mockResolvedValue([parentComment]);
    deleteCommentFn.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useComments('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.deleteComment({ templateId: 'tpl-1', commentId: 'c1' });
    });

    await waitFor(() => {
      expect(deleteCommentFn).toHaveBeenCalledWith('tpl-1', 'c1');
    });
  });

  it('threads are ordered by createdAt', async () => {
    const olderComment: Comment = {
      ...parentComment,
      id: 'c-old',
      createdAt: '2026-01-01T00:00:00Z',
      anchorBlockId: null,
    };
    const newerComment: Comment = {
      ...parentComment,
      id: 'c-new',
      createdAt: '2026-03-01T00:00:00Z',
      anchorBlockId: null,
    };
    getCommentsFn.mockResolvedValue([newerComment, olderComment]);

    const { result } = renderHook(() => useComments('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0]?.comment.id).toBe('c-old');
    expect(result.current.threads[1]?.comment.id).toBe('c-new');
  });

  it('replies within a thread are ordered by createdAt', async () => {
    const reply1: Comment = {
      ...replyComment,
      id: 'r1',
      createdAt: '2026-03-01T03:00:00Z',
    };
    const reply2: Comment = {
      ...replyComment,
      id: 'r2',
      createdAt: '2026-03-01T01:00:00Z',
    };
    getCommentsFn.mockResolvedValue([parentComment, reply1, reply2]);

    const { result } = renderHook(() => useComments('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.threads[0]?.replies).toHaveLength(2);
    expect(result.current.threads[0]?.replies[0]?.id).toBe('r2');
    expect(result.current.threads[0]?.replies[1]?.id).toBe('r1');
  });
});
