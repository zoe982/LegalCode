import { useCallback } from 'react';
import type { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { undoCommand, redoCommand } from '@milkdown/kit/plugin/history';
import { callCommand } from '@milkdown/kit/utils';
import { undoCommand as yUndoCommand, redoCommand as yRedoCommand } from 'y-prosemirror';

interface UseEditorHistoryOptions {
  crepeRef: React.RefObject<Crepe | null>;
  isCollaborative: boolean;
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useEditorHistory({
  crepeRef,
  isCollaborative,
}: UseEditorHistoryOptions): UseEditorHistoryReturn {
  const hasEditor = crepeRef.current !== null;

  const handleUndo = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;

    if (isCollaborative) {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        yUndoCommand(view.state, view.dispatch);
      });
    } else {
      crepe.editor.action(callCommand(undoCommand.key));
    }
  }, [crepeRef, isCollaborative]);

  const handleRedo = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;

    if (isCollaborative) {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        yRedoCommand(view.state, view.dispatch);
      });
    } else {
      crepe.editor.action(callCommand(redoCommand.key));
    }
  }, [crepeRef, isCollaborative]);

  return {
    canUndo: hasEditor,
    canRedo: hasEditor,
    handleUndo,
    handleRedo,
  };
}
