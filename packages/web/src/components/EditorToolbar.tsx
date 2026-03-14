import { useState } from 'react';
import { Box, Button, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
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
import FormatIndentIncreaseOutlined from '@mui/icons-material/FormatIndentIncreaseOutlined';
import FormatIndentDecreaseOutlined from '@mui/icons-material/FormatIndentDecreaseOutlined';
import SortByAlphaOutlined from '@mui/icons-material/SortByAlphaOutlined';
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
import { editorViewCtx } from '@milkdown/kit/core';
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
  onIndentHeading?: (() => void) | undefined;
  onOutdentHeading?: (() => void) | undefined;
  onSourceWrap?: ((prefix: string, suffix?: string) => void) | undefined;
  onSourceLinePrefix?: ((prefix: string) => void) | undefined;
  onSourceBlock?: ((text: string) => void) | undefined;
  onLegalList?: ((listType: string) => void) | undefined;
  editingMode?: 'editing' | 'suggesting' | 'viewing';
  onEditingModeChange?: ((mode: 'editing' | 'suggesting' | 'viewing') => void) | undefined;
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
  { label: 'Title', level: 0 as const, fontWeight: 700, isTitle: true as const },
  { label: 'Article (H1)', level: 1 as const, fontWeight: 600, isTitle: false as const },
  { label: 'Section (H2)', level: 2 as const, fontWeight: 600, isTitle: false as const },
  { label: 'Clause (H3)', level: 3 as const, fontWeight: 500, isTitle: false as const },
  { label: 'Sub-clause (H4)', level: 4 as const, fontWeight: 400, isTitle: false as const },
  { label: 'Paragraph (H5)', level: 5 as const, fontWeight: 400, isTitle: false as const },
  { label: 'Sub-paragraph (H6)', level: 6 as const, fontWeight: 400, isTitle: false as const },
  {
    label: 'Body text',
    level: 0 as const,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    isTitle: false as const,
  },
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
  onIndentHeading,
  onOutdentHeading,
  onSourceWrap,
  onSourceLinePrefix,
  onSourceBlock,
  onLegalList,
  editingMode,
  onEditingModeChange,
}) => {
  const showMarkdownHelpers = !readOnly;
  const [headingMenuAnchor, setHeadingMenuAnchor] = useState<HTMLElement | null>(null);
  const [legalListMenuAnchor, setLegalListMenuAnchor] = useState<HTMLElement | null>(null);
  const [modeMenuAnchor, setModeMenuAnchor] = useState<HTMLElement | null>(null);

  const modeConfig = {
    editing: {
      icon: <EditOutlined sx={{ fontSize: '18px' }} />,
      label: 'Editing',
      description: 'Edit directly',
    },
    suggesting: {
      icon: <RateReviewOutlined sx={{ fontSize: '18px' }} />,
      label: 'Suggesting',
      description: 'Propose changes',
    },
    viewing: {
      icon: <VisibilityOutlined sx={{ fontSize: '18px' }} />,
      label: 'Viewing',
      description: 'Read only',
    },
  } as const;

  const currentMode = editingMode ?? 'editing';
  const current = modeConfig[currentMode];

  const executeCommand = (commandFn: ReturnType<typeof callCommand>) => {
    crepeRef?.current?.editor.action(commandFn);
  };

  const handleHeadingButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setHeadingMenuAnchor(event.currentTarget);
  };

  const handleHeadingMenuClose = () => {
    setHeadingMenuAnchor(null);
  };

  const legalListMenuItems = [
    { label: 'a, b, c', type: 'lower-alpha' },
    { label: 'A, B, C', type: 'upper-alpha' },
    { label: 'i, ii, iii', type: 'lower-roman' },
    { label: 'I, II, III', type: 'upper-roman' },
  ] as const;

  const handleLegalListButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setLegalListMenuAnchor(event.currentTarget);
  };

  const handleLegalListMenuClose = () => {
    setLegalListMenuAnchor(null);
  };

  const handleLegalListMenuItemClick = (listType: string) => {
    if (mode === 'source') {
      onLegalList?.(listType);
    }
    // Edit mode: no-op for now (command integration requires Milkdown command registration)
    handleLegalListMenuClose();
  };

  const handleHeadingMenuItemClick = (level: 0 | 1 | 2 | 3 | 4 | 5 | 6, isTitle: boolean) => {
    if (isTitle) {
      if (mode === 'source') {
        onSourceLinePrefix?.('% ');
      } else {
        crepeRef?.current?.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const { selection } = state;
          const titleType = state.schema.nodes.title;
          if (titleType) {
            const tr = state.tr.setBlockType(selection.from, selection.to, titleType);
            view.dispatch(tr);
          }
        });
      }
    } else if (mode === 'source') {
      if (level > 0) {
        onSourceLinePrefix?.('#'.repeat(level) + ' ');
      }
    } else {
      executeCommand(callCommand(wrapInHeadingCommand.key, level));
    }
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

          {/* Edit-only: Toggle Outline */}
          {mode === 'edit' && (
            <>
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
            </>
          )}

          <IconButton
            aria-label="Bold"
            sx={helperButtonStyle}
            onClick={() => {
              if (mode === 'source') {
                onSourceWrap?.('**', '**');
              } else {
                executeCommand(callCommand(toggleStrongCommand.key));
              }
            }}
          >
            <FormatBoldIcon sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton
            aria-label="Italic"
            sx={helperButtonStyle}
            onClick={() => {
              if (mode === 'source') {
                onSourceWrap?.('*', '*');
              } else {
                executeCommand(callCommand(toggleEmphasisCommand.key));
              }
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
                  handleHeadingMenuItemClick(item.level, item.isTitle);
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
              if (mode === 'source') {
                onSourceLinePrefix?.('1. ');
              } else {
                executeCommand(callCommand(wrapInOrderedListCommand.key));
              }
            }}
          >
            <FormatListNumberedOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
          {/* Legal List dropdown button */}
          <Button
            aria-label="Legal List"
            aria-haspopup="true"
            aria-expanded={legalListMenuAnchor !== null ? 'true' : undefined}
            onClick={handleLegalListButtonClick}
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
            <SortByAlphaOutlined sx={{ fontSize: '20px' }} />
            <KeyboardArrowDownRounded sx={{ fontSize: '14px' }} />
          </Button>
          <Menu
            anchorEl={legalListMenuAnchor}
            open={legalListMenuAnchor !== null}
            onClose={handleLegalListMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            {legalListMenuItems.map((item) => (
              <MenuItem
                key={item.type}
                onClick={() => {
                  handleLegalListMenuItemClick(item.type);
                }}
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8125rem',
                  py: 0.75,
                  px: 2,
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>

          <IconButton
            aria-label="List"
            sx={helperButtonStyle}
            onClick={() => {
              if (mode === 'source') {
                onSourceLinePrefix?.('- ');
              } else {
                executeCommand(callCommand(wrapInBulletListCommand.key));
              }
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

          {/* Edit-only: Import Cleanup, Outdent/Indent Heading */}
          {mode === 'edit' && (
            <>
              <IconButton
                aria-label="Import Cleanup"
                sx={helperButtonStyle}
                onClick={onImportCleanup}
              >
                <AutoFixHighOutlined sx={{ fontSize: '20px' }} />
              </IconButton>
              <IconButton
                aria-label="Outdent Heading"
                sx={helperButtonStyle}
                onClick={onOutdentHeading}
              >
                <FormatIndentDecreaseOutlined sx={{ fontSize: '20px' }} />
              </IconButton>
              <IconButton
                aria-label="Indent Heading"
                sx={helperButtonStyle}
                onClick={onIndentHeading}
              >
                <FormatIndentIncreaseOutlined sx={{ fontSize: '20px' }} />
              </IconButton>
            </>
          )}

          <IconButton
            aria-label="Horizontal Rule"
            sx={helperButtonStyle}
            onClick={() => {
              if (mode === 'source') {
                onSourceBlock?.('---');
              } else {
                executeCommand(callCommand(insertHrCommand.key));
              }
            }}
          >
            <HorizontalRuleOutlined sx={{ fontSize: '20px' }} />
          </IconButton>
        </Box>
      )}

      {/* Right: Mode selector + Word count */}
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

        {!readOnly && mode === 'edit' && onEditingModeChange != null && (
          <>
            <Button
              aria-label="Editing mode"
              aria-haspopup="true"
              aria-expanded={modeMenuAnchor !== null ? 'true' : undefined}
              onClick={(e) => {
                setModeMenuAnchor(e.currentTarget);
              }}
              sx={{
                height: '32px',
                px: '10px',
                borderRadius: '6px',
                border:
                  currentMode === 'suggesting'
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-primary)',
                backgroundColor:
                  currentMode === 'suggesting' ? 'rgba(128, 39, 255, 0.08)' : 'transparent',
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 500,
                minWidth: 'unset',
              }}
            >
              {current.icon}
              {current.label}
              <KeyboardArrowDownRounded sx={{ fontSize: '14px' }} />
            </Button>
            <Menu
              anchorEl={modeMenuAnchor}
              open={modeMenuAnchor !== null}
              onClose={() => {
                setModeMenuAnchor(null);
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { width: 200, borderRadius: '10px', mt: 0.5 } } }}
            >
              {(['editing', 'suggesting', 'viewing'] as const).map((m) => (
                <MenuItem
                  key={m}
                  selected={currentMode === m}
                  onClick={() => {
                    onEditingModeChange(m);
                    setModeMenuAnchor(null);
                  }}
                  sx={{
                    py: 1,
                    px: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        color:
                          currentMode === m ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {modeConfig[m].icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        fontFamily: '"DM Sans", sans-serif',
                        color: currentMode === m ? 'var(--text-primary)' : 'var(--text-body)',
                      }}
                    >
                      {modeConfig[m].label}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.6875rem',
                      fontFamily: '"DM Sans", sans-serif',
                      color: 'var(--text-tertiary)',
                      ml: '30px',
                    }}
                  >
                    {modeConfig[m].description}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
};
