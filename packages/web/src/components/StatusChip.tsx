import { Box } from '@mui/material';
import type { TemplateStatus } from '@legalcode/shared';
import { springTransitions, reducedMotionQuery } from '../theme/motion.js';

interface StatusConfig {
  label: string;
  backgroundColor: string;
  color: string;
  borderColor: string;
}

const statusConfig: Record<TemplateStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    borderColor: '#FDE68A',
  },
  active: {
    label: 'Published',
    backgroundColor: '#D1FAE5',
    color: '#059669',
    borderColor: '#A7F3D0',
  },
  archived: {
    label: 'Archived',
    backgroundColor: '#F3F3F7',
    color: '#6B6D82',
    borderColor: '#E4E5ED',
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
        border: `1px solid ${config.borderColor}`,
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: 1.4,
        transition: springTransitions(['color', 'background-color', 'border-color'], 'standard'),
        [`@media ${reducedMotionQuery}`]: {
          transition: 'none',
        },
      }}
    >
      {config.label}
    </Box>
  );
}
