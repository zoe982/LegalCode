import { useCallback } from 'react';
import type { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import {
  collectHeadings,
  canIncreaseLevel,
  canDecreaseLevel,
} from '../editor/headingLevelCommands.js';

/**
 * Hook that provides handleIndent and handleOutdent functions for changing
 * the depth/level of ProseMirror heading nodes at the current cursor position
 * or selection.
 *
 * Uses canIncreaseLevel / canDecreaseLevel to validate the operation before
 * dispatching a ProseMirror transaction to update heading attrs.
 */
export function useHeadingLevel(crepeRef: React.RefObject<Crepe | null>): {
  handleIndent: () => void;
  handleOutdent: () => void;
} {
  const handleIndent = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    try {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { doc, selection, tr } = view.state;
        const allHeadings = collectHeadings(doc);
        const { from, to } = selection;
        const result = canIncreaseLevel(allHeadings, from, to);
        if (result.blocked || result.changes.length === 0) return;

        let transaction = tr;
        for (const change of result.changes) {
          transaction = transaction.setNodeMarkup(change.pos, null, {
            level: change.newLevel,
          });
        }
        view.dispatch(transaction);
      });
    } catch {
      // Editor may not be ready
    }
  }, [crepeRef]);

  const handleOutdent = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    try {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { doc, selection, tr } = view.state;
        const allHeadings = collectHeadings(doc);
        const { from, to } = selection;
        const result = canDecreaseLevel(allHeadings, from, to);
        if (result.blocked || result.changes.length === 0) return;

        let transaction = tr;
        for (const change of result.changes) {
          transaction = transaction.setNodeMarkup(change.pos, null, {
            level: change.newLevel,
          });
        }
        view.dispatch(transaction);
      });
    } catch {
      // Editor may not be ready
    }
  }, [crepeRef]);

  return { handleIndent, handleOutdent };
}
