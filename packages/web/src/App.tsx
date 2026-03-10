import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import { theme } from './theme/index.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { RouteErrorBoundary } from './components/RouteErrorBoundary.js';
import { AuthGuard } from './components/AuthGuard.js';
import { AppShell } from './components/AppShell.js';
import { TemplateListPage } from './pages/TemplateListPage.js';
import { TemplateEditorPage } from './pages/TemplateEditorPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { DiffViewPage } from './pages/DiffViewPage.js';
import { VersionHistoryPage } from './pages/VersionHistoryPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { OfflineBar } from './components/OfflineBar.js';
import { ToastProvider } from './components/Toast.js';
import { ReloadPrompt } from './components/ReloadPrompt.js';
import { InstallPrompt } from './components/InstallPrompt.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/templates" replace /> },
      { path: 'templates', element: <TemplateListPage /> },
      { path: 'templates/new', element: <TemplateEditorPage /> },
      { path: 'templates/:id', element: <TemplateEditorPage /> },
      { path: 'templates/:id/diff/:v1/:v2', element: <DiffViewPage /> },
      { path: 'templates/:id/history', element: <VersionHistoryPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/templates" replace /> },
    ],
  },
];

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <OfflineBar />
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <AppShell />
                    </AuthGuard>
                  }
                >
                  <Route index element={<Navigate to="/templates" replace />} />
                  <Route path="templates" element={<TemplateListPage />} />
                  <Route path="templates/new" element={<TemplateEditorPage />} />
                  <Route path="templates/:id" element={<TemplateEditorPage />} />
                  <Route path="templates/:id/diff/:v1/:v2" element={<DiffViewPage />} />
                  <Route path="templates/:id/history" element={<VersionHistoryPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/templates" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
          <ReloadPrompt />
          <InstallPrompt />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
