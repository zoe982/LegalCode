import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuth } from '../../src/hooks/useAuth.js';
import { authService } from '../../src/services/auth.js';

vi.mock('../../src/services/auth.js', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    startLogin: vi.fn(),
  },
}));

const mockedAuthService = vi.mocked(authService);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuth', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValue({
      id: '1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.email).toBe('alice@acasus.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null when not authenticated', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('provides login function', () => {
    mockedAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(typeof result.current.login).toBe('function');
  });

  it('clears user data on successful logout', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValue({
      id: '1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
    });
    mockedAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Wait for initial auth data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(true);

    // Trigger logout
    result.current.logout();

    // After logout succeeds, user should be null
    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('exposes isLoggingOut while logout is pending', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValue({
      id: '1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
    });
    // Make logout hang so isPending stays true
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let resolveLogout: () => void = () => {};
    mockedAuthService.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger logout
    result.current.logout();

    await waitFor(() => {
      expect(result.current.isLoggingOut).toBe(true);
    });

    // Resolve logout
    resolveLogout();

    await waitFor(() => {
      expect(result.current.isLoggingOut).toBe(false);
    });
  });

  it('login calls authService.startLogin', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValue(null);
    mockedAuthService.startLogin.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    void result.current.login();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedAuthService.startLogin).toHaveBeenCalledTimes(1);
  });
});
