import { Box } from '@mui/material';
import { useCallback } from 'react';

export interface CommentIndicatorProps {
  /** Whether the comment is resolved */
  resolved: boolean;
  /** Comment thread ID */
  commentId: string;
  /** Called when the indicator is clicked */
  onClick: (commentId: string) => void;
  /** Vertical position from top of parent */
  top: number;
}

export function CommentIndicator({ resolved, commentId, onClick, top }: CommentIndicatorProps) {
  const handleClick = useCallback(() => {
    onClick(commentId);
  }, [onClick, commentId]);

  return (
    <Box
      data-testid={`comment-indicator-${commentId}`}
      aria-label="Go to comment"
      onClick={handleClick}
      sx={{
        position: 'absolute',
        top: `${String(top)}px`,
        right: '-24px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: resolved ? '#9B9DB0' : '#D97706',
        cursor: 'pointer',
      }}
    />
  );
}
