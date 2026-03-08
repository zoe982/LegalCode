import { Box, IconButton, Typography } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleOutlined from '@mui/icons-material/TitleOutlined';
import InsertLinkOutlined from '@mui/icons-material/InsertLinkOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import FormatListNumberedOutlined from '@mui/icons-material/FormatListNumberedOutlined';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import HorizontalRuleOutlined from '@mui/icons-material/HorizontalRuleOutlined';
import type { Crepe } from '@milkdown/crepe';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  insertHrCommand,
} from '@milkdown/kit/preset/commonmark';
import { callCommand } from '@milkdown/kit/utils';
import { ConnectionStatus } from './ConnectionStatus.js';
import type { ConnectionStatusType } from './ConnectionStatus.js';
import { FirstUseTooltip } from './FirstUseTooltip.js';

interface EditorToolbarProps {
  mode: 'source' | 'review';
  wordCount: number;
  connectionStatus?: ConnectionStatusType | undefined;
  readOnly?: boolean | undefined;
  onInsertMarkdown?: ((prefix: string, suffix?: string) => void) | undefined;
  crepeRef?: React.RefObject<Crepe | null> | undefined;
}

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
  wordCount,
  connectionStatus,
  readOnly,
  onInsertMarkdown,
  crepeRef,
}) => {
  const showMarkdownHelpers = mode === 'source' && !readOnly;

  const executeCommand = (commandFn: ReturnType<typeof callCommand>) => {
    crepeRef?.current?.editor.action(commandFn);
  };

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
      {/* Left: Markdown helper buttons */}
      {showMarkdownHelpers && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            aria-label="Bold"
            sx={helperButtonStyle}
            onClick={() => {
              executeCommand(callCommand(toggleStrongCommand.key));
            }}
          >
            <FormatBoldIcon sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Italic"
            sx={helperButtonStyle}
            onClick={() => {
              executeCommand(callCommand(toggleEmphasisCommand.key));
            }}
          >
            <FormatItalicIcon sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Heading"
            sx={helperButtonStyle}
            onClick={() => {
              executeCommand(callCommand(wrapInHeadingCommand.key, 2));
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
              executeCommand(callCommand(wrapInOrderedListCommand.key));
            }}
          >
            <FormatListNumberedOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="List"
            sx={helperButtonStyle}
            onClick={() => {
              executeCommand(callCommand(wrapInBulletListCommand.key));
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
              executeCommand(callCommand(insertHrCommand.key));
            }}
          >
            <HorizontalRuleOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
        </Box>
      )}

      {/* Right: Word count + Connection status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <FirstUseTooltip
          featureId="shortcuts"
          message="Press Cmd+/ to see keyboard shortcuts"
          placement="bottom"
        >
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
            }}
          >
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Typography>
        </FirstUseTooltip>
        {connectionStatus != null && <ConnectionStatus status={connectionStatus} />}
      </Box>
    </Box>
  );
};
