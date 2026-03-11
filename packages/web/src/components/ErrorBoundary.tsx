import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { reportError, collectDiagnostics } from '../services/errorReporter.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copiedWork: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copiedWork: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copiedWork: false };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      void reportError({
        source: 'frontend',
        severity: 'critical',
        message: error.message,
        stack: error.stack ?? null,
        metadata: JSON.stringify({
          componentStack: errorInfo.componentStack,
          ...collectDiagnostics(),
        }),
        url: window.location.href,
      });
    } catch {
      // Silently ignore reporting failures
    }
    // Force-activate waiting service worker so next reload gets the latest version
    try {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker
          .getRegistration()
          .then((reg) => {
            if (reg?.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          })
          .catch(() => {
            // Silently ignore — SW may be unavailable
          });
      }
    } catch {
      // Silently ignore SW activation failures
    }
  }

  private handleCopyWork = (): void => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('legalcode:backup:')) {
          keys.push(key);
        }
      }
      if (keys.length === 0) return;
      const latestKey = keys[keys.length - 1];
      /* v8 ignore next -- guard for TypeScript */
      if (!latestKey) return;
      const content = sessionStorage.getItem(latestKey);
      if (content) {
        void navigator.clipboard.writeText(content);
        this.setState({ copiedWork: true });
      }
    } catch {
      /* v8 ignore next -- clipboard or sessionStorage unavailable */
    }
  };

  private handleRetry = (): void => {
    window.location.reload();
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
                mb: 3,
              }}
            >
              An unexpected error occurred. Please try again.
            </Typography>
            <Button
              variant="outlined"
              onClick={this.handleCopyWork}
              sx={{
                mb: 1.5,
                borderColor: '#E4E5ED',
                color: '#6B6D82',
                borderRadius: '12px',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#8027FF',
                  color: '#8027FF',
                  backgroundColor: 'rgba(128, 39, 255, 0.04)',
                },
              }}
            >
              {this.state.copiedWork ? 'Copied!' : 'Copy your recent work'}
            </Button>
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
