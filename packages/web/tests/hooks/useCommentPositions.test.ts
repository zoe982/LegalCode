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

  function createContainerWithMarks(marks: { id: string; offsetTop: number }[]): HTMLDivElement {
    const container = document.createElement('div');
    document.body.appendChild(container);

    for (const m of marks) {
      const mark = document.createElement('mark');
      mark.setAttribute('data-comment-id', m.id);
      Object.defineProperty(mark, 'offsetTop', { value: m.offsetTop, configurable: true });
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
    const container = createContainerWithMarks([{ id: 'c1', offsetTop: 120 }]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 120 }]);

    document.body.removeChild(container);
  });

  it('positions multiple comments correctly', () => {
    const container = createContainerWithMarks([
      { id: 'c1', offsetTop: 100 },
      { id: 'c2', offsetTop: 500 },
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
      { id: 'c1', offsetTop: 100 },
      { id: 'c2', offsetTop: 105 },
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
      { id: 'c1', offsetTop: 100 },
      { id: 'c2', offsetTop: 105 },
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
      { id: 'c1', offsetTop: 100 },
      { id: 'c2', offsetTop: 105 },
      { id: 'c3', offsetTop: 110 },
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
    document.body.appendChild(container);

    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-id', 'c1');
    let offsetValue = 100;
    Object.defineProperty(mark, 'offsetTop', {
      get: () => offsetValue,
      configurable: true,
    });
    container.appendChild(mark);

    const ref = createMockRef(container);
    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    expect(result.current).toEqual([{ commentId: 'c1', top: 100 }]);

    // Change offsetTop and trigger resize
    offsetValue = 200;
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
    const container = createContainerWithMarks([{ id: 'c1', offsetTop: 100 }]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c-missing'], new Map()));

    // Only c1 should appear since c-missing has no mark element
    expect(result.current).toEqual([{ commentId: 'c1', top: 100 }]);

    document.body.removeChild(container);
  });

  it('recalculates when commentIds change', () => {
    const container = createContainerWithMarks([
      { id: 'c1', offsetTop: 100 },
      { id: 'c2', offsetTop: 200 },
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
      { id: 'c1', offsetTop: 300 },
      { id: 'c2', offsetTop: 100 },
    ]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    // Should be sorted by top, not by comment ID order
    expect(result.current[0]?.commentId).toBe('c2');
    expect(result.current[1]?.commentId).toBe('c1');

    document.body.removeChild(container);
  });
});
