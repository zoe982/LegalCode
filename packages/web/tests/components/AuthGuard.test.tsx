/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { AuthGuard } from '../../src/components/AuthGuard.js';

const mockUseAuth = vi.fn();

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth() as unknown,
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('AuthGuard', () => {
  it('shows loading indicator while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      isLoggingOut: false,
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoggingOut: false,
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows sign in button when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      isLoggingOut: false,
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });
});
