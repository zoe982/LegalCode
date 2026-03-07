import { Box } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';

export interface FloatingCommentButtonProps {
  /** The position to render the button at */
  position: { top: number; left: number } | null;
  /** Whether the button is visible */
  visible: boolean;
  /** Called when the button is clicked */
  onClick: () => void;
}

export function FloatingCommentButton({ position, visible, onClick }: FloatingCommentButtonProps) {
  if (!visible || position === null) {
    return null;
  }

  return (
    <Box
      component="button"
      data-testid="floating-comment-button"
      aria-label="Add comment"
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: `${String(position.top)}px`,
        left: `${String(position.left)}px`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: '#8027FF',
        lineHeight: 1,
        transition: 'opacity 150ms ease',
        '&:hover': {
          backgroundColor: 'rgba(128, 39, 255, 0.06)',
        },
      }}
    >
      <ChatBubbleOutlineRoundedIcon sx={{ fontSize: '18px', color: '#8027FF' }} />
      Comment
    </Box>
  );
}
