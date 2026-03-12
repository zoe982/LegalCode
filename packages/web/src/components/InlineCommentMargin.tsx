import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { Box, Button } from '@mui/material';
import type { CommentThread } from '../types/comments.js';
import { useCommentPositions } from '../hooks/useCommentPositions.js';
import { InlineCommentCard } from './InlineCommentCard.js';
import { NewCommentCard } from './NewCommentCard.js';

const PENDING_COMMENT_ID = '__pending__';

export interface InlineCommentMarginProps {
  threads: CommentThread[];
  contentRef: React.RefObject<HTMLElement | null>;
  activeCommentId?: string | null;
  onCommentClick?: (commentId: string) => void;
  templateId?: string | undefined;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  pendingAnchor?: { anchorText: string } | null | undefined;
  onSubmitComment?: ((content: string) => void) | undefined;
  onCancelComment?: (() => void) | undefined;
  authorName?: string | undefined;
  authorEmail?: string | undefined;
  isCreating?: boolean | undefined;
  pendingCommentTop?: number | undefined;
}

export function InlineCommentMargin({
  threads,
  contentRef,
  activeCommentId,
  onCommentClick,
  onResolve,
  onDelete,
  onReply,
  pendingAnchor,
  onSubmitComment,
  onCancelComment,
  authorName,
  authorEmail,
  isCreating,
  pendingCommentTop,
}: InlineCommentMarginProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [cardHeights, setCardHeights] = useState<Map<string, number>>(new Map());
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const elementToIdRef = useRef<WeakMap<Element, string>>(new WeakMap());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const resolvedCount = useMemo(() => threads.filter((t) => t.comment.resolved).length, [threads]);

  const visibleThreads = useMemo(
    () => (showResolved ? threads : threads.filter((t) => !t.comment.resolved)),
    [threads, showResolved],
  );

  const commentIds = useMemo(() => {
    const ids = visibleThreads.map((t) => t.comment.id);
    if (pendingAnchor != null) ids.push(PENDING_COMMENT_ID);
    return ids;
  }, [visibleThreads, pendingAnchor]);

  const pendingPos =
    pendingAnchor != null && pendingCommentTop != null
      ? { id: PENDING_COMMENT_ID, top: pendingCommentTop }
      : null;
  const positions = useCommentPositions(contentRef, commentIds, cardHeights, pendingPos);

  // Measure card heights after render (initial synchronous measurement)
  useLayoutEffect(() => {
    const newHeights = new Map<string, number>();
    for (const thread of visibleThreads) {
      const el = cardRefs.current.get(thread.comment.id);
      if (el != null) {
        newHeights.set(thread.comment.id, el.offsetHeight);
      }
    }
    setCardHeights(newHeights);
  }, [visibleThreads]);

  // Initialize ResizeObserver for per-card height tracking
  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const updates = new Map<string, number>();
      for (const entry of entries) {
        const commentId = elementToIdRef.current.get(entry.target);
        if (commentId != null) {
          const height = (entry.target as HTMLElement).offsetHeight;
          updates.set(commentId, height);
        }
      }
      if (updates.size > 0) {
        setCardHeights((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [id, h] of updates) {
            if (prev.get(id) !== h) {
              next.set(id, h);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    });
    resizeObserverRef.current = observer;
    return () => {
      observer.disconnect();
    };
  }, []);

  const setCardRef = useCallback((commentId: string, el: HTMLElement | null) => {
    const observer = resizeObserverRef.current;
    if (el != null) {
      cardRefs.current.set(commentId, el);
      elementToIdRef.current.set(el, commentId);
      observer?.observe(el);
    } else {
      const prevEl = cardRefs.current.get(commentId);
      if (prevEl != null) {
        observer?.unobserve(prevEl);
        elementToIdRef.current.delete(prevEl);
      }
      cardRefs.current.delete(commentId);
    }
  }, []);

  const handleToggleResolved = () => {
    setShowResolved((prev) => !prev);
  };

  return (
    <Box
      role="complementary"
      aria-label="Comments"
      sx={{
        position: 'absolute',
        top: 0,
        left: '100%',
        ml: 3,
        width: 320,
        display: 'block',
        '@media (max-width: 1199px)': { display: 'none' },
      }}
    >
      {/* Comment cards */}
      <Box sx={{ position: 'relative', minHeight: 100 }}>
        {visibleThreads.map((thread, idx) => {
          const pos = positions.find((p) => p.commentId === thread.comment.id);
          const top = pos?.top ?? idx * 100;
          const isActive = activeCommentId != null && activeCommentId === thread.comment.id;
          const commentId = thread.comment.id;

          return (
            <Box
              key={commentId}
              ref={(el: HTMLElement | null) => {
                setCardRef(commentId, el);
              }}
              onClick={() => {
                onCommentClick?.(commentId);
              }}
              sx={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                transition: 'top 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <InlineCommentCard
                thread={thread}
                threadIndex={idx}
                onResolve={onResolve}
                onDelete={onDelete}
                onReply={onReply}
                isActive={isActive}
              />
            </Box>
          );
        })}

        {/* New comment card — inside same container for collision resolution */}
        {pendingAnchor != null &&
          onSubmitComment != null &&
          onCancelComment != null &&
          (() => {
            const pos = positions.find((p) => p.commentId === PENDING_COMMENT_ID);
            const top = pos?.top ?? pendingCommentTop ?? 0;
            return (
              <Box
                key={PENDING_COMMENT_ID}
                ref={(el: HTMLElement | null) => {
                  setCardRef(PENDING_COMMENT_ID, el);
                }}
                style={{ position: 'absolute', top, left: 0, right: 0 }}
                sx={{
                  transition: 'top 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <NewCommentCard
                  anchorText={pendingAnchor.anchorText}
                  onSubmit={onSubmitComment}
                  onCancel={onCancelComment}
                  authorName={authorName}
                  authorEmail={authorEmail}
                  isCreating={isCreating}
                />
              </Box>
            );
          })()}
      </Box>

      {/* Show resolved toggle */}
      {resolvedCount > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            onClick={handleToggleResolved}
            aria-label={showResolved ? 'Hide resolved' : `Show resolved (${String(resolvedCount)})`}
            sx={{
              fontSize: '0.75rem',
              color: '#6B6D82',
              fontFamily: '"DM Sans", sans-serif',
              textTransform: 'none',
            }}
          >
            {showResolved ? 'Hide resolved' : `Show resolved (${String(resolvedCount)})`}
          </Button>
        </Box>
      )}
    </Box>
  );
}
