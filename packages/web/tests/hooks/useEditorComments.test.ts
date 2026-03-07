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

  it('onSelectionChange updates selectionInfo state', () => {
    const { result } = renderHook(() => useEditorComments());
    const newInfo = {
      hasSelection: true,
      text: 'selected',
      buttonPosition: { top: 100, left: 50 },
    };
    act(() => {
      result.current.onSelectionChange(newInfo, { from: 10, to: 18, text: 'selected' });
    });
    expect(result.current.selectionInfo).toEqual(newInfo);
  });

  it('startComment creates pendingAnchor from editor selection', () => {
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'hello world', buttonPosition: { top: 50, left: 20 } },
        { from: 5, to: 16, text: 'hello world' },
      );
    });
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toEqual({
      anchorText: 'hello world',
      anchorFrom: '5',
      anchorTo: '16',
    });
  });

  it('startComment does nothing without editor selection', () => {
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
  });

  it('cancelComment clears pendingAnchor', () => {
    const { result } = renderHook(() => useEditorComments());
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'text', buttonPosition: { top: 50, left: 20 } },
        { from: 0, to: 4, text: 'text' },
      );
    });
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).not.toBeNull();
    act(() => {
      result.current.cancelComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
  });

  it('onSelectionChange without editorSelection clears ref', () => {
    const { result } = renderHook(() => useEditorComments());
    // First set an editor selection
    act(() => {
      result.current.onSelectionChange(
        { hasSelection: true, text: 'text', buttonPosition: { top: 50, left: 20 } },
        { from: 0, to: 4, text: 'text' },
      );
    });
    // Then clear it
    act(() => {
      result.current.onSelectionChange({ hasSelection: false, text: '', buttonPosition: null });
    });
    // startComment should do nothing since ref is cleared
    act(() => {
      result.current.startComment();
    });
    expect(result.current.pendingAnchor).toBeNull();
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
});
