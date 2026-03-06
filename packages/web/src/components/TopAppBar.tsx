import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

interface TopAppBarProps {
  title: string;
  children?: ReactNode;
  editableTitle?: string | undefined;
  onTitleChange?: ((title: string) => void) | undefined;
  statusBadge?: ReactNode | undefined;
}

/**
 * Top app bar — spans remaining width to the right of LeftNav.
 * Max 6 discrete interactive elements in the right slot (design principle).
 *
 * When `editableTitle` is provided, the title becomes inline-editable:
 * click to edit, blur or Enter to save.
 */
export function TopAppBar({
  title,
  children,
  editableTitle,
  onTitleChange,
  statusBadge,
}: TopAppBarProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(editableTitle ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when editableTitle changes externally
  useEffect(() => {
    if (editableTitle !== undefined) {
      setEditValue(editableTitle);
    }
  }, [editableTitle]);

  const handleSave = useCallback(() => {
    setEditing(false);
    if (onTitleChange && editValue !== editableTitle) {
      onTitleChange(editValue);
    }
  }, [editValue, editableTitle, onTitleChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const handleTitleClick = useCallback(() => {
    setEditing(true);
    // Focus the input after render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  const showEditableTitle = editableTitle !== undefined;

  return (
    <Box
      data-testid="top-app-bar"
      sx={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        backgroundColor: '#F7F0E6',
        boxShadow: '0 1px 3px rgba(69,31,97,0.06)',
        zIndex: 30,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
        {showEditableTitle ? (
          editing ? (
            <TextField
              inputRef={inputRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              variant="standard"
              size="small"
              slotProps={{
                htmlInput: {
                  'aria-label': 'title',
                },
                input: {
                  sx: {
                    fontFamily: '"Source Serif 4", Georgia, serif',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#451F61',
                    padding: 0,
                  },
                  disableUnderline: false,
                },
              }}
              sx={{ minWidth: 200 }}
            />
          ) : (
            <Typography
              onClick={handleTitleClick}
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#451F61',
                cursor: 'text',
                '&:hover': {
                  backgroundColor: 'rgba(128,39,255,0.06)',
                  borderRadius: '4px',
                },
                px: 0.5,
                py: 0.25,
              }}
            >
              {editableTitle}
            </Typography>
          )
        ) : (
          <Typography
            sx={{
              fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#451F61',
            }}
          >
            {title}
          </Typography>
        )}
        {statusBadge != null && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{statusBadge}</Box>
        )}
      </Box>
      {children != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>
      )}
    </Box>
  );
}
