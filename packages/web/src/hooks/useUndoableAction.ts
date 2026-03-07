import { useCallback, useRef, createElement } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@mui/material';
import { useToast } from '../components/Toast.js';

interface UseUndoableActionOptions<T> {
  action: (value: T) => void | Promise<void>;
  undoAction: (previousValue: T) => void | Promise<void>;
  successMessage: string;
}

interface UseUndoableActionReturn<T> {
  execute: (newValue: T, previousValue: T) => void;
}

export function useUndoableAction<T>({
  action,
  undoAction,
  successMessage,
}: UseUndoableActionOptions<T>): UseUndoableActionReturn<T> {
  const { showToast } = useToast();
  const undoRef = useRef<{ previousValue: T } | null>(null);

  const execute = useCallback(
    (newValue: T, previousValue: T) => {
      undoRef.current = { previousValue };
      void Promise.resolve(action(newValue));

      const undoButton = createElement(
        Button,
        {
          size: 'small' as const,
          onClick: () => {
            if (undoRef.current) {
              void Promise.resolve(undoAction(undoRef.current.previousValue));
              undoRef.current = null;
            }
          },
          sx: {
            color: '#8027FF',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
            minWidth: 0,
            padding: '2px 8px',
          },
        },
        'Undo',
      ) as ReactNode;

      showToast(successMessage, 'success', undoButton);
    },
    [action, undoAction, successMessage, showToast],
  );

  return { execute };
}
