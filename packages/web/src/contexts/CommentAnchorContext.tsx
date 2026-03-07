import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

interface PendingAnchor {
  anchorText: string;
  anchorFrom: string;
  anchorTo: string;
}

interface CommentAnchorContextValue {
  pendingAnchor: PendingAnchor | null;
  activeCommentId: string | null;
  setPendingAnchor: (anchor: PendingAnchor) => void;
  clearPendingAnchor: () => void;
  setActiveCommentId: (id: string | null) => void;
}

const CommentAnchorContext = createContext<CommentAnchorContextValue | null>(null);

export function CommentAnchorProvider({ children }: { children: ReactNode }) {
  const [pendingAnchor, setPendingAnchorState] = useState<PendingAnchor | null>(null);
  const [activeCommentId, setActiveCommentIdState] = useState<string | null>(null);

  const setPendingAnchor = useCallback((anchor: PendingAnchor) => {
    setPendingAnchorState(anchor);
  }, []);

  const clearPendingAnchor = useCallback(() => {
    setPendingAnchorState(null);
  }, []);

  const setActiveCommentId = useCallback((id: string | null) => {
    setActiveCommentIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      pendingAnchor,
      activeCommentId,
      setPendingAnchor,
      clearPendingAnchor,
      setActiveCommentId,
    }),
    [pendingAnchor, activeCommentId, setPendingAnchor, clearPendingAnchor, setActiveCommentId],
  );

  return <CommentAnchorContext.Provider value={value}>{children}</CommentAnchorContext.Provider>;
}

export function useCommentAnchor(): CommentAnchorContextValue {
  const ctx = useContext(CommentAnchorContext);
  if (!ctx) {
    throw new Error('useCommentAnchor must be used within a CommentAnchorProvider');
  }
  return ctx;
}
