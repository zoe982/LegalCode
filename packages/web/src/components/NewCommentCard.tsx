import { useState, useCallback, useEffect, useRef } from 'react';
import { Avatar, Box, Button, TextField, Typography } from '@mui/material';
import { getAvatarColor } from '../utils/commentHelpers.js';

export interface NewCommentCardProps {
  anchorText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  top?: number | undefined;
  authorName?: string | undefined;
  authorEmail?: string | undefined;
  isCreating?: boolean | undefined;
}

export function NewCommentCard({
  anchorText,
  onSubmit,
  onCancel,
  top,
  authorName,
  isCreating,
}: NewCommentCardProps) {
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
      style={top != null ? { position: 'absolute', top } : undefined}
      sx={{
        p: 1.5,
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Anchor text quote */}
      <Box
        sx={{
          fontStyle: 'italic',
          borderLeft: '2px solid #FBBF24',
          backgroundColor: 'rgba(251, 191, 36, 0.06)',
          pl: 1,
          py: 0.5,
          pr: 1,
          borderRadius: '0 4px 4px 0',
          mb: 1,
          color: '#6B6D82',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontSize: '0.8125rem',
        }}
      >
        {anchorText}
      </Box>

      {/* Author row */}
      {authorName != null && authorName !== '' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: '0.75rem',
              backgroundColor: getAvatarColor(0),
            }}
          >
            {authorName.charAt(0)}
          </Avatar>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontFamily: '"DM Sans", sans-serif',
              color: '#37354A',
            }}
          >
            {authorName}
          </Typography>
        </Box>
      )}

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
        minRows={1}
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
          disabled={text.trim() === '' || isCreating === true}
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
