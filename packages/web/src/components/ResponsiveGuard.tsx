import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

interface ResponsiveGuardProps {
  children: ReactNode;
}

export function ResponsiveGuard({ children }: ResponsiveGuardProps) {
  const isDesktop = useMediaQuery('(min-width:900px)');

  if (!isDesktop) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--surface-primary)',
          padding: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'var(--text-primary)',
            maxWidth: 400,
            lineHeight: 1.5,
          }}
        >
          LegalCode is designed for desktop. Please use a wider window.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
