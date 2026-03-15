import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

export function OfflineBar() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <Box
        data-testid="offline-bar"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: '#B8860B',
          zIndex: 70,
          visibility: isOffline ? 'visible' : 'hidden',
          opacity: isOffline ? 1 : 0,
          pointerEvents: isOffline ? 'auto' : 'none',
        }}
      />
      <Box
        data-testid="offline-banner"
        sx={{
          position: 'fixed',
          top: '3px',
          left: 0,
          right: 0,
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F7F0E6',
          zIndex: 70,
          visibility: isOffline ? 'visible' : 'hidden',
          opacity: isOffline ? 1 : 0,
          pointerEvents: isOffline ? 'auto' : 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.6875rem',
            color: '#6B5A7A',
            letterSpacing: '0.02em',
          }}
        >
          Working offline — changes saved locally.
        </Typography>
      </Box>
    </>
  );
}
