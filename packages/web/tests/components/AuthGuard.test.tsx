/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('calls login when Sign in with Google button is clicked', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: vi.fn(),
      isLoggingOut: false,
    });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(signInButton);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('shows LegalCode heading and description when not authenticated', () => {
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
    expect(screen.getByRole('heading', { name: /legalcode/i })).toBeInTheDocument();
    expect(screen.getByText('by Acasus')).toBeInTheDocument();
  });

  it('shows "by Acasus" subtitle on login screen', () => {
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
    expect(screen.getByText('by Acasus')).toBeInTheDocument();
  });

  it('login screen uses brand styling', () => {
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
    const heading = screen.getByRole('heading', { name: /legalcode/i });
    const headingStyles = window.getComputedStyle(heading);
    expect(headingStyles.fontFamily).toContain('Source Serif 4');

    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).toHaveStyle({ backgroundColor: '#8027FF' });
  });
});
