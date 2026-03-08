import { Box, keyframes } from '@mui/material';
import type { ReactNode } from 'react';

const pageIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <Box
      data-testid="page-transition"
      sx={{
        animation: `${pageIn} 200ms ease-out backwards`,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
