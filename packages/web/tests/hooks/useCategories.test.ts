import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const { listFn, createFn, updateFn, removeFn } = vi.hoisted(() => ({
  listFn: vi.fn(),
  createFn: vi.fn(),
  updateFn: vi.fn(),
  removeFn: vi.fn(),
}));

vi.mock('../../src/services/categories.js', () => ({
  categoryService: {
    list: listFn,
    create: createFn,
    update: updateFn,
    remove: removeFn,
  },
}));

vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn(),
}));

const { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } =
  await import('../../src/hooks/useCategories.js');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCategories', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns categories from the service', async () => {
    const categories = [{ id: 'cat-1', name: 'Contract', createdAt: '2026-01-01T00:00:00Z' }];
    listFn.mockResolvedValue({ categories });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ categories });
  });

  it('returns isLoading initially', () => {
    listFn.mockResolvedValue({ categories: [] });
    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCreateCategory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls categoryService.create with data', async () => {
    listFn.mockResolvedValue({ categories: [] });
    const mockCategory = { id: 'cat-1', name: 'Contract', createdAt: '2026-01-01T00:00:00Z' };
    createFn.mockResolvedValue({ category: mockCategory });

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: 'Contract' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createFn).toHaveBeenCalledWith({ name: 'Contract' });
  });
});

describe('useUpdateCategory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls categoryService.update with id and name', async () => {
    listFn.mockResolvedValue({ categories: [] });
    const mockCategory = { id: 'cat-1', name: 'Updated', createdAt: '2026-01-01T00:00:00Z' };
    updateFn.mockResolvedValue({ category: mockCategory });

    const { result } = renderHook(() => useUpdateCategory(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'cat-1', name: 'Updated' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateFn).toHaveBeenCalledWith('cat-1', { name: 'Updated' });
  });
});

describe('useDeleteCategory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls categoryService.remove with id', async () => {
    listFn.mockResolvedValue({ categories: [] });
    removeFn.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useDeleteCategory(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('cat-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeFn).toHaveBeenCalledWith('cat-1');
  });
});
