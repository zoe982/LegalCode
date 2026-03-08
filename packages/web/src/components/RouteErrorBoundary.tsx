import { useEffect } from 'react';
import { useRouteError, useLocation } from 'react-router';
import { Box, Typography, Button, Link } from '@mui/material';
import { reportError } from '../services/errorReporter.js';

export function RouteErrorBoundary(): React.ReactElement {
  const error = useRouteError();
  const location = useLocation();
  const routePath = location.pathname;

  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';

  useEffect(() => {
    try {
      void reportError({
        source: 'frontend',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Unknown route error',
        /* v8 ignore next -- error.stack is always defined in V8 */
        stack: error instanceof Error ? (error.stack ?? null) : null,
        url: routePath,
      });
    } catch {
      // Silently ignore reporting failures
    }
  }, [error, routePath]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F9F9FB',
      }}
    >
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
          p: 5,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontWeight: 600,
            color: '#12111A',
          }}
        >
          Something went wrong
        </Typography>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#6B6D82',
            mb: 1,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Error on route: {routePath}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: '#6B6D82',
            mb: 3,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {errorMessage}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={() => {
              window.location.reload();
            }}
            sx={{
              backgroundColor: '#8027FF',
              borderRadius: '12px',
              textTransform: 'none',
              fontFamily: '"DM Sans", sans-serif',
              '&:hover': {
                backgroundColor: '#6B1FD6',
              },
            }}
          >
            Try Again
          </Button>
          <Link
            href="/"
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              color: '#8027FF',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Go Home
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
