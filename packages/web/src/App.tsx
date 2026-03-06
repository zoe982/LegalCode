import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import { theme } from './theme/index.js';
import { AuthGuard } from './components/AuthGuard.js';
import { AppShell } from './components/AppShell.js';
import { TemplateListPage } from './pages/TemplateListPage.js';
import { TemplateEditorPage } from './pages/TemplateEditorPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/templates" replace /> },
      { path: 'templates', element: <TemplateListPage /> },
      { path: 'templates/new', element: <TemplateEditorPage /> },
      { path: 'templates/:id', element: <TemplateEditorPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
