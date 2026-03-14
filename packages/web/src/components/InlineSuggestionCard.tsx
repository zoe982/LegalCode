import { Box, Typography, IconButton, Avatar, Tooltip } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { getSuggestionColor } from '../utils/suggestionColors.js';
import type { Suggestion } from '../types/suggestions.js';

export interface InlineSuggestionCardProps {
  suggestion: Suggestion;
  isActive?: boolean;
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
  onDelete?: ((suggestionId: string) => void) | undefined;
  onClick?: ((suggestionId: string) => void) | undefined;
  canDelete?: boolean;
  style?: React.CSSProperties;
}

function getDisplayName(email: string, name?: string): string {
  if (name && name !== email) return name;
  return email.split('@')[0] ?? email;
}

function getInitials(email: string, name?: string): string {
  const displayName = getDisplayName(email, name);
  const parts = displayName.split(/[\s.]+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${String(diffDays)}d ago`;
}

export function InlineSuggestionCard({
  suggestion,
  isActive = false,
  onAccept,
  onReject,
  onDelete,
  onClick,
  canDelete,
  style,
}: InlineSuggestionCardProps) {
  const color = getSuggestionColor(suggestion.authorEmail);
  const displayName = getDisplayName(suggestion.authorEmail, suggestion.authorName);
  const initials = getInitials(suggestion.authorEmail, suggestion.authorName);
  const isInsert = suggestion.type === 'insert';

  const handleCardClick = () => {
    onClick?.(suggestion.id);
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAccept(suggestion.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject(suggestion.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(suggestion.id);
  };

  return (
    <Box
      role="article"
      aria-label={`Suggestion by ${displayName}: ${suggestion.type} — ${isInsert ? (suggestion.replacementText ?? '') : suggestion.originalText}`}
      data-active={isActive ? 'true' : undefined}
      onClick={handleCardClick}
      style={style}
      sx={{
        backgroundColor: isActive ? `${color}0D` : 'var(--surface-primary)',
        border: `1px solid ${isActive ? color : 'var(--border-primary)'}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: '10px',
        p: 1.5,
        cursor: 'pointer',
        transition: 'all 200ms ease',
        boxShadow: isActive
          ? `0 0 0 1px ${color}33, 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
          : '0 1px 2px rgba(0,0,0,0.04)',
        '&:hover': { backgroundColor: 'var(--surface-secondary)' },
      }}
    >
      {/* Top row: type icon + label + timestamp */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isInsert ? (
            <AddRoundedIcon sx={{ fontSize: '16px', color: '#059669' }} aria-hidden="true" />
          ) : (
            <RemoveRoundedIcon sx={{ fontSize: '16px', color: '#DC2626' }} aria-hidden="true" />
          )}
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: isInsert ? '#059669' : '#DC2626',
            }}
          >
            {isInsert ? 'Insert' : 'Delete'}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.6875rem',
            color: 'var(--text-tertiary)',
          }}
        >
          {formatRelativeTime(suggestion.createdAt)}
        </Typography>
      </Box>

      {/* Diff preview */}
      <Box sx={{ maxHeight: 60, overflow: 'hidden', mb: 1 }}>
        {isInsert ? (
          <Box
            sx={{
              borderLeft: '2px solid #059669',
              borderRadius: '0 4px 4px 0',
              backgroundColor: 'rgba(209, 250, 229, 0.5)',
              px: 1,
              py: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                color,
                textDecoration: 'underline',
                textDecorationColor: color,
              }}
            >
              {suggestion.replacementText ?? ''}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              borderLeft: '2px solid #DC2626',
              borderRadius: '0 4px 4px 0',
              backgroundColor: 'rgba(254, 226, 226, 0.5)',
              px: 1,
              py: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                textDecoration: 'line-through',
                textDecorationColor: '#DC2626',
              }}
            >
              {suggestion.originalText}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Author row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: 1 }}>
        <Avatar
          sx={{
            width: 20,
            height: 20,
            fontSize: '0.625rem',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            backgroundColor: color,
          }}
        >
          {initials}
        </Avatar>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>
      </Box>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          mt: '10px',
          alignItems: 'center',
        }}
      >
        {canDelete === true && onDelete != null && (
          <Tooltip title="Delete suggestion" placement="top">
            <IconButton
              aria-label="Delete suggestion"
              size="small"
              onClick={handleDelete}
              sx={{
                height: '28px',
                width: '28px',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'rgba(254, 226, 226, 0.5)',
                  color: '#DC2626',
                },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>
        )}
        <Box
          component="button"
          onClick={handleReject}
          aria-label={`Reject suggestion by ${displayName}`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            height: '28px',
            px: '10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'rgba(254, 226, 226, 0.5)',
              color: '#DC2626',
            },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: '14px' }} />
          Reject
        </Box>
        <Box
          component="button"
          onClick={handleAccept}
          aria-label={`Accept suggestion by ${displayName}`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            height: '28px',
            px: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border-primary)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            '&:hover': {
              backgroundColor: 'rgba(209, 250, 229, 0.5)',
              color: '#059669',
              borderColor: '#059669',
            },
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: '14px' }} />
          Accept
        </Box>
      </Box>
    </Box>
  );
}
