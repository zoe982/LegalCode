import type { ReactElement } from 'react';
import { Tooltip, Box, Typography, Button } from '@mui/material';
import { useFirstUseTooltip } from '../hooks/useFirstUseTooltip.js';

interface FirstUseTooltipProps {
  featureId: string;
  message: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
}

export function FirstUseTooltip({
  featureId,
  message,
  placement = 'bottom',
  children,
}: FirstUseTooltipProps) {
  const { shouldShow, dismiss } = useFirstUseTooltip(featureId);

  return (
    <Tooltip
      open={shouldShow}
      placement={placement}
      arrow
      disableHoverListener
      disableFocusListener
      disableTouchListener
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: '#12111A',
            borderRadius: '10px',
            padding: '12px 16px',
            maxWidth: 240,
          },
        },
        arrow: {
          sx: {
            color: '#12111A',
          },
        },
      }}
      title={
        <Box>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              color: '#FFFFFF',
              lineHeight: 1.4,
              mb: 1,
            }}
          >
            {message}
          </Typography>
          <Button
            size="small"
            onClick={dismiss}
            sx={{
              color: '#FFFFFF',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              padding: '2px 8px',
              minWidth: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              },
            }}
          >
            Got it
          </Button>
        </Box>
      }
    >
      {children}
    </Tooltip>
  );
}
