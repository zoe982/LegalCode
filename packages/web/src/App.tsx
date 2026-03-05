import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Typography, Container } from '@mui/material';
import { theme } from './theme/index.js';
import { AuthGuard } from './components/AuthGuard.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthGuard>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1">
              LegalCode
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Template Management System
            </Typography>
          </Container>
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
