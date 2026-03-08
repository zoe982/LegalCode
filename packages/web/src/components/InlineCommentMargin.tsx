import { useState, useMemo } from 'react';
import { Box, IconButton, Button, Badge } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import type { CommentThread } from '../types/comments.js';
import { useCommentPositions } from '../hooks/useCommentPositions.js';
import { InlineCommentCard } from './InlineCommentCard.js';

export interface InlineCommentMarginProps {
  threads: CommentThread[];
  contentRef: React.RefObject<HTMLElement | null>;
  activeCommentId?: string | null;
  onCommentClick?: (commentId: string) => void;
  templateId?: string | undefined;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
}

export function InlineCommentMargin({
  threads,
  contentRef,
  activeCommentId,
  onCommentClick,
  onResolve,
  onDelete,
  onReply,
}: InlineCommentMarginProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const resolvedCount = useMemo(() => threads.filter((t) => t.comment.resolved).length, [threads]);

  const visibleThreads = useMemo(
    () => (showResolved ? threads : threads.filter((t) => !t.comment.resolved)),
    [threads, showResolved],
  );

  const commentIds = useMemo(() => visibleThreads.map((t) => t.comment.id), [visibleThreads]);

  const positions = useCommentPositions(contentRef, commentIds);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  const handleToggleResolved = () => {
    setShowResolved((prev) => !prev);
  };

  return (
    <Box
      role="complementary"
      aria-label="Comments"
      sx={{
        width: collapsed ? 0 : 280,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        overflow: collapsed ? 'hidden' : 'visible',
      }}
    >
      {/* Collapse/expand toggle */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, mb: 1 }}>
        <IconButton
          size="small"
          onClick={handleToggleCollapse}
          aria-label={collapsed ? 'Show comments' : 'Hide comments'}
          aria-expanded={!collapsed}
          sx={{ color: '#6B6D82' }}
        >
          {collapsed ? (
            <Badge badgeContent={visibleThreads.length} color="primary" max={99}>
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 20 }} />
            </Badge>
          ) : (
            <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </Box>

      {/* Comment cards */}
      {!collapsed && (
        <Box sx={{ position: 'relative', minHeight: 100 }}>
          {visibleThreads.map((thread, idx) => {
            const pos = positions.find((p) => p.commentId === thread.comment.id);
            const top = pos?.top ?? idx * 100;
            const isActive = activeCommentId != null && activeCommentId === thread.comment.id;
            const commentId = thread.comment.id;

            return (
              <Box
                key={commentId}
                onClick={() => {
                  onCommentClick?.(commentId);
                }}
                sx={{ position: 'absolute', top, left: 0, right: 0 }}
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
      )}

      {/* Show resolved toggle */}
      {!collapsed && resolvedCount > 0 && (
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
