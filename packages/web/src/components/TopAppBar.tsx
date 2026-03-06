import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface TopAppBarProps {
  title: string;
  children?: ReactNode;
}

/**
 * Top app bar — spans remaining width to the right of LeftNav.
 * Max 6 discrete interactive elements in the right slot (design principle).
 */
export function TopAppBar({ title, children }: TopAppBarProps) {
  return (
    <Box
      data-testid="top-app-bar"
      sx={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        backgroundColor: '#F7F0E6',
        boxShadow: '0 1px 3px rgba(69,31,97,0.06)',
        zIndex: 30,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#451F61',
        }}
      >
        {title}
      </Typography>
      {children != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>
      )}
    </Box>
  );
}
