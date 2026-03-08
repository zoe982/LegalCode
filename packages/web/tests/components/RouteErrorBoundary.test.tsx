/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary.js';

const mockReportError = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args) as unknown,
}));

// Suppress console.error from error boundary / router
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
  return () => {
    console.error = originalError;
  };
});

function ThrowingComponent(): never {
  throw new Error('Test route error');
}

function renderRouteError(initialPath = '/templates/t1', routePath = '/templates/:id') {
  const router = createMemoryRouter(
    [
      {
        path: routePath,
        element: <ThrowingComponent />,
        errorElement: <RouteErrorBoundary />,
      },
    ],
    { initialEntries: [initialPath] },
  );

  return render(
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('RouteErrorBoundary', () => {
  it('renders error heading and route path', () => {
    renderRouteError('/templates/t1', '/templates/:id');

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/\/templates\/t1/)).toBeInTheDocument();
  });

  it('shows "Try Again" button', () => {
    renderRouteError();

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows "Go Home" link', () => {
    renderRouteError();

    expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
  });

  it('reports error with route path to error reporter', () => {
    renderRouteError('/templates/t1');

    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'frontend',
        severity: 'critical',
        message: 'Test route error',
        url: expect.stringContaining('/templates/t1') as unknown,
      }),
    );
  });

  it('"Try Again" button reloads the page', async () => {
    const user = userEvent.setup();
    // jsdom's location.reload is non-configurable, so mock the whole location
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: Object.assign(
        Object.create(Object.getPrototypeOf(originalLocation) as object),
        originalLocation,
        { reload: reloadMock },
      ),
      writable: true,
      configurable: true,
    });

    renderRouteError();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reloadMock).toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('"Go Home" link navigates to root', () => {
    renderRouteError();

    const link = screen.getByRole('link', { name: /go home/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders error details section with error message', () => {
    renderRouteError();

    expect(screen.getByText(/test route error/i)).toBeInTheDocument();
  });

  it('handles non-Error route errors gracefully', () => {
    // Component that throws a Response (react-router uses Response objects for 404s etc.)
    function ThrowResponseComponent(): never {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response('Not Found', { status: 404 });
    }

    const router = createMemoryRouter(
      [
        {
          path: '/test',
          element: <ThrowResponseComponent />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ['/test'] },
    );

    render(
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('does not crash when reportError throws', () => {
    mockReportError.mockImplementation(() => {
      throw new Error('Report failed');
    });

    renderRouteError();

    // Should still show error UI
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('renders at different route paths', () => {
    renderRouteError('/admin', '/admin');

    expect(screen.getByText(/\/admin/)).toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/admin') as unknown,
      }),
    );
  });
});
