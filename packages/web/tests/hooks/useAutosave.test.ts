import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../../src/hooks/useAutosave.js';
import type { TemplateStatus } from '@legalcode/shared';

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    autosaveDraft: vi.fn(),
  },
}));

import { templateService } from '../../src/services/templates.js';

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAutosave = vi.mocked(templateService.autosaveDraft);

function defaultProps() {
  return {
    templateId: 'tpl-1',
    status: 'draft' as TemplateStatus,
    content: '# Hello',
    title: 'My Template',
    enabled: true,
  };
}

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockAutosave.mockResolvedValue({ updatedAt: '2026-03-08T00:00:00Z' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useAutosave(defaultProps()));

    expect(result.current.saveState).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('does not save when disabled', async () => {
    const props = { ...defaultProps(), enabled: false };
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it('does not save when status is not draft', async () => {
    const props = { ...defaultProps(), status: 'active' as TemplateStatus };
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it('does not save when templateId is undefined', async () => {
    const props = {
      templateId: undefined as string | undefined,
      status: 'draft' as TemplateStatus,
      content: '# Hello',
      title: 'My Template',
      enabled: true,
    };
    const { rerender } = renderHook((p: typeof props) => useAutosave(p), { initialProps: props });

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it('triggers save after 2s debounce', async () => {
    const props = defaultProps();
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, content: '# Updated content' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).toHaveBeenCalledWith('tpl-1', {
      content: '# Updated content',
      title: 'My Template',
    });
  });

  it('skips save when content has not changed', async () => {
    const props = defaultProps();
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    // Rerender with exact same content
    rerender({ ...props });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it('resets debounce on rapid changes', async () => {
    const props = defaultProps();
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, content: '# First change' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    rerender({ ...props, content: '# Second change' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).toHaveBeenCalledTimes(1);
    expect(mockAutosave).toHaveBeenCalledWith('tpl-1', {
      content: '# Second change',
      title: 'My Template',
    });
  });

  it('transitions to saving then saved state', async () => {
    let resolvePromise!: (value: { updatedAt: string }) => void;
    mockAutosave.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const props = defaultProps();
    const { result, rerender } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.saveState).toBe('saving');

    act(() => {
      resolvePromise({ updatedAt: '2026-03-08T12:00:00Z' });
    });
    // Flush microtasks for the promise chain to settle
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.saveState).toBe('saved');
  });

  it('transitions to error state on failure', async () => {
    mockAutosave.mockRejectedValue(new Error('Network error'));

    const props = defaultProps();
    const { result, rerender } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.saveState).toBe('error');
  });

  it('retries after 5s on error', async () => {
    mockAutosave
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ updatedAt: '2026-03-08T12:00:00Z' });

    const props = defaultProps();
    const { result, rerender } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    rerender({ ...props, content: '# Changed' });

    // First attempt fails
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.saveState).toBe('error');
    expect(mockAutosave).toHaveBeenCalledTimes(1);

    // Retry after 5s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockAutosave).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe('saved');
  });

  it('saveNow flushes immediately', async () => {
    const props = defaultProps();
    const { result, rerender } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    rerender({ ...props, content: '# Urgent change' });

    // Call saveNow before the 2s debounce
    act(() => {
      result.current.saveNow();
    });
    // Flush microtasks for the async save to settle
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAutosave).toHaveBeenCalledWith('tpl-1', {
      content: '# Urgent change',
      title: 'My Template',
    });
  });

  it('cleans up timer on unmount', async () => {
    const props = defaultProps();
    const { rerender, unmount } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    rerender({ ...props, content: '# Changed' });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it('saves when title changes', async () => {
    const props = defaultProps();
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, title: 'Updated Title' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).toHaveBeenCalledWith('tpl-1', {
      content: '# Hello',
      title: 'Updated Title',
    });
  });

  it('saveNow is a no-op when content has not changed', async () => {
    const props = defaultProps();
    const { result } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    // Call saveNow without any content change — should skip
    act(() => {
      result.current.saveNow();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAutosave).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('idle');
  });

  it('omits title from payload when title is empty', async () => {
    const props = { ...defaultProps(), title: '' };
    const { rerender } = renderHook((p: ReturnType<typeof defaultProps>) => useAutosave(p), {
      initialProps: props,
    });

    rerender({ ...props, content: '# New content' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockAutosave).toHaveBeenCalledWith('tpl-1', {
      content: '# New content',
    });
  });

  it('updates lastSavedAt after successful save', async () => {
    mockAutosave.mockResolvedValue({ updatedAt: '2026-03-08T15:30:00Z' });

    const props = defaultProps();
    const { result, rerender } = renderHook(
      (p: ReturnType<typeof defaultProps>) => useAutosave(p),
      { initialProps: props },
    );

    expect(result.current.lastSavedAt).toBeNull();

    rerender({ ...props, content: '# Changed' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.lastSavedAt).toBe('2026-03-08T15:30:00Z');
  });
});
