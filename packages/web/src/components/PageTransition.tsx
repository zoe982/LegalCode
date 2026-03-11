import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <Box data-testid="page-transition" sx={{ height: '100%' }}>
      {children}
    </Box>
  );
}
