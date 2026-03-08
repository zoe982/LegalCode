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

vi.mock('../../src/services/countries.js', () => ({
  countryService: {
    list: listFn,
    create: createFn,
    update: updateFn,
    remove: removeFn,
  },
}));

vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn(),
}));

const { useCountries, useCreateCountry, useUpdateCountry, useDeleteCountry } =
  await import('../../src/hooks/useCountries.js');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCountries', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns countries from the service', async () => {
    const countries = [
      { id: 'ctry-1', name: 'United States', code: 'US', createdAt: '2026-01-01T00:00:00Z' },
    ];
    listFn.mockResolvedValue({ countries });

    const { result } = renderHook(() => useCountries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ countries });
  });

  it('returns isLoading initially', () => {
    listFn.mockResolvedValue({ countries: [] });
    const { result } = renderHook(() => useCountries(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCreateCountry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls countryService.create with data', async () => {
    listFn.mockResolvedValue({ countries: [] });
    const mockCountry = {
      id: 'ctry-1',
      name: 'United States',
      code: 'US',
      createdAt: '2026-01-01T00:00:00Z',
    };
    createFn.mockResolvedValue({ country: mockCountry });

    const { result } = renderHook(() => useCreateCountry(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: 'United States', code: 'US' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createFn).toHaveBeenCalledWith({ name: 'United States', code: 'US' });
  });
});

describe('useUpdateCountry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls countryService.update with id, name, and code', async () => {
    listFn.mockResolvedValue({ countries: [] });
    const mockCountry = { id: 'ctry-1', name: 'UK', code: 'GB', createdAt: '2026-01-01T00:00:00Z' };
    updateFn.mockResolvedValue({ country: mockCountry });

    const { result } = renderHook(() => useUpdateCountry(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'ctry-1', name: 'UK', code: 'GB' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateFn).toHaveBeenCalledWith('ctry-1', { name: 'UK', code: 'GB' });
  });
});

describe('useDeleteCountry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls countryService.remove with id', async () => {
    listFn.mockResolvedValue({ countries: [] });
    removeFn.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useDeleteCountry(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('ctry-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeFn).toHaveBeenCalledWith('ctry-1');
  });
});
