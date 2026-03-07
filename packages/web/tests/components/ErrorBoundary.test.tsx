/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.js';

const mockReportError = vi.fn();
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args) as unknown,
}));

// Suppress console.error from error boundary
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
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

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      </ThemeProvider>,
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('calls reportError from errorReporter service', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'frontend',
        severity: 'critical',
        message: 'Test error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        url: expect.any(String),
      }),
    );
  });

  it('includes componentStack in metadata', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.metadata).toBeDefined();
    const metadata = JSON.parse(call.metadata as string) as Record<string, unknown>;
    expect(metadata.componentStack).toBeDefined();
  });

  it('does not crash when reportError would fail', () => {
    mockReportError.mockImplementation(() => {
      throw new Error('Report failed');
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should still show error UI
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('handles error with undefined stack', () => {
    function StacklessThrow(): never {
      const error = new Error('No stack');
      Object.defineProperty(error, 'stack', { value: undefined });
      throw error;
    }

    renderWithTheme(
      <ErrorBoundary>
        <StacklessThrow />
      </ErrorBoundary>,
    );

    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: null,
      }),
    );
  });
});
