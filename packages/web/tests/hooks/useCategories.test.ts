import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCategories } from '../../src/hooks/useCategories.js';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCategories', () => {
  it('returns empty categories from placeholder queryFn', async () => {
    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ categories: [] });
  });

  it('uses queryKey ["categories"]', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useCategories(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });

    await waitFor(() => {
      expect(queryClient.getQueryState(['categories'])).toBeDefined();
    });
  });

  it('returns isLoading initially', () => {
    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    // Initially loading before the query resolves
    expect(result.current.isLoading).toBe(true);
  });
});
