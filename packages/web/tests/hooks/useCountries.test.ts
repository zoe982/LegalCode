import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCountries } from '../../src/hooks/useCountries.js';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCountries', () => {
  it('returns empty countries from placeholder queryFn', async () => {
    const { result } = renderHook(() => useCountries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ countries: [] });
  });

  it('uses queryKey ["countries"]', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useCountries(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });

    await waitFor(() => {
      expect(queryClient.getQueryState(['countries'])).toBeDefined();
    });
  });

  it('returns isLoading initially', () => {
    const { result } = renderHook(() => useCountries(), {
      wrapper: createWrapper(),
    });

    // Initially loading before the query resolves
    expect(result.current.isLoading).toBe(true);
  });
});
