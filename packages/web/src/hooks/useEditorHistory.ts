import { useCallback } from 'react';
import type { Crepe } from '@milkdown/crepe';
import { undoCommand, redoCommand } from '@milkdown/kit/plugin/history';
import { callCommand } from '@milkdown/kit/utils';

interface UseEditorHistoryOptions {
  crepeRef: React.RefObject<Crepe | null>;
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useEditorHistory({ crepeRef }: UseEditorHistoryOptions): UseEditorHistoryReturn {
  const hasEditor = crepeRef.current !== null;

  const handleUndo = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;

    crepe.editor.action(callCommand(undoCommand.key));
  }, [crepeRef]);

  const handleRedo = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;

    crepe.editor.action(callCommand(redoCommand.key));
  }, [crepeRef]);

  return {
    canUndo: hasEditor,
    canRedo: hasEditor,
    handleUndo,
    handleRedo,
  };
}
