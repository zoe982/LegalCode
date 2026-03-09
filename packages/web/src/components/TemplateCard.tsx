import { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type { Template } from '@legalcode/shared';
import { relativeTime } from '../utils/relativeTime.js';

export interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  onDelete?: ((templateId: string) => void) | undefined;
}

export function TemplateCard({ template, onClick, onDelete }: TemplateCardProps) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleDelete = useCallback(() => {
    handleMenuClose();
    onDelete?.(template.id);
  }, [handleMenuClose, onDelete, template.id]);

  return (
    <Box
      data-testid={`template-card-${template.id}`}
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Don't trigger card navigation when focus is on the menu button
        const target = e.target as HTMLElement;
        if (target.closest('[aria-label="Template actions"]')) return;
        if (e.key === 'Enter') {
          onClick();
        }
      }}
      sx={{
        minHeight: '140px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          borderColor: '#D1D2DE',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        },
        '&:active': {
          transform: 'scale(0.99)',
          transition: 'transform 80ms ease',
        },
        '&:focus-visible': {
          outline: 'none',
          borderColor: '#8027FF',
          boxShadow: '0 0 0 3px rgba(128, 39, 255, 0.2)',
        },
      }}
    >
      {/* Top row: category + menu */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#6B6D82',
            lineHeight: 1,
          }}
        >
          {template.category}
        </Typography>
        {onDelete != null && (
          <IconButton
            aria-label="Template actions"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={handleMenuOpen}
            size="small"
            sx={{
              width: 28,
              height: 28,
              color: '#9B9DB0',
              '&:hover': { color: '#6B6D82', backgroundColor: '#F3F3F7' },
            }}
          >
            <MoreVertRounded sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
      {onDelete != null && (
        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '10px',
                border: '1px solid #E4E5ED',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
              },
            },
          }}
        >
          <MenuItem
            onClick={handleDelete}
            sx={{
              color: '#DC2626',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              gap: 1,
              '&:hover': { backgroundColor: '#FEE2E2' },
            }}
          >
            <DeleteOutlineRounded sx={{ fontSize: 18 }} />
            Delete
          </MenuItem>
        </Menu>
      )}

      {/* Title */}
      <Typography
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#12111A',
          lineHeight: 1.5,
          mt: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {template.title}
      </Typography>

      {/* Description */}
      {template.description != null && template.description !== '' && (
        <Typography
          data-testid="template-card-description"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            color: '#6B6D82',
            lineHeight: 1.5,
            mt: 0.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {template.description}
        </Typography>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Bottom row: metadata */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mt: 1.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            color: '#9B9DB0',
            lineHeight: 1,
          }}
        >
          {relativeTime(template.updatedAt)}
        </Typography>
        <Typography
          component="span"
          data-testid="separator-dot"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            color: '#9B9DB0',
            lineHeight: 1,
          }}
        >
          {'\u00B7'}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            color: '#9B9DB0',
            lineHeight: 1,
          }}
        >
          {`v${String(template.currentVersion)}`}
        </Typography>
      </Box>
    </Box>
  );
}
