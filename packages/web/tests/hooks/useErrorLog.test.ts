import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const mockList = vi.fn();
const mockResolve = vi.fn();
vi.mock('../../src/services/errorLog.js', () => ({
  errorLogService: {
    list: (...args: unknown[]) => mockList(...args) as unknown,
    resolve: (...args: unknown[]) => mockResolve(...args) as unknown,
  },
}));

const { useErrorLog, useResolveError } = await import('../../src/hooks/useErrorLog.js');

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useErrorLog', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches error log with no filters', async () => {
    mockList.mockResolvedValue({ errors: [] });

    const wrapper = makeWrapper(makeQueryClient());
    const { result } = renderHook(() => useErrorLog(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockList).toHaveBeenCalledWith(undefined);
  });

  it('fetches error log with filters', async () => {
    mockList.mockResolvedValue({ errors: [] });

    const wrapper = makeWrapper(makeQueryClient());
    const { result } = renderHook(() => useErrorLog({ source: 'frontend', status: 'open' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockList).toHaveBeenCalledWith({ source: 'frontend', status: 'open' });
  });

  it('returns loading state initially', () => {
    mockList.mockReturnValue(new Promise(() => undefined));

    const wrapper = makeWrapper(makeQueryClient());
    const { result } = renderHook(() => useErrorLog(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useResolveError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls resolve and invalidates queries on success', async () => {
    mockResolve.mockResolvedValue({ ok: true });

    const queryClient = makeQueryClient();
    const wrapper = makeWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useResolveError(), { wrapper });

    act(() => {
      result.current.mutate('err-123');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockResolve).toHaveBeenCalledWith('err-123');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'errors'] });
  });
});
