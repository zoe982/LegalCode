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
    getLoginUrl: vi.fn().mockReturnValue('/api/auth/google'),
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

  it('provides login URL', () => {
    mockedAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.loginUrl).toBe('/api/auth/google');
  });
});
