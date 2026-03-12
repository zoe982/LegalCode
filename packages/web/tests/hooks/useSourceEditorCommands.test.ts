/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';

// ── Mock @codemirror/commands ──────────────────────────────────────────
const mockUndo = vi.fn().mockReturnValue(true);
const mockRedo = vi.fn().mockReturnValue(true);

vi.mock('@codemirror/commands', () => ({
  undo: (...args: unknown[]) => mockUndo(...args) as boolean,
  redo: (...args: unknown[]) => mockRedo(...args) as boolean,
  defaultKeymap: [],
  history: () => ({ extension: 'history' }),
  historyKeymap: [],
}));

// ── Minimal mock of EditorView & related types ────────────────────────
interface MockLine {
  from: number;
  text: string;
}

interface MockTransaction {
  changes?: { from: number; to: number; insert: string };
  selection?: { anchor: number };
}

class MockEditorView {
  state: {
    selection: { main: { from: number; to: number; empty: boolean } };
    doc: { lineAt: (pos: number) => MockLine; toString: () => string };
  };
  dispatchedTransactions: MockTransaction[];

  constructor(
    opts: {
      selectionFrom?: number;
      selectionTo?: number;
      doc?: string;
    } = {},
  ) {
    const from = opts.selectionFrom ?? 5;
    const to = opts.selectionTo ?? 5;
    const doc = opts.doc ?? 'Hello World\nSecond line';
    this.dispatchedTransactions = [];
    this.state = {
      selection: {
        main: {
          from,
          to,
          get empty() {
            return from === to;
          },
        },
      },
      doc: {
        toString: () => doc,
        lineAt: (pos: number): MockLine => {
          const lines = doc.split('\n');
          let offset = 0;
          for (const line of lines) {
            const lineEnd = offset + line.length;
            if (pos <= lineEnd) {
              return { from: offset, text: line };
            }
            offset = lineEnd + 1;
          }
          // fallback to last line
          const lastLine = lines[lines.length - 1] ?? '';
          return { from: offset, text: lastLine };
        },
      },
    };
  }

  dispatch(tr: MockTransaction) {
    this.dispatchedTransactions.push(tr);
  }
}

import { useSourceEditorCommands } from '../../src/hooks/useSourceEditorCommands.js';

describe('useSourceEditorCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRef(view: MockEditorView | null): RefObject<MockEditorView | null> {
    return { current: view } as RefObject<MockEditorView | null>;
  }

  describe('wrapSelection', () => {
    it('wraps selected text with prefix and suffix', () => {
      const view = new MockEditorView({ selectionFrom: 0, selectionTo: 5, doc: 'Hello World' });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.wrapSelection('**', '**');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      expect(tr?.changes).toEqual({ from: 0, to: 5, insert: '**Hello**' });
    });

    it('inserts prefix+suffix at cursor when no selection, positioning cursor between them', () => {
      // Cursor at position 5 (no selection)
      const view = new MockEditorView({ selectionFrom: 5, selectionTo: 5, doc: 'Hello World' });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.wrapSelection('**', '**');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      expect(tr?.changes).toEqual({ from: 5, to: 5, insert: '****' });
      // Cursor should be positioned after prefix (inside the markers)
      expect(tr?.selection).toEqual({ anchor: 7 }); // 5 + 2 (prefix length)
    });

    it('wraps with only prefix when suffix is omitted', () => {
      const view = new MockEditorView({ selectionFrom: 0, selectionTo: 5, doc: 'Hello World' });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.wrapSelection('# ');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      expect(tr?.changes).toEqual({ from: 0, to: 5, insert: '# Hello' });
    });

    it('is a no-op when ref is null', () => {
      const ref = makeRef(null);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      // Should not throw
      expect(() => {
        result.current.wrapSelection('**', '**');
      }).not.toThrow();
    });
  });

  describe('insertLinePrefix', () => {
    it('prepends prefix to line at cursor position', () => {
      // Cursor on first line ("Hello World")
      const view = new MockEditorView({
        selectionFrom: 2,
        selectionTo: 2,
        doc: 'Hello World\nSecond line',
      });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.insertLinePrefix('- ');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      expect(tr?.changes).toEqual({ from: 0, to: 0, insert: '- ' });
    });

    it('removes prefix from line if it already starts with the prefix (toggle off)', () => {
      const view = new MockEditorView({
        selectionFrom: 2,
        selectionTo: 2,
        doc: '- Hello World\nSecond line',
      });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.insertLinePrefix('- ');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      // Remove the prefix: from line.from to line.from + prefix.length
      expect(tr?.changes).toEqual({ from: 0, to: 2, insert: '' });
    });

    it('is a no-op when ref is null', () => {
      const ref = makeRef(null);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      expect(() => {
        result.current.insertLinePrefix('# ');
      }).not.toThrow();
    });
  });

  describe('insertBlock', () => {
    it('inserts text at cursor position', () => {
      const view = new MockEditorView({ selectionFrom: 3, selectionTo: 3, doc: 'Hello' });
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.insertBlock('---');

      expect(view.dispatchedTransactions).toHaveLength(1);
      const tr = view.dispatchedTransactions[0];
      expect(tr?.changes).toEqual({ from: 3, to: 3, insert: '---' });
    });

    it('is a no-op when ref is null', () => {
      const ref = makeRef(null);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      expect(() => {
        result.current.insertBlock('---');
      }).not.toThrow();
    });
  });

  describe('undo', () => {
    it('calls undo command with the view', () => {
      const view = new MockEditorView();
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.undo();

      expect(mockUndo).toHaveBeenCalledWith(view);
    });

    it('is a no-op when ref is null', () => {
      const ref = makeRef(null);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      expect(() => {
        result.current.undo();
      }).not.toThrow();
      expect(mockUndo).not.toHaveBeenCalled();
    });
  });

  describe('redo', () => {
    it('calls redo command with the view', () => {
      const view = new MockEditorView();
      const ref = makeRef(view);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      result.current.redo();

      expect(mockRedo).toHaveBeenCalledWith(view);
    });

    it('is a no-op when ref is null', () => {
      const ref = makeRef(null);
      const { result } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      expect(() => {
        result.current.redo();
      }).not.toThrow();
      expect(mockRedo).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('returns stable function references across renders', () => {
      const view = new MockEditorView();
      const ref = makeRef(view);
      const { result, rerender } = renderHook(() =>
        useSourceEditorCommands(ref as RefObject<import('@codemirror/view').EditorView | null>),
      );

      const first = result.current;
      rerender();
      const second = result.current;

      expect(first.wrapSelection).toBe(second.wrapSelection);
      expect(first.insertLinePrefix).toBe(second.insertLinePrefix);
      expect(first.insertBlock).toBe(second.insertBlock);
      expect(first.undo).toBe(second.undo);
      expect(first.redo).toBe(second.redo);
    });
  });
});
