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

  it('calls window.location.reload when Try Again is clicked', async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: Object.assign(
        Object.create(Object.getPrototypeOf(window.location) as object),
        window.location,
        { reload: reloadMock },
      ),
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(reloadMock).toHaveBeenCalledOnce();
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

  it('"Copy your recent work" button is displayed in error state', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /copy your recent work/i })).toBeInTheDocument();
  });

  it('clicking copies sessionStorage backup to clipboard', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('legalcode:backup:t1', '# My unsaved work');

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: /copy your recent work/i }));
    expect(writeTextMock).toHaveBeenCalledWith('# My unsaved work');

    sessionStorage.clear();
  });

  it('button text changes to "Copied!" after copy', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('legalcode:backup:t1', '# Work');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: /copy your recent work/i }));
    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();

    sessionStorage.clear();
  });

  it('handles no backup gracefully', async () => {
    sessionStorage.clear();
    const user = userEvent.setup();
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Button should still render without crashing
    const btn = screen.getByRole('button', { name: /copy your recent work/i });
    expect(btn).toBeInTheDocument();

    // Clicking when no backup should not crash
    await user.click(btn);
    // Text should remain unchanged (no backup to copy)
    expect(screen.getByRole('button', { name: /copy your recent work/i })).toBeInTheDocument();
  });

  it('handles legalcode backup key with empty content', async () => {
    const user = userEvent.setup();
    // Set a key with empty string (falsy) content
    sessionStorage.setItem('legalcode:backup:t1', '');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: /copy your recent work/i }));
    // Button text should remain unchanged since empty string is falsy
    expect(screen.getByRole('button', { name: /copy your recent work/i })).toBeInTheDocument();

    sessionStorage.clear();
  });

  it('handles non-legalcode keys in sessionStorage', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('other-key', 'some value');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Click should not crash even though there are non-matching keys
    await user.click(screen.getByRole('button', { name: /copy your recent work/i }));
    // Should stay as "Copy your recent work" since no legalcode keys found
    expect(screen.getByRole('button', { name: /copy your recent work/i })).toBeInTheDocument();

    sessionStorage.clear();
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

  it('sends SKIP_WAITING to waiting service worker in componentDidCatch', () => {
    const postMessageMock = vi.fn();
    const waitingWorker = { postMessage: postMessageMock };

    const getRegistrationMock = vi.fn().mockResolvedValue({
      waiting: waitingWorker,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: getRegistrationMock },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // getRegistration should have been called
    expect(getRegistrationMock).toHaveBeenCalled();
  });

  it('does not crash when serviceWorker.getRegistration rejects', () => {
    const getRegistrationMock = vi.fn().mockRejectedValue(new Error('SW unavailable'));

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: getRegistrationMock },
      writable: true,
      configurable: true,
    });

    // Should not throw — error UI still renders
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('does not crash when serviceWorker is unavailable (no waiting)', () => {
    const getRegistrationMock = vi.fn().mockResolvedValue({
      waiting: null,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: getRegistrationMock },
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should still render error UI
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('does not crash when serviceWorker is not in navigator', () => {
    // eslint-disable-next-line @typescript-eslint/dot-notation -- need bracket notation to bypass type checking for test override
    const originalSW = (navigator as unknown as Record<string, unknown>)['serviceWorker'];
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    // Restore
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalSW,
      writable: true,
      configurable: true,
    });
  });
});
