import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';

export interface NewCommentCardProps {
  anchorText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function NewCommentCard({ anchorText, onSubmit, onCancel }: NewCommentCardProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleSubmit = useCallback(() => {
    /* v8 ignore next -- defensive guard; button is disabled when empty */
    if (text.trim() === '') return;
    onSubmit(text.trim());
    setText('');
  }, [text, onSubmit]);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '8px',
        backgroundColor: '#F9F9FB',
        borderLeft: '2px solid var(--comment-highlight, #F5A623)',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Anchor text quote */}
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontStyle: 'italic',
          color: '#6B6D82',
          fontFamily: '"DM Sans", sans-serif',
          borderLeft: '2px solid var(--comment-highlight, #F5A623)',
          pl: 1,
          mb: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {anchorText}
      </Typography>

      {/* Comment input */}
      <TextField
        inputRef={inputRef}
        size="small"
        placeholder="Add a comment..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        multiline
        minRows={2}
        fullWidth
        slotProps={{ htmlInput: { 'aria-label': 'Comment' } }}
        sx={{
          mb: 1,
          '& .MuiInputBase-input': {
            fontSize: '0.875rem',
            fontFamily: '"DM Sans", sans-serif',
            color: '#37354A',
          },
        }}
      />

      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          size="small"
          onClick={onCancel}
          sx={{
            fontSize: '0.75rem',
            color: '#6B6D82',
            fontFamily: '"DM Sans", sans-serif',
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={text.trim() === ''}
          onClick={handleSubmit}
          sx={{
            fontSize: '0.75rem',
            fontFamily: '"DM Sans", sans-serif',
            textTransform: 'none',
            backgroundColor: '#8027FF',
            '&:hover': {
              backgroundColor: '#6B1FDB',
            },
          }}
        >
          Comment
        </Button>
      </Box>
    </Box>
  );
}
