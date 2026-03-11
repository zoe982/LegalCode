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

  // Subscribe to editor updates via polling interval
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;

    // Initial extraction
    refreshTree();

    // Poll for doc changes (ProseMirror doesn't expose a simple subscription
    // API outside of plugins, and we're in React land)
    const interval = setInterval(refreshTree, 500);
    return () => {
      clearInterval(interval);
    };
  }, [crepeRef, refreshTree]);

  return { entries, refreshTree };
}
