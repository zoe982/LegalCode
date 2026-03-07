import { Box, Typography } from '@mui/material';
import type { Template } from '@legalcode/shared';
import { StatusChip } from './StatusChip.js';
import { relativeTime } from '../utils/relativeTime.js';

export interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <Box
      data-testid={`template-card-${template.id}`}
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
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
      {/* Top row: category + status */}
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
        <StatusChip status={template.status} />
      </Box>

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
