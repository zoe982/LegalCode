import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '../services/comments.js';
import type { Comment, CommentThread, CreateCommentInput } from '../types/comments.js';

function groupIntoThreads(comments: Comment[], showResolved: boolean): CommentThread[] {
  const topLevel = comments.filter((c) => c.parentId === null);
  const replyMap = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (comment.parentId === null) continue;
    const pid = comment.parentId;
    const existing = replyMap.get(pid) ?? [];
    existing.push(comment);
    replyMap.set(pid, existing);
  }

  // Sort replies within each thread by createdAt ascending
  for (const [, threadReplies] of replyMap) {
    threadReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const threads: CommentThread[] = topLevel.map((comment) => ({
    comment,
    replies: replyMap.get(comment.id) ?? [],
  }));

  // Filter resolved threads unless showResolved is true
  const filtered = showResolved ? threads : threads.filter((t) => !t.comment.resolved);

  // Sort threads by createdAt ascending
  filtered.sort(
    (a, b) => new Date(a.comment.createdAt).getTime() - new Date(b.comment.createdAt).getTime(),
  );

  return filtered;
}

export interface UseCommentsOptions {
  onCreateError?: (() => void) | undefined;
  onResolveError?: (() => void) | undefined;
  onDeleteError?: (() => void) | undefined;
}

export function useComments(templateId: string | undefined, options?: UseCommentsOptions) {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const id = templateId ?? '';

  const query = useQuery({
    queryKey: ['comments', templateId],
    queryFn: () => commentService.getComments(id),
    enabled: id !== '',
  });

  const threads = useMemo(
    () => groupIntoThreads(query.data ?? [], showResolved),
    [query.data, showResolved],
  );

  const createMutation = useMutation({
    mutationFn: (input: CreateCommentInput) => commentService.createComment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', templateId] });
    },
    onError: () => {
      options?.onCreateError?.();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ templateId: tId, commentId }: { templateId: string; commentId: string }) =>
      commentService.resolveComment(tId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', templateId] });
    },
    onError: () => {
      options?.onResolveError?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ templateId: tId, commentId }: { templateId: string; commentId: string }) =>
      commentService.deleteComment(tId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', templateId] });
    },
    onError: () => {
      options?.onDeleteError?.();
    },
  });

  const toggleShowResolved = useCallback(() => {
    setShowResolved((prev) => !prev);
  }, []);

  return {
    threads,
    isLoading: query.isLoading,
    isCreating: createMutation.isPending,
    createComment: createMutation.mutate,
    resolveComment: resolveMutation.mutate,
    deleteComment: deleteMutation.mutate,
    showResolved,
    toggleShowResolved,
  };
}
