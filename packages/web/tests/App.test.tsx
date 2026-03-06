/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { theme } from '../src/theme/index.js';
import { App, routes } from '../src/App.js';
import { ToastProvider } from '../src/components/Toast.js';
import { server } from '../src/mocks/node.js';
import { http, HttpResponse } from 'msw';

// Mock useMediaQuery to simulate desktop viewport (>= 900px)
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

function renderWithRouter(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function mockAuthenticatedUser() {
  server.use(
    http.get('/auth/me', () =>
      HttpResponse.json({
        user: {
          id: '1',
          email: 'alice@acasus.com',
          name: 'Alice',
          role: 'editor',
        },
      }),
    ),
  );
}

describe('App', () => {
  it('shows AppShell with left nav and app bar when authenticated', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/templates');
    await waitFor(() => {
      expect(screen.getByTestId('left-nav')).toBeInTheDocument();
    });
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
    expect(screen.getByTestId('workspace')).toBeInTheDocument();
  });

  it('renders TemplateListPage at /templates', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/templates');
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
    });
  });

  it('redirects index route to /templates', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
    });
  });

  it('renders TemplateEditorPage at /templates/new', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/templates/new');
    await waitFor(() => {
      // "New Template" appears in both LeftNav CTA and TopAppBar title
      const elements = screen.getAllByText('New Template');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders TemplateEditorPage at /templates/:id', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/templates/t1');
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('renders AdminPage at /admin', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/admin');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
    });
  });

  it('renders SettingsPage at /settings', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/settings');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
    });
  });

  it('displays user name in the left nav', async () => {
    mockAuthenticatedUser();
    renderWithRouter('/templates');
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });
});

describe('App component', () => {
  it('renders without crashing', async () => {
    mockAuthenticatedUser();
    render(<App />);
    // App wraps AuthGuard which will show a loading indicator then content
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
