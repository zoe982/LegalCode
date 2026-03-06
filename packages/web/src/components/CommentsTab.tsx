import { Box, Typography } from '@mui/material';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';

interface CommentsTabProps {
  templateId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- templateId will be used when comment backend is implemented
export function CommentsTab({ templateId }: CommentsTabProps) {
  return (
    <Box
      data-testid="comments-tab"
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 1,
      }}
    >
      <ChatBubbleOutline sx={{ fontSize: 48, color: '#9A8DA6' }} />
      <Typography
        sx={{
          fontSize: '1rem',
          color: '#451F61',
          fontWeight: 600,
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
        }}
      >
        No comments yet
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: '#9A8DA6' }}>
        Comments and annotations will appear here
      </Typography>
    </Box>
  );
}
