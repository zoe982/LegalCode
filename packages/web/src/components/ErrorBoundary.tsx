import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { reportError } from '../services/errorReporter.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      void reportError({
        source: 'frontend',
        severity: 'critical',
        message: error.message,
        stack: error.stack ?? null,
        metadata: JSON.stringify({ componentStack: errorInfo.componentStack }),
        url: window.location.href,
      });
    } catch {
      // Silently ignore reporting failures
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
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
              variant="h5"
              component="h1"
              gutterBottom
              sx={{
                fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                fontWeight: 600,
                color: '#451F61',
              }}
            >
              Something went wrong
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#6B5A7A',
                mb: 3,
              }}
            >
              An unexpected error occurred. Please try again.
            </Typography>
            <Button
              variant="contained"
              onClick={this.handleRetry}
              sx={{
                backgroundColor: '#8027FF',
                borderRadius: '12px',
                '&:hover': {
                  backgroundColor: '#6B1FD6',
                },
              }}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
