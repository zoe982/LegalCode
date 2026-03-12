import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before vi.mock factories
// ---------------------------------------------------------------------------

const { mockEditorViewCtx, mockCanIncreaseLevel, mockCanDecreaseLevel, mockCollectHeadings } =
  vi.hoisted(() => ({
    mockEditorViewCtx: Symbol('editorViewCtx'),
    mockCanIncreaseLevel: vi.fn(),
    mockCanDecreaseLevel: vi.fn(),
    mockCollectHeadings: vi.fn(),
  }));

vi.mock('@milkdown/kit/core', () => ({
  editorViewCtx: mockEditorViewCtx,
}));

vi.mock('../../src/editor/headingLevelCommands.js', () => ({
  collectHeadings: (...args: unknown[]) => mockCollectHeadings(...args) as unknown,
  findHeadingsInRange: vi.fn(() => []),
  canIncreaseLevel: (...args: unknown[]) => mockCanIncreaseLevel(...args) as unknown,
  canDecreaseLevel: (...args: unknown[]) => mockCanDecreaseLevel(...args) as unknown,
}));

import { useHeadingLevel } from '../../src/hooks/useHeadingLevel.js';
import type { HeadingInfo, LevelChange } from '../../src/editor/headingLevelCommands.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleHeadings: HeadingInfo[] = [
  { pos: 1, level: 1, nodeSize: 20 },
  { pos: 21, level: 2, nodeSize: 20 },
];

const noChanges: { changes: LevelChange[]; blocked: boolean } = {
  changes: [],
  blocked: false,
};

const blockedResult: { changes: LevelChange[]; blocked: boolean } = {
  changes: [],
  blocked: true,
};

/**
 * Build a mock crepeRef that simulates editor.action() calling the passed
 * callback with a context that returns a mock view.
 */
