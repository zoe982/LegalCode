/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../src/theme/index.js';
import { AuthGuard } from '../src/components/AuthGuard.js';
import { AppShell } from '../src/components/AppShell.js';
import { ToastProvider } from '../src/components/Toast.js';
import { TemplateListPage } from '../src/pages/TemplateListPage.js';
import { AdminPage } from '../src/pages/AdminPage.js';
import { SettingsPage } from '../src/pages/SettingsPage.js';
import { server } from '../src/mocks/node.js';
import { http, HttpResponse } from 'msw';

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}));

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

function mockAll() {
  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({ user: { id: '1', email: 'a@b.com', name: 'A', role: 'admin' } }),
    ),
    http.get('/api/templates', () => HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })),
    http.get('/api/admin/users', () => HttpResponse.json({ users: [] })),
    http.get('/api/admin/allowed-emails', () => HttpResponse.json({ emails: [] })),
    http.get('/api/admin/errors', () => HttpResponse.json({ errors: [] })),
    http.get('/api/categories', () => HttpResponse.json({ categories: [] })),
    http.get('/api/countries', () => HttpResponse.json({ countries: [] })),
  );
}

// Wrap child route with a nav link to enable navigation
function WithNav({
  children,
  to,
  label,
}: {
  children: React.ReactNode;
  to: string;
  label: string;
}) {
  return (
    <div>
      <Link to={to} data-testid={`nav-${label}`}>
        {label}
      </Link>
      {children}
    </div>
  );
}

describe('Navigation loop debug', () => {
  // A: TemplateListPage -> simple div (is unmount the problem?)
  it('TemplateListPage -> simple div via Link', async () => {
    const user = userEvent.setup();
    mockAll();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={['/templates']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <AppShell />
                    </AuthGuard>
                  }
                >
                  <Route
                    path="templates"
                    element={
                      <WithNav to="/dest" label="go-dest">
                        <TemplateListPage />
                      </WithNav>
                    }
                  />
                  <Route path="dest" element={<div data-testid="dest">Dest</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByTestId('nav-go-dest'));
    await waitFor(
      () => {
        expect(screen.getByTestId('dest')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  // B: simple div -> AdminPage (is mount the problem?)
  it('simple div -> AdminPage via Link', async () => {
    const user = userEvent.setup();
    mockAll();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={['/start']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <AppShell />
                    </AuthGuard>
                  }
                >
                  <Route
                    path="start"
                    element={
                      <div>
                        <Link to="/admin" data-testid="go-admin">
                          Go Admin
                        </Link>
                      </div>
                    }
                  />
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByTestId('go-admin')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByTestId('go-admin'));
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 2, name: /users/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  // C: TemplateListPage -> AdminPage via Link (the exact combination)
  it('TemplateListPage -> AdminPage via Link', async () => {
    const user = userEvent.setup();
    mockAll();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={['/templates']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <AppShell />
                    </AuthGuard>
                  }
                >
                  <Route
                    path="templates"
                    element={
                      <WithNav to="/admin" label="go-admin">
                        <TemplateListPage />
                      </WithNav>
                    }
                  />
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByTestId('nav-go-admin'));
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 2, name: /users/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  // D: TemplateListPage -> SettingsPage via Link
  it('TemplateListPage -> SettingsPage via Link', async () => {
    const user = userEvent.setup();
    mockAll();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={['/templates']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <AppShell />
                    </AuthGuard>
                  }
                >
                  <Route
                    path="templates"
                    element={
                      <WithNav to="/settings" label="go-settings">
                        <TemplateListPage />
                      </WithNav>
                    }
                  />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByTestId('nav-go-settings'));
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);
});
