/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { AdminPage } from '../../src/pages/AdminPage.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer();

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

function renderAdminPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AdminPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminPage', () => {
  it('renders Admin heading', () => {
    server.use(http.get('/admin/errors', () => HttpResponse.json({ errors: [] })));
    renderAdminPage();
    expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders placeholder content', () => {
    server.use(http.get('/admin/errors', () => HttpResponse.json({ errors: [] })));
    renderAdminPage();
    expect(screen.getByText('User management and system configuration')).toBeInTheDocument();
  });

  it('renders Error Log heading', () => {
    server.use(http.get('/admin/errors', () => HttpResponse.json({ errors: [] })));
    renderAdminPage();
    expect(screen.getByRole('heading', { name: /error log/i })).toBeInTheDocument();
  });

  it('shows "No errors reported" when error list is empty', async () => {
    server.use(http.get('/admin/errors', () => HttpResponse.json({ errors: [] })));
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('No errors reported')).toBeInTheDocument();
    });
  });

  it('displays error entries from API', async () => {
    server.use(
      http.get('/admin/errors', () =>
        HttpResponse.json({
          errors: [
            {
              id: 'e1',
              userId: 'u1',
              action: 'client_error',
              entityType: 'app',
              entityId: 'frontend',
              metadata: JSON.stringify({
                message: 'Cannot read properties of undefined',
                url: 'https://legalcode.ax1access.com/templates',
                stack: 'Error at LeftNav.tsx:180',
              }),
              createdAt: '2026-03-06T12:00:00Z',
            },
          ],
        }),
      ),
    );
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
    });
    expect(screen.getByText(/2026-03-06/)).toBeInTheDocument();
    expect(screen.getByText(/Error at LeftNav.tsx:180/)).toBeInTheDocument();
  });

  it('displays fallback text when error has null metadata', async () => {
    server.use(
      http.get('/admin/errors', () =>
        HttpResponse.json({
          errors: [
            {
              id: 'e2',
              userId: 'u1',
              action: 'client_error',
              entityType: 'app',
              entityId: 'frontend',
              metadata: null,
              createdAt: '2026-03-06T14:00:00Z',
            },
          ],
        }),
      ),
    );
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Unknown error')).toBeInTheDocument();
    });
    expect(screen.getByText(/unknown page/)).toBeInTheDocument();
  });

  it('displays error without stack trace', async () => {
    server.use(
      http.get('/admin/errors', () =>
        HttpResponse.json({
          errors: [
            {
              id: 'e3',
              userId: 'u1',
              action: 'client_error',
              entityType: 'app',
              entityId: 'frontend',
              metadata: JSON.stringify({
                message: 'Some error',
                url: 'https://legalcode.ax1access.com/',
              }),
              createdAt: '2026-03-06T15:00:00Z',
            },
          ],
        }),
      ),
    );
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument();
    });
    // No <pre> stack trace element should be present
    expect(screen.queryByText(/Error at/)).not.toBeInTheDocument();
  });

  it('shows loading indicator while fetching errors', () => {
    server.use(
      http.get('/admin/errors', () => {
        return new Promise(() => {
          // Never resolves — simulates loading
        });
      }),
    );
    renderAdminPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows "No errors reported" when fetch fails', async () => {
    server.use(
      http.get('/admin/errors', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('No errors reported')).toBeInTheDocument();
    });
  });
});
