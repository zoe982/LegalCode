import { Box } from '@mui/material';
import type { TemplateStatus } from '@legalcode/shared';

interface StatusConfig {
  label: string;
  backgroundColor: string;
  color: string;
}

const statusConfig: Record<TemplateStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    backgroundColor: '#B8860B1A',
    color: '#B8860B',
  },
  active: {
    label: 'Published',
    backgroundColor: '#2D6A4F1A',
    color: '#2D6A4F',
  },
  archived: {
    label: 'Archived',
    backgroundColor: '#78695A1A',
    color: '#78695A',
  },
};

interface StatusChipProps {
  status: TemplateStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        borderRadius: '9999px',
        padding: '4px 10px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontFamily: '"Source Sans 3", sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        lineHeight: 1.4,
      }}
    >
      {config.label}
    </Box>
  );
}
