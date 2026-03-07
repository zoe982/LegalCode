import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const mockReportError = vi.fn();
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args) as unknown,
}));

const { useTrackedMutation } = await import('../../src/hooks/useTrackedMutation.js');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTrackedMutation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls mutationFn and returns result on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1' });
    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test-mutation',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate('input');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mutationFn).toHaveBeenCalledWith('input', expect.anything());
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it('reports error on mutation failure', async () => {
    const error = new Error('Something broke');
    error.stack = 'Error: Something broke\n  at Foo (bar.ts:10)';
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'create-template',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({ title: 'My Template' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'functional',
        message: 'Something broke',
        stack: 'Error: Something broke\n  at Foo (bar.ts:10)',
      }),
    );

    // Check metadata contains mutationLabel
    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = JSON.parse(call.metadata as string) as Record<string, unknown>;
    expect(metadata.mutationLabel).toBe('create-template');
  });

  it('calls user-provided onError callback', async () => {
    const onError = vi.fn();
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test',
          onError,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls user-provided onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const mutationFn = vi.fn().mockResolvedValue('ok');

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test',
          onSuccess,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate('input');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(onSuccess).toHaveBeenCalledWith('ok', 'input');
  });

  it('sanitizes variables — removes password/token/secret keys', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'login',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({
        username: 'alice',
        password: 'secret123',
        apiToken: 'tok-abc',
        clientSecret: 'sec-xyz',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = JSON.parse(call.metadata as string) as Record<string, unknown>;
    const vars = metadata.variables as Record<string, unknown>;
    expect(vars.username).toBe('alice');
    expect(vars.password).toBe('[REDACTED]');
    expect(vars.apiToken).toBe('[REDACTED]');
    expect(vars.clientSecret).toBe('[REDACTED]');
  });

  it('sanitizes variables — truncates long strings', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
    const longString = 'x'.repeat(300);

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate({ content: longString });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = JSON.parse(call.metadata as string) as Record<string, unknown>;
    const vars = metadata.variables as Record<string, unknown>;
    expect((vars.content as string).length).toBeLessThanOrEqual(203); // 200 + "..."
    expect((vars.content as string).endsWith('...')).toBe(true);
  });

  it('handles non-object variables in sanitization', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate('simple-string');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = JSON.parse(call.metadata as string) as Record<string, unknown>;
    expect(metadata.variables).toBe('simple-string');
  });

  it('handles null/undefined variables', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useTrackedMutation<string, undefined>({
          mutationFn,
          mutationLabel: 'test',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should not throw during sanitization
    expect(mockReportError).toHaveBeenCalled();
  });

  it('reports null stack when error has no stack property', async () => {
    const error = new Error('no stack');
    Object.defineProperty(error, 'stack', { value: undefined });
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'stackless',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.stack).toBeNull();
  });

  it('includes url in error report', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useTrackedMutation({
          mutationFn,
          mutationLabel: 'test',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const call = mockReportError.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.url).toBe(window.location.href);
  });
});
