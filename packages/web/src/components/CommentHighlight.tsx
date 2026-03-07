import { Box } from '@mui/material';
import { useCallback } from 'react';

export interface CommentHighlightProps {
  /** The type of highlight to apply */
  status: 'unresolved' | 'resolved' | 'active';
  /** Comment thread ID for click handling */
  commentId: string;
  /** Called when the highlight is clicked */
  onClick: (commentId: string) => void;
  /** The text content to highlight */
  children: React.ReactNode;
}

const backgroundColors: Record<CommentHighlightProps['status'], string> = {
  unresolved: 'rgba(251, 191, 36, 0.2)',
  resolved: 'rgba(251, 191, 36, 0.06)',
  active: 'rgba(251, 191, 36, 0.33)',
};

const hoverColors: Record<CommentHighlightProps['status'], string> = {
  unresolved: 'rgba(251, 191, 36, 0.27)',
  resolved: 'rgba(251, 191, 36, 0.06)',
  active: 'rgba(251, 191, 36, 0.33)',
};

export function CommentHighlight({ status, commentId, onClick, children }: CommentHighlightProps) {
  const handleClick = useCallback(() => {
    onClick(commentId);
  }, [onClick, commentId]);

  return (
    <Box
      component="span"
      data-testid={`comment-highlight-${commentId}`}
      onClick={handleClick}
      sx={{
        backgroundColor: backgroundColors[status],
        cursor: 'pointer',
        transition: 'background-color 200ms ease',
        '&:hover': {
          backgroundColor: hoverColors[status],
        },
      }}
    >
      {children}
    </Box>
  );
}
