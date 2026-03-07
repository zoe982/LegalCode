import { useState, useCallback } from 'react';

export function useFirstUseTooltip(featureId: string): {
  shouldShow: boolean;
  dismiss: () => void;
} {
  const storageKey = `legalcode:tooltip:${featureId}:dismissed`;

  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== 'true';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  }, [storageKey]);

  return { shouldShow: visible, dismiss };
}
