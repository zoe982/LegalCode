import { useState, useEffect, useCallback } from 'react';

interface TextSelectionState {
  selectedText: string;
  selectionRect: DOMRect | null;
  hasSelection: boolean;
}

const defaultState: TextSelectionState = {
  selectedText: '',
  selectionRect: null,
  hasSelection: false,
};

export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>,
): TextSelectionState {
  const [state, setState] = useState<TextSelectionState>(defaultState);

  const handleSelectionChange = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setState(defaultState);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setState(defaultState);
      return;
    }

    const range = selection.getRangeAt(0);

    // Check if the selection is within the container
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      setState(defaultState);
      return;
    }

    const text = selection.toString();
    if (!text) {
      setState(defaultState);
      return;
    }

    const rect = range.getBoundingClientRect();
    setState({
      selectedText: text,
      selectionRect: rect,
      hasSelection: true,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return state;
}
