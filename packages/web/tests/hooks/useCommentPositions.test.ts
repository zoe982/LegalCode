import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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

  // UPDATED: CARD_MIN_HEIGHT is now 140 (was 320)
  it('resolves collisions by pushing overlapping cards down with 12px gap and 140px fallback height', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
    ]);
    const ref = createMockRef(container);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    // First card stays at 100, second should be pushed to 100 + 140 (CARD_MIN_HEIGHT fallback) + 12 (GAP) = 252
    expect(result.current[0]).toEqual({ commentId: 'c1', top: 100 });
    expect(result.current[1]?.top).toBe(252);

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

  // UPDATED: CARD_MIN_HEIGHT is now 140 (was 320)
  it('falls back to CARD_MIN_HEIGHT when cardHeights has no entry for a comment', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);
    // Only c1 has a measured height; c2 will use fallback (140)
    const cardHeights = new Map([['c1', 50]]);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2', 'c3'], cardHeights));

    // c1 at 100
    expect(result.current[0]).toEqual({ commentId: 'c1', top: 100 });
    // c2 pushed to 100 + 50 (c1 measured) + 12 = 162
    expect(result.current[1]?.top).toBe(162);
    // c3 pushed to 162 + 140 (c2 fallback) + 12 = 314
    expect(result.current[2]?.top).toBe(314);

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

  // UPDATED: c2 should be at 100 + 140 + 12 = 252 (was 432)
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
    // c2 anchor is at 200, which is already past c1 (100) + 140 + 12 = 252, so c2 stays at 252
    // Actually: c2 anchor is at 200, min is 100+140+12=252, so c2 is at Math.max(200,252) = 252
    expect(result.current[1]).toEqual({ commentId: 'c2', top: 252 });

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

  it('recalculates when MutationObserver detects new data-comment-id elements', async () => {
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

    const ref = createMockRef(container);
    const { result } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    // Initially no mark elements, so no positions
    expect(result.current).toEqual([]);

    // Add a mark element with data-comment-id — MutationObserver should trigger recalculation
    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-id', 'c1');
    mark.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 250,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    });

    act(() => {
      container.appendChild(mark);
    });

    // MutationObserver fires asynchronously in jsdom
    await waitFor(() => {
      expect(result.current).toEqual([{ commentId: 'c1', top: 250 }]);
    });

    document.body.removeChild(container);
  });

  it('disconnects MutationObserver on unmount', () => {
    const disconnectSpy = vi.fn();
    const originalMutationObserver = globalThis.MutationObserver;
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(private cb: MutationCallback) {
          void this.cb;
        }
        observe = vi.fn();
        disconnect = disconnectSpy;
        takeRecords = vi.fn().mockReturnValue([]);
      },
    );

    const container = document.createElement('div');
    const ref = createMockRef(container);
    const { unmount } = renderHook(() => useCommentPositions(ref, ['c1'], new Map()));

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();

    vi.stubGlobal('MutationObserver', originalMutationObserver);
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

  // ── NEW TESTS ──────────────────────────────────────────────────────

  it('no two cards ever share the same vertical pixel range', () => {
    // 5 cards all anchored at the same position — after collision resolution none overlap
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 100 },
      { id: 'c3', top: 100 },
      { id: 'c4', top: 100 },
      { id: 'c5', top: 100 },
    ]);
    const ref = createMockRef(container);
    // Give each card a measured height of 80px
    const cardHeights = new Map([
      ['c1', 80],
      ['c2', 80],
      ['c3', 80],
      ['c4', 80],
      ['c5', 80],
    ]);

    const { result } = renderHook(() =>
      useCommentPositions(ref, ['c1', 'c2', 'c3', 'c4', 'c5'], cardHeights),
    );

    const positions = result.current;
    expect(positions).toHaveLength(5);

    // Verify no two cards overlap: card[i].top + height[i] + GAP <= card[i+1].top
    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      if (current == null || next == null) continue;
      const currentHeight = cardHeights.get(current.commentId) ?? 140;
      expect(current.top + currentHeight + 12).toBeLessThanOrEqual(next.top);
    }

    document.body.removeChild(container);
  });

  it('positions update when a single card height increases mid-render', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);

    // Initial heights: c1=60, c2=60
    let cardHeights = new Map([
      ['c1', 60],
      ['c2', 60],
    ]);

    const { result, rerender } = renderHook(
      ({ heights }: { heights: Map<string, number> }) =>
        useCommentPositions(ref, ['c1', 'c2', 'c3'], heights),
      { initialProps: { heights: cardHeights } },
    );

    // c1 at 100, c2 at 100+60+12=172, c3 at 172+60+12=244
    expect(result.current[0]?.top).toBe(100);
    expect(result.current[1]?.top).toBe(172);
    expect(result.current[2]?.top).toBe(244);

    // c2 height increases to 200 — all cards below should shift down
    cardHeights = new Map([
      ['c1', 60],
      ['c2', 200],
    ]);
    rerender({ heights: cardHeights });

    // c1 unchanged, c2 unchanged, c3 now at 172+200+12=384
    expect(result.current[0]?.top).toBe(100);
    expect(result.current[1]?.top).toBe(172);
    expect(result.current[2]?.top).toBe(384);

    document.body.removeChild(container);
  });

  it('positions update when a card height decreases', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);

    // Start with large c2 height
    let cardHeights = new Map([
      ['c1', 60],
      ['c2', 300],
    ]);

    const { result, rerender } = renderHook(
      ({ heights }: { heights: Map<string, number> }) =>
        useCommentPositions(ref, ['c1', 'c2', 'c3'], heights),
      { initialProps: { heights: cardHeights } },
    );

    // c3 starts at 172+300+12=484
    expect(result.current[2]?.top).toBe(484);

    // c2 height decreases to 60 — c3 should shift up
    cardHeights = new Map([
      ['c1', 60],
      ['c2', 60],
    ]);
    rerender({ heights: cardHeights });

    // c3 now at 172+60+12=244
    expect(result.current[2]?.top).toBe(244);

    document.body.removeChild(container);
  });

  it('handles rapid successive height changes without overlap', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);

    const heights = [50, 100, 200, 80, 60];
    let cardHeights = new Map([
      ['c1', heights[0] ?? 140],
      ['c2', 60],
    ]);

    const { result, rerender } = renderHook(
      ({ h }: { h: Map<string, number> }) => useCommentPositions(ref, ['c1', 'c2', 'c3'], h),
      { initialProps: { h: cardHeights } },
    );

    // Simulate rapid successive updates
    for (const h of heights) {
      cardHeights = new Map([
        ['c1', h],
        ['c2', 60],
      ]);
      rerender({ h: cardHeights });
    }

    // After final update, verify no overlaps
    const positions = result.current;
    expect(positions).toHaveLength(3);
    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      if (current == null || next == null) continue;
      const currentHeight = cardHeights.get(current.commentId) ?? 140;
      expect(current.top + currentHeight + 12).toBeLessThanOrEqual(next.top);
    }

    document.body.removeChild(container);
  });

  it('maintains document order even when cards are pushed far from anchors', () => {
    // 5 comments all on the same line (same anchor top)
    const container = createContainerWithMarks([
      { id: 'c1', top: 200 },
      { id: 'c2', top: 200 },
      { id: 'c3', top: 200 },
      { id: 'c4', top: 200 },
      { id: 'c5', top: 200 },
    ]);
    const ref = createMockRef(container);
    const cardHeights = new Map([
      ['c1', 100],
      ['c2', 100],
      ['c3', 100],
      ['c4', 100],
      ['c5', 100],
    ]);

    const { result } = renderHook(() =>
      useCommentPositions(ref, ['c1', 'c2', 'c3', 'c4', 'c5'], cardHeights),
    );

    const positions = result.current;
    expect(positions).toHaveLength(5);

    // Cards should appear in input order (all same anchor, order preserved by stable sort + input order)
    // Key requirement: positions are strictly increasing (document order preserved)
    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      if (current == null || next == null) continue;
      expect(current.top).toBeLessThan(next.top);
    }

    document.body.removeChild(container);
  });

  it('handles 10+ comments anchored to the same paragraph', () => {
    const marks = Array.from({ length: 12 }, (_, i) => ({ id: `c${String(i + 1)}`, top: 300 }));
    const container = createContainerWithMarks(marks);
    const ref = createMockRef(container);
    const cardHeights = new Map(marks.map((m) => [m.id, 80]));
    const ids = marks.map((m) => m.id);

    const { result } = renderHook(() => useCommentPositions(ref, ids, cardHeights));

    const positions = result.current;
    expect(positions).toHaveLength(12);

    // All cards must be non-overlapping
    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      if (current == null || next == null) continue;
      const currentHeight = cardHeights.get(current.commentId) ?? 140;
      expect(current.top + currentHeight + 12).toBeLessThanOrEqual(next.top);
    }

    document.body.removeChild(container);
  });

  it('handles mix of tiny (50px) and tall (400px) cards', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 }, // tall card
      { id: 'c3', top: 110 },
    ]);
    const ref = createMockRef(container);
    const cardHeights = new Map([
      ['c1', 50],
      ['c2', 400],
      ['c3', 50],
    ]);

    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2', 'c3'], cardHeights));

    const positions = result.current;
    expect(positions).toHaveLength(3);

    // c1 at 100, c2 at 100+50+12=162, c3 at 162+400+12=574
    expect(positions[0]?.top).toBe(100);
    expect(positions[1]?.top).toBe(162);
    expect(positions[2]?.top).toBe(574);

    // Gap after tall card is maintained
    const c2Pos = positions[1];
    const c3Pos = positions[2];
    if (c2Pos != null && c3Pos != null) {
      expect(c3Pos.top - (c2Pos.top + 400)).toBeGreaterThanOrEqual(12);
    }

    document.body.removeChild(container);
  });

  it('handles empty cardHeights gracefully with reduced fallback (140px, not 320px)', () => {
    const container = createContainerWithMarks([
      { id: 'c1', top: 100 },
      { id: 'c2', top: 105 },
    ]);
    const ref = createMockRef(container);

    // No heights provided — should use 140px fallback, not 320px
    const { result } = renderHook(() => useCommentPositions(ref, ['c1', 'c2'], new Map()));

    // c2 should be at 100 + 140 + 12 = 252, NOT 100 + 320 + 12 = 432
    expect(result.current[1]?.top).toBe(252);
    expect(result.current[1]?.top).not.toBe(432);

    document.body.removeChild(container);
  });
});
