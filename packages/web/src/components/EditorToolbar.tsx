import { useState } from 'react';
import { Box, Button, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleOutlined from '@mui/icons-material/TitleOutlined';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import InsertLinkOutlined from '@mui/icons-material/InsertLinkOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import FormatListNumberedOutlined from '@mui/icons-material/FormatListNumberedOutlined';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import HorizontalRuleOutlined from '@mui/icons-material/HorizontalRuleOutlined';
import AutoFixHighOutlined from '@mui/icons-material/AutoFixHighOutlined';
import UndoRounded from '@mui/icons-material/UndoRounded';
import RedoRounded from '@mui/icons-material/RedoRounded';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
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
import { FirstUseTooltip } from './FirstUseTooltip.js';

interface EditorToolbarProps {
  mode: 'edit' | 'source';
  wordCount: number;
  readOnly?: boolean | undefined;
  onInsertMarkdown?: ((prefix: string, suffix?: string) => void) | undefined;
  crepeRef?: React.RefObject<Crepe | null> | undefined;
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  onImportCleanup?: (() => void) | undefined;
  outlineMode?: boolean | undefined;
  onToggleOutline?: (() => void) | undefined;
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

const headingMenuItems = [
  { label: 'Title', level: 1 as const, fontWeight: 700 },
  { label: 'Article (H1)', level: 1 as const, fontWeight: 600 },
  { label: 'Section (H2)', level: 2 as const, fontWeight: 600 },
  { label: 'Clause (H3)', level: 3 as const, fontWeight: 500 },
  { label: 'Sub-clause (H4)', level: 4 as const, fontWeight: 400 },
  { label: 'Paragraph (H5)', level: 5 as const, fontWeight: 400 },
  { label: 'Sub-paragraph (H6)', level: 6 as const, fontWeight: 400 },
  { label: 'Body text', level: 0 as const, fontWeight: 400, color: 'var(--text-secondary)' },
] as const;

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  wordCount,
  readOnly,
  onInsertMarkdown,
  crepeRef,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onImportCleanup,
  outlineMode,
  onToggleOutline,
}) => {
  const showMarkdownHelpers = mode === 'edit' && !readOnly;
  const [headingMenuAnchor, setHeadingMenuAnchor] = useState<HTMLElement | null>(null);

  const executeCommand = (commandFn: ReturnType<typeof callCommand>) => {
    crepeRef?.current?.editor.action(commandFn);
  };

  const handleHeadingButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setHeadingMenuAnchor(event.currentTarget);
  };

  const handleHeadingMenuClose = () => {
    setHeadingMenuAnchor(null);
  };

  const handleHeadingMenuItemClick = (level: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    executeCommand(callCommand(wrapInHeadingCommand.key, level));
    handleHeadingMenuClose();
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
            aria-label="Undo"
            sx={helperButtonStyle}
            disabled={canUndo === false}
            onClick={onUndo}
          >
            <UndoRounded sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Redo"
            sx={helperButtonStyle}
            disabled={canRedo === false}
            onClick={onRedo}
          >
            <RedoRounded sx={{ fontSize: '20px' }} />
          </IconButton>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, borderColor: 'var(--border-primary)' }}
          />
          <IconButton
            aria-label="Toggle Outline"
            sx={{
              ...helperButtonStyle,
              ...(outlineMode === true && {
                backgroundColor: 'var(--surface-tertiary)',
                color: 'var(--text-primary)',
              }),
            }}
            onClick={onToggleOutline}
          >
            <ListAltOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, borderColor: 'var(--border-primary)' }}
          />
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

          {/* Heading dropdown button */}
          <Button
            aria-label="Heading"
            aria-haspopup="true"
            aria-expanded={headingMenuAnchor !== null ? 'true' : undefined}
            onClick={handleHeadingButtonClick}
            sx={{
              ...helperButtonStyle,
              width: 'auto',
              minWidth: 'unset',
              px: '6px',
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <TitleOutlined sx={{ fontSize: '20px' }} />
            <KeyboardArrowDownRounded sx={{ fontSize: '14px' }} />
          </Button>
          <Menu
            anchorEl={headingMenuAnchor}
            open={headingMenuAnchor !== null}
            onClose={handleHeadingMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            {headingMenuItems.map((item) => (
              <MenuItem
                key={item.label}
                onClick={() => {
                  handleHeadingMenuItemClick(item.level);
                }}
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: item.fontWeight,
                  color: 'color' in item ? item.color : undefined,
                  py: 0.75,
                  px: 2,
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>

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
          <IconButton aria-label="Import Cleanup" sx={helperButtonStyle} onClick={onImportCleanup}>
            <AutoFixHighOutlined sx={{ fontSize: '20px' }} />
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
      </Box>
    </Box>
  );
};
