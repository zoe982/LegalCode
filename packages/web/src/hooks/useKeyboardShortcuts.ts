import { useEffect, useCallback } from 'react';

interface ShortcutActions {
  onTogglePane?: (() => void) | undefined;
  onEscape?: (() => void) | undefined;
  onShowHelp?: (() => void) | undefined;
  onCtrlS?: (() => void) | undefined;
}

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + Shift + P → toggle right pane
      if (mod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        actions.onTogglePane?.();
        return;
      }

      // Escape → close pane / dismiss dialog
      if (e.key === 'Escape') {
        actions.onEscape?.();
        return;
      }

      // Ctrl/Cmd + S → save shortcut intercept
      if (mod && e.key === 's') {
        e.preventDefault();
        actions.onCtrlS?.();
        return;
      }

      // Ctrl/Cmd + / → show shortcuts help
      if (mod && e.key === '/') {
        e.preventDefault();
        actions.onShowHelp?.();
      }
    },
    [actions],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
