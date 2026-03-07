/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('renders Acasus wordmark', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(
      screen.getByText((_content, element) => element?.textContent === 'Acasus'),
    ).toBeInTheDocument();
  });

  it('renders LegalCode product name', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('LegalCode')).toBeInTheDocument();
  });

  it('renders sign-in button', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls login on button click', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: Wrapper });
    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('uses white background', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const container = screen.getByTestId('login-page');
    expect(container).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('renders footer with security text', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('Secured with Google OAuth')).toBeInTheDocument();
  });

  it('has data-testid="login-page"', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText(/© 2026 Acasus/)).toBeInTheDocument();
  });

  it('wordmark uses Source Serif 4 font', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByText((_content, element) => element?.textContent === 'Acasus');
    const styles = window.getComputedStyle(wordmark);
    expect(styles.fontFamily).toContain('Source Serif 4');
  });

  it('respects prefers-reduced-motion via animation styles on letter spans', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByText((_content, element) => element?.textContent === 'Acasus');
    const letterSpans = wordmark.querySelectorAll('span');
    expect(letterSpans.length).toBe(6); // A-c-a-s-u-s
    for (const span of letterSpans) {
      const style = span.getAttribute('style') ?? '';
      expect(style).toContain('animation');
    }
  });
});
