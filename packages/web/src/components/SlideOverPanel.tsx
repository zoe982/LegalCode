import { useEffect, useCallback, type ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function SlideOverPanel({ open, onClose, title, children }: SlideOverPanelProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <>
      {/* Scrim overlay */}
      {open && (
        <Box
          data-testid="slide-over-scrim"
          onClick={onClose}
          sx={{
            position: 'fixed',
            top: 48,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            zIndex: 39,
            animation: 'fadeIn 200ms ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        />
      )}

      {/* Panel */}
      <Box
        data-testid="slide-over-panel"
        role="dialog"
        aria-label={title}
        sx={{
          position: 'fixed',
          top: 48,
          right: 0,
          width: 400,
          height: 'calc(100vh - 48px)',
          backgroundColor: 'var(--surface-primary)',
          borderLeft: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-panel)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: open ? 'transform 300ms ease-out' : 'transform 200ms ease-in',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            height: 52,
            px: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-primary)',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#12111A',
            }}
          >
            {title}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            size="small"
            sx={{
              color: '#6B6D82',
              '&:hover': {
                color: '#12111A',
              },
              '& .MuiSvgIcon-root': {
                fontSize: 20,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
}
