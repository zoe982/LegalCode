import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Typography, AppBar, Toolbar, Button } from '@mui/material';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router';
import type { RouteObject } from 'react-router';
import { theme } from './theme/index.js';
import { AuthGuard } from './components/AuthGuard.js';
import { useAuth } from './hooks/useAuth.js';
import { TemplateListPage } from './pages/TemplateListPage.js';
import { TemplateEditorPage } from './pages/TemplateEditorPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

function Layout() {
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
      <Outlet />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <TemplateListPage /> },
      { path: 'templates/new', element: <TemplateEditorPage /> },
      { path: 'templates/:id', element: <TemplateEditorPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthGuard>
          <RouterProvider router={router} />
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
