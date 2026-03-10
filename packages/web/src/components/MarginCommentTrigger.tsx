import { Box } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';

export interface MarginCommentTriggerProps {
  /** The vertical position (top offset in px) to render the trigger at */
  top: number | null;
  /** Whether the trigger is visible */
  visible: boolean;
  /** Called when the trigger is clicked */
  onClick: () => void;
}

export function MarginCommentTrigger({ top, visible, onClick }: MarginCommentTriggerProps) {
  if (!visible || top === null) {
    return null;
  }

  return (
    <Box
      component="button"
      data-testid="margin-comment-trigger"
      aria-label="Add comment"
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: `${String(top)}px`,
        left: 'calc(100% + 16px)',
        transform: 'translateY(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        padding: 0,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        borderRadius: '50%',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        '&:hover': {
          backgroundColor: '#F3F3F7',
          borderColor: '#D1D2DE',
          boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
          '& .trigger-icon': {
            color: '#12111A',
          },
        },
        '&:active': {
          backgroundColor: '#EDEDF2',
          borderColor: '#D1D2DE',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          '& .trigger-icon': {
            color: '#12111A',
          },
        },
        '&:focus-visible': {
          outline: '2px solid #8027FF',
          outlineOffset: '2px',
        },
      }}
    >
      <ChatBubbleOutlineRoundedIcon
        className="trigger-icon"
        sx={{ fontSize: '20px', color: '#6B6D82' }}
      />
    </Box>
  );
}
