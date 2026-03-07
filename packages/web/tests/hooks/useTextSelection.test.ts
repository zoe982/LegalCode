import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextSelection } from '../../src/hooks/useTextSelection.js';

function createMockRef(element: HTMLElement | null): React.RefObject<HTMLElement | null> {
  return { current: element };
}

function fireSelectionChange() {
  document.dispatchEvent(new Event('selectionchange'));
}

describe('useTextSelection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clear any selection
    window.getSelection()?.removeAllRanges();
  });

  it('returns default state when no selection exists', () => {
    const container = document.createElement('div');
    const ref = createMockRef(container);
    const { result } = renderHook(() => useTextSelection(ref));

    expect(result.current.selectedText).toBe('');
    expect(result.current.selectionRect).toBeNull();
    expect(result.current.hasSelection).toBe(false);
  });

  it('returns selection text when selection is within container', () => {
    const container = document.createElement('div');
    container.textContent = 'Hello World';
    document.body.appendChild(container);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useTextSelection(ref));

    // Create a selection within the container
    const range = document.createRange();
    const textNode = container.firstChild;
    expect(textNode).not.toBeNull();
    range.setStart(textNode as Node, 0);
    range.setEnd(textNode as Node, 5);

    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Mock getBoundingClientRect on range (jsdom Range lacks this method)
    range.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(10, 20, 50, 16));

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.selectedText).toBe('Hello');
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionRect).not.toBeNull();

    document.body.removeChild(container);
  });

  it('returns no selection when selection is outside container', () => {
    const container = document.createElement('div');
    container.textContent = 'Inside';
    document.body.appendChild(container);

    const outside = document.createElement('div');
    outside.textContent = 'Outside content';
    document.body.appendChild(outside);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useTextSelection(ref));

    // Create a selection outside the container
    const range = document.createRange();
    const textNode = outside.firstChild;
    expect(textNode).not.toBeNull();
    range.setStart(textNode as Node, 0);
    range.setEnd(textNode as Node, 7);

    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.selectedText).toBe('');
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionRect).toBeNull();

    document.body.removeChild(container);
    document.body.removeChild(outside);
  });

  it('returns no selection when containerRef is null', () => {
    const ref = createMockRef(null);
    const { result } = renderHook(() => useTextSelection(ref));

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.selectedText).toBe('');
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionRect).toBeNull();
  });

  it('cleans up event listener on unmount', () => {
    const container = document.createElement('div');
    const ref = createMockRef(container);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useTextSelection(ref));

    expect(addSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));
  });

  it('returns no selection when selection text is empty string', () => {
    const container = document.createElement('div');
    container.textContent = 'Hello World';
    document.body.appendChild(container);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useTextSelection(ref));

    // Create a range within container but mock toString to return empty
    const range = document.createRange();
    const textNode = container.firstChild;
    expect(textNode).not.toBeNull();
    range.setStart(textNode as Node, 0);
    range.setEnd(textNode as Node, 0); // collapsed range

    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Override isCollapsed to false so we reach the toString check
    Object.defineProperty(selection, 'isCollapsed', { get: () => false, configurable: true });
    // Override toString to return empty string
    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally rebinding prototype method for test
    const originalToString = Selection.prototype.toString;
    Selection.prototype.toString = vi.fn().mockReturnValue('') as unknown as () => string;

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.selectedText).toBe('');
    expect(result.current.hasSelection).toBe(false);

    // Restore
    Selection.prototype.toString = originalToString;
    document.body.removeChild(container);
  });

  it('resets selection when text is collapsed (empty)', () => {
    const container = document.createElement('div');
    container.textContent = 'Hello World';
    document.body.appendChild(container);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useTextSelection(ref));

    // First create a valid selection
    const range = document.createRange();
    const textNode = container.firstChild;
    expect(textNode).not.toBeNull();
    range.setStart(textNode as Node, 0);
    range.setEnd(textNode as Node, 5);

    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Mock getBoundingClientRect on range (jsdom Range lacks this method)
    range.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(10, 20, 50, 16));

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.hasSelection).toBe(true);

    // Now collapse selection
    selection?.removeAllRanges();

    act(() => {
      fireSelectionChange();
    });

    expect(result.current.selectedText).toBe('');
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionRect).toBeNull();

    document.body.removeChild(container);
  });
});
