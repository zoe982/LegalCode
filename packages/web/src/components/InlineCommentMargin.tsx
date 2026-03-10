import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { Box, Button } from '@mui/material';
import type { CommentThread } from '../types/comments.js';
import { useCommentPositions } from '../hooks/useCommentPositions.js';
import { InlineCommentCard } from './InlineCommentCard.js';
import { NewCommentCard } from './NewCommentCard.js';

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

  const resolvedCount = useMemo(() => threads.filter((t) => t.comment.resolved).length, [threads]);

  const visibleThreads = useMemo(
    () => (showResolved ? threads : threads.filter((t) => !t.comment.resolved)),
    [threads, showResolved],
  );

  const commentIds = useMemo(() => visibleThreads.map((t) => t.comment.id), [visibleThreads]);

  const positions = useCommentPositions(contentRef, commentIds, cardHeights);

  // Measure card heights after render
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

  const setCardRef = useCallback((commentId: string, el: HTMLElement | null) => {
    if (el != null) {
      cardRefs.current.set(commentId, el);
    } else {
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
        '@media (max-width: 1119px)': { display: 'none' },
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
      </Box>

      {/* New comment card */}
      {pendingAnchor != null && onSubmitComment != null && onCancelComment != null && (
        <Box sx={{ position: 'relative' }}>
          <NewCommentCard
            anchorText={pendingAnchor.anchorText}
            onSubmit={onSubmitComment}
            onCancel={onCancelComment}
            top={pendingCommentTop ?? 0}
            authorName={authorName}
            authorEmail={authorEmail}
            isCreating={isCreating}
          />
        </Box>
      )}

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
