/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { LoginPage } from '../../src/pages/LoginPage.js';

const mockLogin = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
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
  it('renders Acasus wordmark', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('Acasus')).toBeInTheDocument();
  });

  it('renders LegalCode subtitle', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('LegalCode')).toBeInTheDocument();
  });

  it('has a Sign in with Google button', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('button triggers auth flow on click', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: Wrapper });
    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('uses beige background', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const container = screen.getByTestId('login-page');
    expect(container).toHaveStyle({ backgroundColor: '#EFE3D3' });
  });

  it('uses accent-primary styling on the button', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).toHaveStyle({ backgroundColor: '#8027FF' });
  });

  it('uses Source Serif 4 for the Acasus wordmark', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByText('Acasus');
    const styles = window.getComputedStyle(wordmark);
    expect(styles.fontFamily).toContain('Source Serif 4');
  });
});