function createMockCrepeRef(selectionFrom = 1, selectionTo = 1) {
  const mockView = {
    state: {
      doc: {},
      selection: {
        from: selectionFrom,
        to: selectionTo,
      },
      // Mock transaction — setNodeMarkup returns self for chaining
      get tr() {
        const mockTr = { setNodeMarkup: vi.fn().mockReturnThis() };
        return mockTr;
      },
    },
    dispatch: vi.fn(),
  };

  const mockAction = vi.fn((fn: (ctx: { get: (key: unknown) => unknown }) => void) => {
    fn({
      get: (key: unknown) => {
        if (key === mockEditorViewCtx) return mockView;
        return undefined;
      },
    });
  });

  return {
    current: {
      editor: {
        action: mockAction,
      },
    },
    mockAction,
    mockView,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useHeadingLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectHeadings.mockReturnValue(sampleHeadings);
    mockCanIncreaseLevel.mockReturnValue(noChanges);
    mockCanDecreaseLevel.mockReturnValue(noChanges);
  });

  it('returns handleIndent and handleOutdent functions', () => {
    const crepeRef = { current: null };
    const { result } = renderHook(() => useHeadingLevel(crepeRef as never));
    expect(typeof result.current.handleIndent).toBe('function');
    expect(typeof result.current.handleOutdent).toBe('function');
  });

  it('does nothing when crepeRef is null on handleIndent', () => {
    const crepeRef = { current: null };
    const { result } = renderHook(() => useHeadingLevel(crepeRef as never));
    act(() => {
      result.current.handleIndent();
    });
    expect(mockCanIncreaseLevel).not.toHaveBeenCalled();
  });

  it('does nothing when crepeRef is null on handleOutdent', () => {
    const crepeRef = { current: null };
    const { result } = renderHook(() => useHeadingLevel(crepeRef as never));
    act(() => {
      result.current.handleOutdent();
    });
    expect(mockCanDecreaseLevel).not.toHaveBeenCalled();
  });

  it('calls canIncreaseLevel with allHeadings and selection range on handleIndent', () => {
    mockCanIncreaseLevel.mockReturnValue(noChanges);
    const { current: crepeRef } = createMockCrepeRef(5, 25);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleIndent();
    });

    expect(mockCanIncreaseLevel).toHaveBeenCalledTimes(1);
    expect(mockCanIncreaseLevel).toHaveBeenCalledWith(sampleHeadings, 5, 25);
  });

  it('calls canDecreaseLevel with allHeadings and selection range on handleOutdent', () => {
    mockCanDecreaseLevel.mockReturnValue(noChanges);
    const { current: crepeRef } = createMockCrepeRef(21, 21);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleOutdent();
    });

    expect(mockCanDecreaseLevel).toHaveBeenCalledTimes(1);
    expect(mockCanDecreaseLevel).toHaveBeenCalledWith(sampleHeadings, 21, 21);
  });

  it('does not dispatch when canIncreaseLevel returns blocked=true', () => {
    mockCanIncreaseLevel.mockReturnValue(blockedResult);
    const { current: crepeRef, mockView } = createMockCrepeRef(1, 1);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleIndent();
    });

    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when canDecreaseLevel returns blocked=true', () => {
    mockCanDecreaseLevel.mockReturnValue(blockedResult);
    const { current: crepeRef, mockView } = createMockCrepeRef(1, 1);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleOutdent();
    });

    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when canIncreaseLevel returns empty changes (no-op)', () => {
    mockCanIncreaseLevel.mockReturnValue({ changes: [], blocked: false });
    const { current: crepeRef, mockView } = createMockCrepeRef(1, 1);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleIndent();
    });

    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches a transaction when canIncreaseLevel returns valid changes', () => {
    const changes: LevelChange[] = [{ pos: 21, newLevel: 3 }];
    mockCanIncreaseLevel.mockReturnValue({ changes, blocked: false });
    const { current: crepeRef, mockView } = createMockCrepeRef(21, 21);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleIndent();
    });

    expect(mockView.dispatch).toHaveBeenCalledTimes(1);
  });

  it('dispatches a transaction when canDecreaseLevel returns valid changes', () => {
    const changes: LevelChange[] = [{ pos: 21, newLevel: 1 }];
    mockCanDecreaseLevel.mockReturnValue({ changes, blocked: false });
    const { current: crepeRef, mockView } = createMockCrepeRef(21, 21);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleOutdent();
    });

    expect(mockView.dispatch).toHaveBeenCalledTimes(1);
  });

  it('dispatches a single transaction for multiple heading changes', () => {
    const changes: LevelChange[] = [
      { pos: 21, newLevel: 3 },
      { pos: 41, newLevel: 3 },
    ];
    mockCanIncreaseLevel.mockReturnValue({ changes, blocked: false });
    const { current: crepeRef, mockView } = createMockCrepeRef(21, 50);
    const refObj = { current: crepeRef };

    const { result } = renderHook(() => useHeadingLevel(refObj as never));

    act(() => {
      result.current.handleIndent();
    });

    // All changes should be batched into one dispatch
    expect(mockView.dispatch).toHaveBeenCalledTimes(1);
  });

  it('returns stable handleIndent and handleOutdent references across rerenders', () => {
    const crepeRef = { current: null };
    const { result, rerender } = renderHook(() => useHeadingLevel(crepeRef as never));

    const firstHandleIndent = result.current.handleIndent;
    const firstHandleOutdent = result.current.handleOutdent;

    rerender();

    expect(result.current.handleIndent).toBe(firstHandleIndent);
    expect(result.current.handleOutdent).toBe(firstHandleOutdent);
  });

  it('handles editor action throwing gracefully (does not crash)', () => {
    const throwingRef = {
      current: {
        editor: {
          action: vi.fn(() => {
            throw new Error('Editor not ready');
          }),
        },
      },
    };

    const { result } = renderHook(() => useHeadingLevel(throwingRef as never));

    expect(() => {
      act(() => {
        result.current.handleIndent();
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        result.current.handleOutdent();
      });
    }).not.toThrow();
  });
});
