import { useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Box, Typography, Chip, Button, TextField } from '@mui/material';
import { StatusChip } from './StatusChip.js';
import { FirstUseTooltip } from './FirstUseTooltip.js';

interface MetadataTabProps {
  category: string;
  country: string;
  tags: string[];
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  readOnly?: boolean | undefined;
  createdBy?: string | undefined;
  onPublish?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
  onCategoryChange?: ((value: string) => void) | undefined;
  onCountryChange?: ((value: string) => void) | undefined;
  onTagsChange?: ((tags: string[]) => void) | undefined;
  onUnarchive?: (() => void) | undefined;
}

const labelStyle = {
  fontSize: '0.6875rem',
  color: '#6B6D82',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
  letterSpacing: '0.06em',
  mb: 0.5,
  fontFamily: '"DM Sans", sans-serif',
};

const valueStyle = {
  fontSize: '0.875rem',
  color: '#12111A',
  fontFamily: '"DM Sans", sans-serif',
};

interface InlineEditFieldProps {
  label: string;
  value: string;
  editable: boolean;
  onChange?: ((value: string) => void) | undefined;
}

function InlineEditField({ label, value, editable, onChange }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleClick = useCallback(() => {
    if (editable && onChange) {
      setEditValue(value);
      setEditing(true);
    }
  }, [editable, onChange, value]);

  const handleSave = useCallback(() => {
    setEditing(false);
    if (onChange && editValue !== value) {
      onChange(editValue);
    }
  }, [editValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setEditing(false);
        if (onChange) {
          onChange(editValue);
        }
      }
    },
    [editValue, onChange],
  );

  return (
    <Box>
      <Typography sx={labelStyle}>{label}</Typography>
      {editing ? (
        <TextField
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          variant="standard"
          size="small"
          autoFocus
          slotProps={{
            input: {
              sx: {
                ...valueStyle,
                padding: 0,
              },
            },
            htmlInput: {
              'aria-label': label.toLowerCase(),
            },
          }}
          fullWidth
        />
      ) : (
        <Typography
          sx={{
            ...valueStyle,
            ...(editable && onChange != null
              ? {
                  cursor: 'text',
                  '&:hover': {
                    backgroundColor: 'rgba(128,39,255,0.06)',
                    borderRadius: '4px',
                  },
                  px: 0.5,
                  py: 0.25,
                  mx: -0.5,
                }
              : {}),
          }}
          onClick={handleClick}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
}

export function MetadataTab({
  category,
  country,
  tags,
  status,
  createdAt,
  updatedAt,
  readOnly,
  createdBy,
  onPublish,
  onArchive,
  onCategoryChange,
  onCountryChange,
  onTagsChange,
  onUnarchive,
}: MetadataTabProps) {
  const isEditable = readOnly !== true;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <InlineEditField
        label="Category"
        value={category}
        editable={isEditable}
        onChange={onCategoryChange}
      />

      <InlineEditField
        label="Country"
        value={country}
        editable={isEditable}
        onChange={onCountryChange}
      />

      <Box>
        <Typography sx={labelStyle}>Tags</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={
                isEditable && onTagsChange
                  ? () => {
                      onTagsChange(tags.filter((t) => t !== tag));
                    }
                  : undefined
              }
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Status</Typography>
        <StatusChip status={status} />
      </Box>

      {createdBy != null && (
        <Box>
          <Typography sx={labelStyle}>Created By</Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#6B6D82',
            }}
          >
            {createdBy}
          </Typography>
        </Box>
      )}

      <Box>
        <Typography sx={labelStyle}>Created</Typography>
        <Typography sx={valueStyle}>{new Date(createdAt).toLocaleDateString()}</Typography>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Last Modified</Typography>
        <Typography sx={valueStyle}>{new Date(updatedAt).toLocaleDateString()}</Typography>
      </Box>

      {readOnly !== true && status === 'draft' && onPublish != null && (
        <FirstUseTooltip
          featureId="publish"
          message="Make this template available across your organization"
        >
          <Button
            variant="contained"
            onClick={onPublish}
            sx={{
              backgroundColor: '#8027FF',
              '&:hover': { backgroundColor: '#6B1FD6' },
            }}
          >
            Publish
          </Button>
        </FirstUseTooltip>
      )}

      {readOnly !== true && status === 'active' && onArchive != null && (
        <Button
          variant="outlined"
          onClick={onArchive}
          sx={{ color: '#6B6D82', borderColor: '#6B6D82' }}
        >
          Archive
        </Button>
      )}

      {status === 'archived' && onUnarchive != null && (
        <Button
          variant="outlined"
          onClick={onUnarchive}
          sx={{
            color: '#8027FF',
            borderColor: '#8027FF',
            '&:hover': {
              borderColor: '#6B1FD6',
              backgroundColor: 'rgba(128, 39, 255, 0.04)',
            },
          }}
        >
          Unarchive
        </Button>
      )}
    </Box>
  );
}
