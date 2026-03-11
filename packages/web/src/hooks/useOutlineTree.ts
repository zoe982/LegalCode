import { useState, useEffect, useCallback } from 'react';
import type { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { extractHeadingTree, type HeadingEntry } from '../editor/headingTree.js';

export function useOutlineTree(crepeRef: React.RefObject<Crepe | null>): {
  entries: HeadingEntry[];
  refreshTree: () => void;
} {
  const [entries, setEntries] = useState<HeadingEntry[]>([]);

  const refreshTree = useCallback(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    try {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const tree = extractHeadingTree(view.state.doc);
        setEntries(tree);
      });
    } catch {
      // Editor may not be ready
    }
  }, [crepeRef]);

  // Subscribe to editor updates via polling interval.
  // Do NOT bail out when crepeRef.current is null on mount — refreshTree already
  // handles a null ref gracefully, and the interval must stay alive so it can
  // pick up the editor once it becomes available.
  useEffect(() => {
    refreshTree();
    const interval = setInterval(refreshTree, 500);
    return () => {
      clearInterval(interval);
    };
  }, [crepeRef, refreshTree]);

  return { entries, refreshTree };
}
