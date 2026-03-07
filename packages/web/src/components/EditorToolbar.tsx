import { Box, Button, IconButton, Typography } from '@mui/material';
import TitleOutlined from '@mui/icons-material/TitleOutlined';
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
  borderRadius: '6px',
  fontSize: '0.8125rem',
  fontFamily: '"DM Sans", sans-serif',
  position: 'relative' as const,
  zIndex: 1,
  padding: '6px 16px',
  minWidth: 'auto',
  textTransform: 'none' as const,
  '&:hover': {
    backgroundColor: 'transparent',
  },
} as const;

const helperButtonStyle = {
  width: '32px',
  height: '32px',
  color: 'var(--text-secondary)',
  borderRadius: '6px',
  '&:hover': {
    backgroundColor: 'var(--surface-tertiary)',
    color: 'var(--text-primary)',
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
        height: '44px',
        backgroundColor: 'var(--surface-primary)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      {/* Left: Mode toggle */}
      <Box
        sx={{
          backgroundColor: 'var(--surface-tertiary)',
          borderRadius: '8px',
          padding: '3px',
          display: 'inline-flex',
          position: 'relative',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Sliding pill indicator */}
        <Box
          data-testid="mode-toggle-indicator"
          sx={{
            position: 'absolute',
            top: '3px',
            bottom: '3px',
            width: '50%',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-xs)',
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
            color: mode === 'source' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: mode === 'source' ? 600 : 500,
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
            color: mode === 'review' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: mode === 'review' ? 600 : 500,
          }}
          onClick={() => {
            onModeChange('review');
          }}
        >
          Review
        </Button>
      </Box>

      {/* Center: Markdown helper buttons — Bold/Italic removed in v3 */}
      {showMarkdownHelpers && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            aria-label="Heading"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('## ', '');
            }}
          >
            <TitleOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Link"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('[', '](url)');
            }}
          >
            <InsertLinkOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Ordered List"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('1. ', '');
            }}
          >
            <FormatListNumberedOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="List"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('- ', '');
            }}
          >
            <FormatListBulletedOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Table"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('| Header | Header |\n| --- | --- |\n| Cell | Cell |', '');
            }}
          >
            <TableChartOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Clause Reference"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('{{clause:', '}}');
            }}
          >
            <BookmarkBorderOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Variable"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('{{var:', '}}');
            }}
          >
            <CodeOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Horizontal Rule"
            sx={helperButtonStyle}
            onClick={() => {
              onInsertMarkdown?.('\n---\n', '');
            }}
          >
            <HorizontalRuleOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
        </Box>
      )}

      {/* Right: Word count + Connection status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
          }}
        >
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </Typography>
        {connectionStatus != null && <ConnectionStatus status={connectionStatus} />}
      </Box>
    </Box>
  );
};
