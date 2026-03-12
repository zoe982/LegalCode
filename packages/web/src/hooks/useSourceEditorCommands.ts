import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';

export interface SourceEditorCommands {
  wrapSelection: (prefix: string, suffix?: string) => void;
  insertLinePrefix: (prefix: string) => void;
  insertBlock: (text: string) => void;
  undo: () => void;
  redo: () => void;
}

export function useSourceEditorCommands(ref: RefObject<EditorView | null>): SourceEditorCommands {
  const wrapSelection = useCallback(
    (prefix: string, suffix?: string) => {
      const view = ref.current;
      if (!view) return;

      const { from, to, empty } = view.state.selection.main;
      const resolvedSuffix = suffix ?? '';

      if (!empty) {
        const selected = view.state.doc.toString().slice(from, to);
        view.dispatch({
          changes: { from, to, insert: prefix + selected + resolvedSuffix },
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: prefix + resolvedSuffix },
          selection: { anchor: from + prefix.length },
        });
      }
    },
    [ref],
  );

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const view = ref.current;
      if (!view) return;

      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);

      if (line.text.startsWith(prefix)) {
        // Toggle off: remove the prefix
        view.dispatch({
          changes: { from: line.from, to: line.from + prefix.length, insert: '' },
        });
      } else {
        // Prepend prefix at line start
        view.dispatch({
          changes: { from: line.from, to: line.from, insert: prefix },
        });
      }
    },
    [ref],
  );

  const insertBlock = useCallback(
    (text: string) => {
      const view = ref.current;
      if (!view) return;

      const { from } = view.state.selection.main;
      view.dispatch({
        changes: { from, to: from, insert: text },
      });
    },
    [ref],
  );

  const handleUndo = useCallback(() => {
    const view = ref.current;
    if (!view) return;
    undo(view);
  }, [ref]);

  const handleRedo = useCallback(() => {
    const view = ref.current;
    if (!view) return;
    redo(view);
  }, [ref]);

  return {
    wrapSelection,
    insertLinePrefix,
    insertBlock,
    undo: handleUndo,
    redo: handleRedo,
  };
}
