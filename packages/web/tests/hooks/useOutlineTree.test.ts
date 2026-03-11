/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoisted mocks — vi.hoisted() runs before vi.mock factories
const { mockEditorViewCtx, mockExtractHeadingTree } = vi.hoisted(() => ({
  mockEditorViewCtx: Symbol('editorViewCtx'),
  mockExtractHeadingTree: vi.fn(),
}));

vi.mock('@milkdown/kit/core', () => ({
  editorViewCtx: mockEditorViewCtx,
}));

vi.mock('../../src/editor/headingTree.js', () => ({
  extractHeadingTree: (...args: unknown[]) => mockExtractHeadingTree(...args) as unknown,
}));

import { useOutlineTree } from '../../src/hooks/useOutlineTree.js';
import type { HeadingEntry } from '../../src/editor/headingTree.js';

const sampleEntries: HeadingEntry[] = [
  {
    level: 1,
    text: 'Introduction',
    pos: 0,
    endPos: 100,
    bodyPreview: 'This is intro...',
    number: '1.',
    isTitle: false,
  },
  {
    level: 2,
    text: 'Background',
    pos: 100,
    endPos: 200,
    bodyPreview: 'Background info...',
    number: '1.1',
    isTitle: false,
  },
  {
    level: 1,
    text: 'Conclusion',
    pos: 200,
    endPos: 300,
    bodyPreview: 'Final words...',
    number: '2.',
    isTitle: false,
  },
];

function createMockCrepeRef(entries: HeadingEntry[] = sampleEntries) {
  const mockView = {
    state: { doc: {} },
  };
  const mockAction = vi.fn((fn: (ctx: { get: (key: unknown) => unknown }) => void) => {
    fn({
      get: (key: unknown) => {
        if (key === mockEditorViewCtx) return mockView;
        return undefined;
      },
    });
  });
  mockExtractHeadingTree.mockReturnValue(entries);
  return {
    current: {
      editor: {
        action: mockAction,
      },
    },
    mockAction,
  };
}

describe('useOutlineTree', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty entries initially when crepeRef is null', () => {
    const crepeRef = { current: null };
    const { result } = renderHook(() => useOutlineTree(crepeRef as never));
    expect(result.current.entries).toEqual([]);
  });

  it('returns entries from extractHeadingTree when crepeRef has editor', () => {
    const { current: crepeRef, mockAction } = createMockCrepeRef(sampleEntries);
    const refObj = { current: crepeRef };
    const { result } = renderHook(() => useOutlineTree(refObj as never));

    // Initial extraction fires immediately
    expect(mockAction).toHaveBeenCalled();
    expect(result.current.entries).toEqual(sampleEntries);
  });

  it('refreshTree updates entries when called', () => {
    const updatedEntries: HeadingEntry[] = [
      {
        level: 1,
        text: 'Updated Section',
        pos: 0,
        endPos: 50,
        bodyPreview: 'Updated...',
        number: '1.',
        isTitle: false,
      },
    ];
    const { current: crepeRef, mockAction } = createMockCrepeRef(sampleEntries);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useOutlineTree(refObj as never));
    expect(result.current.entries).toEqual(sampleEntries);

    // Now change what extractHeadingTree returns
    mockExtractHeadingTree.mockReturnValue(updatedEntries);

    act(() => {
      result.current.refreshTree();
    });

    expect(mockAction).toHaveBeenCalledTimes(2); // initial + refreshTree call
    expect(result.current.entries).toEqual(updatedEntries);
  });

  it('handles editor action throwing gracefully (catch block)', () => {
    const throwingRef = {
      current: {
        editor: {
          action: vi.fn(() => {
            throw new Error('Editor not ready');
          }),
        },
      },
    };

    expect(() => {
      const { result } = renderHook(() => useOutlineTree(throwingRef as never));
      // Should not throw, entries remain empty
      expect(result.current.entries).toEqual([]);
    }).not.toThrow();
  });

  it('polls via interval and updates entries', () => {
    const { current: crepeRef } = createMockCrepeRef(sampleEntries);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useOutlineTree(refObj as never));
    const initialCallCount = mockExtractHeadingTree.mock.calls.length;

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should have been called again by the interval
    expect(mockExtractHeadingTree.mock.calls.length).toBeGreaterThan(initialCallCount);
    expect(result.current.entries).toEqual(sampleEntries);
  });

  it('cleans up interval on unmount', () => {
    const { current: crepeRef } = createMockCrepeRef(sampleEntries);
    const refObj = { current: crepeRef };

    const { unmount } = renderHook(() => useOutlineTree(refObj as never));
    const callCountBeforeUnmount = mockExtractHeadingTree.mock.calls.length;

    unmount();

    // Advance time — no additional calls should happen after unmount
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockExtractHeadingTree.mock.calls.length).toBe(callCountBeforeUnmount);
  });

  it('returns a stable refreshTree function reference', () => {
    const { current: crepeRef } = createMockCrepeRef(sampleEntries);
    const refObj = { current: crepeRef };

    const { result, rerender } = renderHook(() => useOutlineTree(refObj as never));
    const firstRefreshTree = result.current.refreshTree;
    rerender();
    expect(result.current.refreshTree).toBe(firstRefreshTree);
  });

  it('does nothing on refreshTree when crepeRef is null', () => {
    const nullRef = { current: null };
    const { result } = renderHook(() => useOutlineTree(nullRef as never));

    act(() => {
      result.current.refreshTree();
    });

    expect(mockExtractHeadingTree).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('picks up entries when crepeRef starts null then becomes available', () => {
    // Start with null ref
    const lazyRef: { current: ReturnType<typeof createMockCrepeRef>['current'] | null } = {
      current: null,
    };

    const { result } = renderHook(() => useOutlineTree(lazyRef as never));

    // Initially empty because ref is null
    expect(result.current.entries).toEqual([]);
    expect(mockExtractHeadingTree).not.toHaveBeenCalled();

    // Populate the ref (simulates editor becoming ready after mount)
    const { current: mockCrepe } = createMockCrepeRef(sampleEntries);
    act(() => {
      lazyRef.current = mockCrepe;
      vi.advanceTimersByTime(500);
    });

    // After the interval fires with a valid ref, entries should be populated
    expect(mockExtractHeadingTree).toHaveBeenCalled();
    expect(result.current.entries).toEqual(sampleEntries);
  });
});
