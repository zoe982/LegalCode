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

vi.mock('../../src/services/companies.js', () => ({
  companyService: {
    list: listFn,
    create: createFn,
    update: updateFn,
    remove: removeFn,
  },
}));

vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn(),
}));

const { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } =
  await import('../../src/hooks/useCompanies.js');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCompanies', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns companies from the service', async () => {
    const companies = [{ id: 'com-1', name: 'Acme Corp', createdAt: '2026-01-01T00:00:00Z' }];
    listFn.mockResolvedValue({ companies });

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ companies });
  });

  it('returns isLoading initially', () => {
    listFn.mockResolvedValue({ companies: [] });
    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCreateCompany', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls companyService.create with data', async () => {
    listFn.mockResolvedValue({ companies: [] });
    const mockCompany = { id: 'com-1', name: 'Acme Corp', createdAt: '2026-01-01T00:00:00Z' };
    createFn.mockResolvedValue({ company: mockCompany });

    const { result } = renderHook(() => useCreateCompany(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: 'Acme Corp' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createFn).toHaveBeenCalledWith({ name: 'Acme Corp' });
  });
});

describe('useUpdateCompany', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls companyService.update with id and name', async () => {
    listFn.mockResolvedValue({ companies: [] });
    const mockCompany = { id: 'com-1', name: 'Updated Corp', createdAt: '2026-01-01T00:00:00Z' };
    updateFn.mockResolvedValue({ company: mockCompany });

    const { result } = renderHook(() => useUpdateCompany(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'com-1', name: 'Updated Corp' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateFn).toHaveBeenCalledWith('com-1', { name: 'Updated Corp' });
  });
});

describe('useDeleteCompany', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls companyService.remove with id', async () => {
    listFn.mockResolvedValue({ companies: [] });
    removeFn.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useDeleteCompany(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('com-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeFn).toHaveBeenCalledWith('com-1');
  });
});
