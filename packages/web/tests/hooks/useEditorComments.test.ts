import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../src/editor/commentPlugin.js', () => ({}));
vi.mock('../../src/editor/commentAnchors.js', () => ({
  captureSelection: (from: number, to: number, text: string) => ({
    anchorText: text.slice(0, 500),
    anchorFrom: String(from),
    anchorTo: String(to),
  }),
}));

// Import after mocks
const { useEditorComments } = await import('../../src/hooks/useEditorComments.js');

describe('useEditorComments', () => {
  it('returns default selectionInfo with no selection', () => {
    const { result } = renderHook(() => useEditorComments());
    expect(result.current.selectionInfo).toEqual({
      hasSelection: false,
      text: '',
      buttonPosition: null,
    });
    expect(result.current.pendingAnchor).toBeNull();
  });

  it('onSelectionChange updates selectionInfo state after debounce', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    const newInfo = {
      hasSelection: true,
      text: 'selected',
      buttonPosition: { top: 100, left: 50 },
    };
    act(() => {
      result.current.onSelectionChange(newInfo, { from: 10, to: 18, text: 'selected' });
    });
    // State should not yet be updated (debounced)
    expect(result.current.selectionInfo).toEqual({
      hasSelection: false,
      text: '',
      buttonPosition: null,
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.selectionInfo).toEqual(newInfo);
    vi.useRealTimers();
  });

  it('startComment creates pendingAnchor from editor selection', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'hello world', buttonPosition: { top: 50, left: 20 } },
        { from: 5, to: 16, text: 'hello world' },
      );
    });
    // editorSelectionRef is updated immediately; advance timers for state
    act(() => {
      vi.advanceTimersByTime(50);
    });
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toEqual({
      anchorText: 'hello world',
      anchorFrom: '5',
      anchorTo: '16',
    });
    vi.useRealTimers();
  });

  it('startComment does nothing without editor selection', () => {
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
  });

  it('cancelComment clears pendingAnchor', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'text', buttonPosition: { top: 50, left: 20 } },
        { from: 0, to: 4, text: 'text' },
      );
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).not.toBeNull();
    act(() => {
      result.current.cancelComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
    vi.useRealTimers();
  });

  it('onSelectionChange without editorSelection clears ref', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    // First set an editor selection
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'text', buttonPosition: { top: 50, left: 20 } },
        { from: 0, to: 4, text: 'text' },
      );
    });
    // Then clear it (ref is updated immediately, not debounced)
    act(() => {
      result.current.onSelectionChange({ hasSelection: false, text: '', buttonPosition: null });
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // startComment should do nothing since ref is cleared
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
    vi.useRealTimers();
  });

  it('returns stable callback references', () => {
    const { result, rerender } = renderHook(() => useEditorComments());
    const first = {
      onSelectionChange: result.current.onSelectionChange,
      startComment: result.current.startComment,
      cancelComment: result.current.cancelComment,
    };
    rerender();
    expect(result.current.onSelectionChange).toBe(first.onSelectionChange);
    expect(result.current.startComment).toBe(first.startComment);
    expect(result.current.cancelComment).toBe(first.cancelComment);
  });

  it('debounces rapid onSelectionChange calls', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    const info = (n: number) => ({
      hasSelection: true,
      text: `sel${String(n)}`,
      buttonPosition: { top: n, left: 0 },
    });
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.onSelectionChange(info(i), { from: i, to: i + 1, text: `sel${String(i)}` });
      }
    });
    // State must not have updated yet
    expect(result.current.selectionInfo.hasSelection).toBe(false);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // After debounce, state should have updated exactly once with the latest value
    expect(result.current.selectionInfo).toEqual(info(4));
    vi.useRealTimers();
  });

  it('uses latest selection info after debounce', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEditorComments());
    const info1 = { hasSelection: true, text: 'first', buttonPosition: { top: 10, left: 0 } };
    const info2 = { hasSelection: true, text: 'second', buttonPosition: { top: 20, left: 0 } };
    act(() => {
      result.current.onSelectionChange(info1, { from: 0, to: 5, text: 'first' });
      result.current.onSelectionChange(info2, { from: 0, to: 6, text: 'second' });
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.selectionInfo).toEqual(info2);
    vi.useRealTimers();
  });
});
