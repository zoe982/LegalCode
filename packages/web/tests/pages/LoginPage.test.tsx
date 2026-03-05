/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { LoginPage } from '../../src/pages/LoginPage.js';

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    loginUrl: '/auth/google',
    logout: vi.fn(),
    isLoggingOut: false,
  }),
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

describe('LoginPage', () => {
  it('renders login heading', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: /legalcode/i })).toBeInTheDocument();
  });

  it('renders sign in link pointing to Google OAuth', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /sign in with google/i });
    expect(link).toHaveAttribute('href', '/auth/google');
  });
});
