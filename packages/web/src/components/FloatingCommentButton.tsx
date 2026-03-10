import { Box } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';

export interface FloatingCommentButtonProps {
  /** The vertical position (top offset in px) to render the button at */
  top: number | null;
  /** Whether the button is visible */
  visible: boolean;
  /** Called when the button is clicked */
  onClick: () => void;
}

export function FloatingCommentButton({ top, visible, onClick }: FloatingCommentButtonProps) {
  if (!visible || top === null) {
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
        top: `${String(top)}px`,
        left: '100%',
        ml: 1.5,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        borderRadius: '50%',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.07)',
        cursor: 'pointer',
        color: '#8027FF',
        transition: 'opacity 150ms ease',
        '&:hover': {
          backgroundColor: 'rgba(128, 39, 255, 0.06)',
        },
      }}
    >
      <ChatBubbleOutlineRoundedIcon sx={{ fontSize: '16px', color: '#8027FF' }} />
    </Box>
  );
}
