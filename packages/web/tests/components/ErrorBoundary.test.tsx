/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.js';

// Suppress console.error from error boundary
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.restoreAllMocks();
  return () => {
    console.error = originalError;
  };
});

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    renderWithTheme(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('recovers when Try Again is clicked', async () => {
    const user = userEvent.setup();
    // We need a way to toggle the error. Use a wrapper.
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) throw new Error('Test error');
      return <div>Recovered</div>;
    }

    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    // Stop throwing before clicking retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Need to rerender since state changed
    rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      </ThemeProvider>,
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('reports error to /admin/errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Wait for the async reportError call
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/admin/errors',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    fetchSpy.mockRestore();
  });

  it('does not crash when error reporting fails', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should still show error UI even if reporting fails
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });
});
