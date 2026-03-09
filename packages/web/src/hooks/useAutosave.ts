import { useState, useRef, useEffect, useCallback } from 'react';
import { templateService } from '../services/templates.js';

interface UseAutosaveOptions {
  templateId: string | undefined;
  content: string;
  title: string;
  enabled: boolean;
}

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveReturn {
  saveState: AutosaveState;
  lastSavedAt: string | null;
  saveNow: () => void;
}

export function useAutosave({
  templateId,
  content,
  title,
  enabled,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [saveState, setSaveState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const lastSavedContentRef = useRef(content);
  const lastSavedTitleRef = useRef(title);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep current values in refs for the save function
  const contentRef = useRef(content);
  contentRef.current = content;
  const titleRef = useRef(title);
  titleRef.current = title;
  const templateIdRef = useRef(templateId);
  templateIdRef.current = templateId;

  const performSave = useCallback(() => {
    const currentContent = contentRef.current;
    const currentTitle = titleRef.current;
    const currentTemplateId = templateIdRef.current;

    if (!currentTemplateId) return;

    // Skip no-op saves
    if (
      currentContent === lastSavedContentRef.current &&
      currentTitle === lastSavedTitleRef.current
    ) {
      return;
    }

    setSaveState('saving');

    const payload: { content: string; title?: string } = { content: currentContent };
    if (currentTitle) {
      payload.title = currentTitle;
    }

    templateService
      .autosaveDraft(currentTemplateId, payload)
      .then((result) => {
        lastSavedContentRef.current = currentContent;
        lastSavedTitleRef.current = currentTitle;
        setLastSavedAt(result.updatedAt);
        setSaveState('saved');
      })
      .catch(() => {
        setSaveState('error');
        // Schedule retry after 5s
        retryTimerRef.current = setTimeout(() => {
          performSave();
        }, 5000);
      });
  }, []);

  // Debounce effect: trigger save 2s after content/title changes
  useEffect(() => {
    if (!enabled || !templateId) {
      return;
    }

    // Skip if nothing changed from last saved values
    if (content === lastSavedContentRef.current && title === lastSavedTitleRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      performSave();
    }, 2000);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [content, title, enabled, templateId, performSave]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const saveNow = useCallback(() => {
    // Clear debounce timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    performSave();
  }, [performSave]);

  return { saveState, lastSavedAt, saveNow };
}
