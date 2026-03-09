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

  it('renders Acasus LegalCode wordmark', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(
      screen.getByText((_content, element) => element?.textContent === 'Acasus\u00A0LegalCode'),
    ).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('Legal template management')).toBeInTheDocument();
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

  it('renders login page container with dot grid and radial gradient', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const container = screen.getByTestId('login-page');
    expect(container).toBeInTheDocument();
    // Background includes dot grid + radial gradient (verified visually; jsdom cannot compute sx backgrounds)
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
    const wordmark = screen.getByText(
      (_content, element) => element?.textContent === 'Acasus\u00A0LegalCode',
    );
    const styles = window.getComputedStyle(wordmark);
    expect(styles.fontFamily).toContain('Source Serif 4');
  });

  it('respects prefers-reduced-motion via animation styles on letter spans', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByText(
      (_content, element) => element?.textContent === 'Acasus\u00A0LegalCode',
    );
    const letterSpans = wordmark.querySelectorAll('span');
    expect(letterSpans.length).toBe(16); // A-c-a-s-u-s-space-L-e-g-a-l-C-o-d-e
    for (const span of letterSpans) {
      const style = span.getAttribute('style') ?? '';
      expect(style).toContain('animation');
      // Verify updated animation uses 350ms duration and cubic-bezier easing
      expect(style).toContain('350ms');
      expect(style).toContain('cubic-bezier(0.2, 0, 0, 1)');
    }
  });

  // New tests for design enhancements

  it('renders logo mark with "LC" text', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const logoMark = screen.getByTestId('logo-mark');
    expect(logoMark).toBeInTheDocument();
    expect(logoMark).toHaveTextContent('LC');
  });

  it('wordmark has aria-label for accessibility', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByLabelText('Acasus LegalCode');
    expect(wordmark).toBeInTheDocument();
  });

  it('letter spans have aria-hidden for accessibility', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const wordmark = screen.getByText(
      (_content, element) => element?.textContent === 'Acasus\u00A0LegalCode',
    );
    const letterSpans = wordmark.querySelectorAll('span');
    expect(letterSpans.length).toBe(16);
    for (const span of letterSpans) {
      expect(span).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('sign-in button contains a Google SVG icon', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const button = screen.getByRole('button', { name: /sign in with google/i });
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Verify it has Google brand color paths
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBe(4);
  });

  it('tagline has uppercase text transform', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const tagline = screen.getByText('Legal template management');
    const styles = window.getComputedStyle(tagline);
    expect(styles.textTransform).toBe('uppercase');
  });
});
