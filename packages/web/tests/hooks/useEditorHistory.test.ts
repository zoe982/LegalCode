/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const {
  mockYUndoCommand,
  mockYRedoCommand,
  mockEditorViewCtx,
  mockUndoCommandKey,
  mockRedoCommandKey,
  mockCallCommand,
} = vi.hoisted(() => ({
  mockYUndoCommand: vi.fn(),
  mockYRedoCommand: vi.fn(),
  mockEditorViewCtx: Symbol('editorViewCtx'),
  mockUndoCommandKey: 'undoCommandKey',
  mockRedoCommandKey: 'redoCommandKey',
  mockCallCommand: vi.fn((key: string) => `callCommand:${key}`),
}));

vi.mock('y-prosemirror', () => ({
  undoCommand: (...args: unknown[]) => mockYUndoCommand(...args) as unknown,
  redoCommand: (...args: unknown[]) => mockYRedoCommand(...args) as unknown,
  yUndoPlugin: vi.fn(),
}));

vi.mock('@milkdown/kit/core', () => ({
  editorViewCtx: mockEditorViewCtx,
}));

vi.mock('@milkdown/kit/plugin/history', () => ({
  undoCommand: { key: mockUndoCommandKey },
  redoCommand: { key: mockRedoCommandKey },
}));

vi.mock('@milkdown/kit/utils', () => ({
  callCommand: (key: string) => mockCallCommand(key),
}));

import { useEditorHistory } from '../../src/hooks/useEditorHistory.js';

describe('useEditorHistory', () => {
  const mockAction = vi.fn();
  const mockView = {
    state: { doc: {} },
    dispatch: vi.fn(),
  };

  function createCrepeRef(hasCrepe: boolean) {
    if (!hasCrepe) {
      return { current: null };
    }
    return {
      current: {
        editor: {
          action: mockAction.mockImplementation(
            (fn: (ctx: { get: (key: unknown) => unknown }) => void) => {
              if (typeof fn === 'function') {
                fn({
                  get: (key: unknown) => {
                    if (key === mockEditorViewCtx) return mockView;
                    return undefined;
                  },
                });
              }
            },
          ),
        },
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns canUndo true when crepeRef has a value', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    expect(result.current.canUndo).toBe(true);
  });

  it('returns canRedo true when crepeRef has a value', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    expect(result.current.canRedo).toBe(true);
  });

  it('returns canUndo false when crepeRef is null', () => {
    const crepeRef = createCrepeRef(false);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    expect(result.current.canUndo).toBe(false);
  });

  it('returns canRedo false when crepeRef is null', () => {
    const crepeRef = createCrepeRef(false);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    expect(result.current.canRedo).toBe(false);
  });

  it('handleUndo is a no-op when crepeRef is null', () => {
    const crepeRef = createCrepeRef(false);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    // Should not throw
    result.current.handleUndo();
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('handleRedo is a no-op when crepeRef is null', () => {
    const crepeRef = createCrepeRef(false);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    result.current.handleRedo();
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('handleUndo calls callCommand with undoCommand.key in non-collaborative mode', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    result.current.handleUndo();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockCallCommand).toHaveBeenCalledWith(mockUndoCommandKey);
  });

  it('handleRedo calls callCommand with redoCommand.key in non-collaborative mode', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    result.current.handleRedo();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockCallCommand).toHaveBeenCalledWith(mockRedoCommandKey);
  });

  it('handleUndo calls y-prosemirror undo in collaborative mode', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: true }),
    );
    result.current.handleUndo();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockYUndoCommand).toHaveBeenCalledWith(mockView.state, mockView.dispatch);
  });

  it('handleRedo calls y-prosemirror redo in collaborative mode', () => {
    const crepeRef = createCrepeRef(true);
    const { result } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: true }),
    );
    result.current.handleRedo();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockYRedoCommand).toHaveBeenCalledWith(mockView.state, mockView.dispatch);
  });

  it('returns stable function references across re-renders', () => {
    const crepeRef = createCrepeRef(true);
    const { result, rerender } = renderHook(() =>
      useEditorHistory({ crepeRef: crepeRef as never, isCollaborative: false }),
    );
    const firstUndo = result.current.handleUndo;
    const firstRedo = result.current.handleRedo;
    rerender();
    expect(result.current.handleUndo).toBe(firstUndo);
    expect(result.current.handleRedo).toBe(firstRedo);
  });
});
