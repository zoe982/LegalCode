import { useState, useCallback, useRef } from 'react';
import type { SelectionInfo } from '../editor/commentPlugin.js';
import { captureSelection, type CapturedAnchor } from '../editor/commentAnchors.js';

export interface EditorSelection {
  from: number;
  to: number;
  text: string;
}

export interface UseEditorCommentsReturn {
  selectionInfo: SelectionInfo;
  pendingAnchor: CapturedAnchor | null;
  startComment: () => void;
  cancelComment: () => void;
  onSelectionChange: (info: SelectionInfo, editorSelection?: EditorSelection) => void;
}

export function useEditorComments(): UseEditorCommentsReturn {
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo>({
    hasSelection: false,
    text: '',
    buttonPosition: null,
  });
  const [pendingAnchor, setPendingAnchor] = useState<CapturedAnchor | null>(null);
  const editorSelectionRef = useRef<EditorSelection | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSelectionChange = useCallback(
    (info: SelectionInfo, editorSelection?: EditorSelection) => {
      // Update ref immediately — used by startComment, should not be delayed
      editorSelectionRef.current = editorSelection ?? null;
      // Debounce state update to prevent layout thrash on rapid selection changes (e.g. double-click)
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setSelectionInfo(info);
        debounceTimerRef.current = null;
      }, 50);
    },
    [],
  );

  const startComment = useCallback(() => {
    const sel = editorSelectionRef.current;
    if (!sel) return;

    const anchor = captureSelection(sel.from, sel.to, sel.text);
    setPendingAnchor(anchor);
  }, []);

  const cancelComment = useCallback(() => {
    setPendingAnchor(null);
  }, []);

  return {
    selectionInfo,
    pendingAnchor,
    startComment,
    cancelComment,
    onSelectionChange,
  };
}
