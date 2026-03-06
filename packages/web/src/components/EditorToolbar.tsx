import { Box, Button, IconButton, Typography } from '@mui/material';
import TitleOutlined from '@mui/icons-material/TitleOutlined';
import FormatBoldOutlined from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlined from '@mui/icons-material/FormatItalicOutlined';
import InsertLinkOutlined from '@mui/icons-material/InsertLinkOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import { ConnectionStatus } from './ConnectionStatus.js';
import type { ConnectionStatusType } from './ConnectionStatus.js';

interface EditorToolbarProps {
  mode: 'source' | 'review';
  onModeChange: (mode: 'source' | 'review') => void;
  wordCount: number;
  connectionStatus?: ConnectionStatusType | undefined;
  readOnly?: boolean | undefined;
}

const activeButtonStyle = {
  backgroundColor: '#8027FF',
  color: '#fff',
  borderRadius: '8px',
  fontSize: '0.8125rem',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#8027FF',
  },
} as const;

const inactiveButtonStyle = {
  backgroundColor: 'transparent',
  color: '#451F61',
  borderRadius: '8px',
  fontSize: '0.8125rem',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: 'transparent',
  },
} as const;

const helperButtonStyle = {
  color: '#6B5A7A',
  '&:hover': {
    color: '#451F61',
  },
} as const;

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  onModeChange,
  wordCount,
  connectionStatus,
  readOnly,
}) => {
  const showMarkdownHelpers = mode === 'source' && !readOnly;

  return (
    <Box
      data-testid="editor-toolbar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        backgroundColor: '#F7F0E6',
        borderBottom: '1px solid',
        borderColor: '#D4C5B3',
      }}
    >
      {/* Left: Mode toggle */}
      <Box
        sx={{
          backgroundColor: '#E6D9C6',
          borderRadius: '10px',
          padding: '2px',
          display: 'inline-flex',
        }}
      >
        <Button
          size="small"
          sx={mode === 'source' ? activeButtonStyle : inactiveButtonStyle}
          onClick={() => {
            onModeChange('source');
          }}
        >
          Source
        </Button>
        <Button
          size="small"
          sx={mode === 'review' ? activeButtonStyle : inactiveButtonStyle}
          onClick={() => {
            onModeChange('review');
          }}
        >
          Review
        </Button>
      </Box>

      {/* Center: Markdown helper buttons */}
      {showMarkdownHelpers && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton aria-label="Heading" sx={helperButtonStyle}>
            <TitleOutlined />
          </IconButton>
          <IconButton aria-label="Bold" sx={helperButtonStyle}>
            <FormatBoldOutlined />
          </IconButton>
          <IconButton aria-label="Italic" sx={helperButtonStyle}>
            <FormatItalicOutlined />
          </IconButton>
          <IconButton aria-label="Link" sx={helperButtonStyle}>
            <InsertLinkOutlined />
          </IconButton>
          <IconButton aria-label="List" sx={helperButtonStyle}>
            <FormatListBulletedOutlined />
          </IconButton>
          <IconButton aria-label="Table" sx={helperButtonStyle}>
            <TableChartOutlined />
          </IconButton>
        </Box>
      )}

      {/* Right: Word count + Connection status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#9A8DA6',
          }}
        >
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </Typography>
        {connectionStatus != null && <ConnectionStatus status={connectionStatus} />}
      </Box>
    </Box>
  );
};
