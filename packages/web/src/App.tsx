import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ThemeProvider,
  CssBaseline,
  Typography,
  Container,
  AppBar,
  Toolbar,
  Button,
} from '@mui/material';
import { theme } from './theme/index.js';
import { AuthGuard } from './components/AuthGuard.js';
import { useAuth } from './hooks/useAuth.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

function AuthenticatedApp() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            LegalCode
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={() => {
              logout();
            }}
            disabled={isLoggingOut}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Templates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No templates yet.
        </Typography>
      </Container>
    </>
  );
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthGuard>
          <AuthenticatedApp />
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
