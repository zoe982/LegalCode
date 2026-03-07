/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { AppShell } from '../../src/components/AppShell.js';

// Mock useMediaQuery to simulate desktop viewport (>= 900px)
vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}));

const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'u1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' as const },
  logout: vi.fn(),
  isLoggingOut: false,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
});

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args) as unknown,
}));

function renderShell(path = '/templates') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/templates" element={<div>Template List</div>} />
              <Route path="/admin" element={<div>Admin Page</div>} />
              <Route path="/settings" element={<div>Settings Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders app bar and workspace (no left nav)', () => {
    renderShell();
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
    expect(screen.getByTestId('workspace')).toBeInTheDocument();
    // LeftNav has been removed — no left-nav element
    expect(screen.queryByTestId('left-nav')).not.toBeInTheDocument();
  });

  it('renders the routed page content in the workspace', () => {
    renderShell('/templates');
    expect(screen.getByText('Template List')).toBeInTheDocument();
  });

  it('renders admin page at /admin', () => {
    renderShell('/admin');
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('renders settings page at /settings', () => {
    renderShell('/settings');
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('wraps outlet content in PageTransition', () => {
    renderShell('/templates');
    expect(screen.getByTestId('page-transition')).toBeInTheDocument();
    expect(screen.getByText('Template List')).toBeInTheDocument();
  });

  it('returns null when user is not present', () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      logout: vi.fn(),
      isLoggingOut: false,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/templates']}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/templates" element={<div>Template List</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders user avatar in top app bar', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });
});
