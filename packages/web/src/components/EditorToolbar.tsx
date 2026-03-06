import { Box, Button, IconButton, Typography } from '@mui/material';
import TitleOutlined from '@mui/icons-material/TitleOutlined';
import FormatBoldOutlined from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlined from '@mui/icons-material/FormatItalicOutlined';
import InsertLinkOutlined from '@mui/icons-material/InsertLinkOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import FormatListNumberedOutlined from '@mui/icons-material/FormatListNumberedOutlined';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import HorizontalRuleOutlined from '@mui/icons-material/HorizontalRuleOutlined';
import { ConnectionStatus } from './ConnectionStatus.js';
import type { ConnectionStatusType } from './ConnectionStatus.js';

interface EditorToolbarProps {
  mode: 'source' | 'review';
  onModeChange: (mode: 'source' | 'review') => void;
  wordCount: number;
  connectionStatus?: ConnectionStatusType | undefined;
  readOnly?: boolean | undefined;
  onInsertMarkdown?: ((prefix: string, suffix?: string) => void) | undefined;
}

const modeButtonStyle = {
  backgroundColor: 'transparent',
  borderRadius: '8px',
  fontSize: '0.8125rem',
  fontWeight: 600,
  position: 'relative' as const,
  zIndex: 1,
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
  onInsertMarkdown,
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
          position: 'relative',
        }}
      >
        {/* Sliding pill indicator */}
        <Box
          data-testid="mode-toggle-indicator"
          sx={{
            position: 'absolute',
            top: '2px',
            bottom: '2px',
            width: '50%',
            backgroundColor: '#8027FF',
            borderRadius: '8px',
            transition: 'transform cubic-bezier(0.2, 0, 0, 1) 200ms',
          }}
          style={{
            transform: mode === 'source' ? 'translateX(0)' : 'translateX(100%)',
          }}
        />
        <Button
          size="small"
          sx={{
            ...modeButtonStyle,
            color: mode === 'source' ? '#fff' : '#451F61',
          }}
          onClick={() => {
            onModeChange('source');
          }}
        >
          Source
        </Button>
        <Button
          size="small"
          sx={{
            ...modeButtonStyle,
            color: mode === 'review' ? '#fff' : '#451F61',
          }}
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
          <IconButton
            aria-label="Heading"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('## ', '');
            }}
          >
            <TitleOutlined />
          </IconButton>
          <IconButton
            aria-label="Bold"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('**', '**');
            }}
          >
            <FormatBoldOutlined />
          </IconButton>
          <IconButton
            aria-label="Italic"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('*', '*');
            }}
          >
            <FormatItalicOutlined />
          </IconButton>
          <IconButton
            aria-label="Link"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('[', '](url)');
            }}
          >
            <InsertLinkOutlined />
          </IconButton>
          <IconButton
            aria-label="List"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('- ', '');
            }}
          >
            <FormatListBulletedOutlined />
          </IconButton>
          <IconButton
            aria-label="Ordered List"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('1. ', '');
            }}
          >
            <FormatListNumberedOutlined />
          </IconButton>
          <IconButton
            aria-label="Table"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('| Header | Header |\n| --- | --- |\n| Cell | Cell |', '');
            }}
          >
            <TableChartOutlined />
          </IconButton>
          <IconButton
            aria-label="Clause Reference"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('{{clause:', '}}');
            }}
          >
            <BookmarkBorderOutlined />
          </IconButton>
          <IconButton
            aria-label="Variable"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('{{var:', '}}');
            }}
          >
            <CodeOutlined />
          </IconButton>
          <IconButton
            aria-label="Horizontal Rule"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('\n---\n', '');
            }}
          >
            <HorizontalRuleOutlined />
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
