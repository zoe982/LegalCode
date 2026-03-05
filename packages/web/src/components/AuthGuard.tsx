import type { ReactNode } from 'react';
import { Box, CircularProgress, Button, Typography, Paper, Container } from '@mui/material';
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
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={2} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              LegalCode
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Template Management System
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                void login();
              }}
            >
              Sign in with Google
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
}
