import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommentPositions } from '../../src/hooks/useCommentPositions.js';

// ── ResizeObserver mock ──────────────────────────────────────────────

let resizeCallback: ResizeObserverCallback | null = null;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
}

describe('useCommentPositions', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    resizeCallback = null;
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createMockRef(element: HTMLElement | null): React.RefObject<HTMLElement | null> {
    return { current: element };
  }

  function createContainerWithMarks(marks: { id: string; top: number }[]): HTMLDivElement {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    document.body.appendChild(container);

    for (const m of marks) {
      const mark = document.createElement('mark');
      mark.setAttribute('data-comment-id', m.id);
      mark.getBoundingClientRect = vi.fn().mockReturnValue({
        top: m.top,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      });
      container.appendChild(mark);
    }

    return container;
  }

  it('returns empty positions when commentIds is empty', () => {
    const container = document.createElement('div');
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, [], new Map()));

    expect(result.current).toEqual([]);
  });

  it('returns empty positions when container ref is null', () => {
    const ref = createMockRef(null);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([]);
  });

  it('positions a single comment based on mark element offsetTop', () => {
    const container = createContainerWithMarks([{ id: 'c1', top: 120 }]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 120 }]);

    document.body.removeChild(container);
  });

  it('positions multiple comments correctly', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 500 },
    ]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    expect(result.current).toEqual([
      { commentId: 'c1', top: 100 },
      { commentId: 'c2', top: 500 },
    ]);

    document.body.removeChild(container);
  });

  it('resolves collisions by pushing overlapping cards down with 12px gap and 200px fallback height', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
    ]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    // First card stays at 100, second should be pushed to 100 + 200 (CARD_MIN_HEIGHT fallback) + 12 (GAP) = 312
    expect(result.current[0]).toEqual({ commentId: 'c1', top: 100 });
    expect(result.current[1]?.top).toBe(312);

    document.body.removeChild(container);
  });

  it('uses measured heights from cardHeights map for collision resolution', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
    ]);
    const ref = createMockRef(container);
    const cardHeights = new Map([['c1', 60]]);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], cardHeights));

    // First card stays at 100, second should be pushed to 100 + 60 (measured height) + 12 (GAP) = 172
    expect(result.current[0]).toEqual({ commentId: 'c1', top: 100 });
    expect(result.current[1]?.top).toBe(172);

    document.body.removeChild(container);
  });

  it('falls back to CARD_MIN_HEIGHT when cardHeights has no entry for a comment', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);
    // Only c1 has a measured height; c2 will use fallback (200)
    const cardHeights = new Map([['c1', 50]]);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2', 'c3'], cardHeights));

    // c1 at 100
    expect(result.current[0]).toEqual({ commentId: 'c1', top: 100 });
    // c2 pushed to 100 + 50 (c1 measured) + 12 = 162
    expect(result.current[1]?.top).toBe(162);
    // c3 pushed to 162 + 200 (c2 fallback) + 12 = 374
    expect(result.current[2]?.top).toBe(374);

    document.body.removeChild(container);
  });

  it('recalculates positions when ResizeObserver fires', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    document.body.appendChild(container);

    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-id', 'c1');
    let markTop = 100;
    mark.getBoundingClientRect = vi.fn().mockImplementation(() => ({
      top: markTop,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }));
    container.appendChild(mark);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 100 }]);

    // Change position and trigger resize
    markTop = 200;
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
    });

    expect(result.current).toEqual([{ commentId: 'c1', top: 200 }]);

    document.body.removeChild(container);
  });

  it('observes the container with ResizeObserver', () => {
    const container = document.createElement('div');
    const ref = createMockRef(container);

    renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(mockObserve).toHaveBeenCalledWith(container);
  });

  it('disconnects observer on unmount', () => {
    const container = document.createElement('div');
    const ref = createMockRef(container);

    const { unmount } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('skips comment IDs without matching mark elements', () => {
    const container = createContainerWithMarks([{ id: 'c1', top: 100 }]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c-missing'], new Map()));

    // Only c1 should appear since c-missing has no mark element
    expect(result.current).toEqual([{ commentId: 'c1', top: 100 }]);

    document.body.removeChild(container);
  });

  it('recalculates when commentIds change', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 200 },
    ]);
    const ref = createMockRef(container);

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useCommentPositions(ref, ids, new Map()),
      { initialProps: { ids: ['c1'] } },
    );

    expect(result.current).toHaveLength(1);

    rerender({ ids: ['c1', 'c2'] });

    expect(result.current).toHaveLength(2);
    expect(result.current[1]).toEqual({ commentId: 'c2', top: 312 });

    document.body.removeChild(container);
  });

  it('does not set up ResizeObserver when container is null', () => {
    const ref = createMockRef(null);

    renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('sorts positions by top value', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 300 },
      { id: 'c2', top: 100 },
    ]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    // Should be sorted by top, not by comment ID order
    expect(result.current[0]?.commentId).toBe('c2');
    expect(result.current[1]?.commentId).toBe('c1');

    document.body.removeChild(container);
  });

  it('finds comment anchors using span elements (source mode)', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    document.body.appendChild(container);

    // Use span instead of mark (like ProseMirror decorations in source mode)
    const span = document.createElement('span');
    span.setAttribute('data-comment-id', 'c1');
    span.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 150,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    container.appendChild(span);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 150 }]);

    document.body.removeChild(container);
  });

  it('recalculates positions on scroll events', () => {
    const scrollParent = document.createElement('div');
    Object.defineProperty(scrollParent, 'style', {
      value: { overflowY: 'auto' },
      configurable: true,
    });
    // Make getComputedStyle return overflowY: 'auto' for scroll detection
    const originalGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      if (el === scrollParent) {
        return { overflowY: 'auto' } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(el);
    });

    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });
    scrollParent.appendChild(container);
    document.body.appendChild(scrollParent);

    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-id', 'c1');
    let markTop = 100;
    mark.getBoundingClientRect = vi.fn().mockImplementation(() => ({
      top: markTop,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }));
    container.appendChild(mark);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 100 }]);

    // Simulate scroll — positions change
    markTop = 50;
    act(() => {
      scrollParent.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual([{ commentId: 'c1', top: 50 }]);

    document.body.removeChild(scrollParent);
    vi.restoreAllMocks();
  });
});
