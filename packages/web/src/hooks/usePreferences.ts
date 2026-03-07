import { useState, useCallback } from 'react';

type EditorMode = 'edit' | 'review';

interface Preferences {
  editorMode: EditorMode;
}

interface UsePreferencesReturn {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
}

const STORAGE_KEY = 'legalcode:preferences';

const DEFAULT_PREFERENCES: Preferences = {
  editorMode: 'edit',
};

function isValidEditorMode(value: unknown): value is EditorMode {
  return value === 'edit' || value === 'review';
}

function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_PREFERENCES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'editorMode' in parsed) {
      const candidate = (parsed as Record<string, unknown>).editorMode;
      if (isValidEditorMode(candidate)) {
        return { editorMode: candidate };
      }
    }
    return DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function usePreferences(): UsePreferencesReturn {
  const [editorMode, setEditorModeState] = useState<EditorMode>(() => readPreferences().editorMode);

  const setEditorMode = useCallback((mode: EditorMode) => {
    setEditorModeState(mode);
    writePreferences({ editorMode: mode });
  }, []);

  return { editorMode, setEditorMode };
}
