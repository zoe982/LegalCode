import type { ReactNode } from 'react';
import { Box, CircularProgress, Button, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth.js';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#EFE3D3',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#EFE3D3',
        }}
      >
        <Box
          sx={{
            backgroundColor: '#F7F0E6',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(69,31,97,0.14)',
            p: 5,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
              fontWeight: 600,
              color: '#451F61',
            }}
          >
            LegalCode
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#6B5A7A',
              mb: 4,
            }}
          >
            by Acasus
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              void login();
            }}
            sx={{
              backgroundColor: '#8027FF',
              borderRadius: '12px',
              '&:hover': {
                backgroundColor: '#6B1FD6',
              },
            }}
          >
            Sign in with Google
          </Button>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}
