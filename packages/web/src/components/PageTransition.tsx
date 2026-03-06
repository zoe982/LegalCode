import { Box, keyframes } from '@mui/material';
import type { ReactNode } from 'react';

const pageIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <Box
      sx={{
        animation: `${pageIn} 200ms cubic-bezier(0.2, 0, 0, 1) both`,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
