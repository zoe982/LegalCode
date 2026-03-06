import { Box } from '@mui/material';
import type { TemplateStatus } from '@legalcode/shared';
import { springTransitions, reducedMotionQuery } from '../theme/motion.js';

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

export interface StatusChipProps {
  status: TemplateStatus;
  animate?: boolean | undefined;
}

export function StatusChip({ status, animate }: StatusChipProps) {
  const config = statusConfig[status];
  const showFlash = animate === true && status === 'active';
  return (
    <Box
      component="span"
      className={showFlash ? 'publishing-flash' : undefined}
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
        transition: springTransitions(['color', 'background-color'], 'standard'),
        [`@media ${reducedMotionQuery}`]: {
          transition: 'none',
        },
      }}
    >
      {config.label}
    </Box>
  );
}
