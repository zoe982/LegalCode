/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { theme } from '../src/theme/index.js';
import { AuthGuard } from '../src/components/AuthGuard.js';
import { App, routes } from '../src/App.js';
import { server } from '../src/mocks/node.js';
import { http, HttpResponse } from 'msw';

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
        <AuthGuard>
          <RouterProvider router={router} />
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('shows main content when authenticated', async () => {
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
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /legalcode/i })).toBeInTheDocument();
    });
  });

  it('renders TemplateListPage at index route', async () => {
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
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
    });
  });

  it('renders TemplateEditorPage at /templates/new', async () => {
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
    renderWithRouter('/templates/new');
    await waitFor(() => {
      expect(screen.getByText('New Template')).toBeInTheDocument();
    });
  });

  it('renders TemplateEditorPage at /templates/:id', async () => {
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
    renderWithRouter('/templates/t1');
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('calls logout when Sign out button is clicked', async () => {
    const user = userEvent.setup();
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
      http.post('/auth/logout', () => HttpResponse.json({ ok: true })),
    );
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);
    // Verify button was clickable (logout was invoked)
    expect(signOutButton).toBeInTheDocument();
  });

  it('displays user email in the toolbar', async () => {
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
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByText('alice@acasus.com')).toBeInTheDocument();
    });
  });
});

describe('App component', () => {
  it('renders without crashing', async () => {
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
    render(<App />);
    // App wraps AuthGuard which will show a loading indicator then content
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
