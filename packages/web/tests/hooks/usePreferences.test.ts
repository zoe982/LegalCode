/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreferences } from '../../src/hooks/usePreferences.js';

const STORAGE_KEY = 'legalcode:preferences';

describe('usePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default editorMode "edit" when no localStorage', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');
  });

  it('reads editorMode from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ editorMode: 'review' }));
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('review');
  });

  it('updates localStorage when setEditorMode is called', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');

    act(() => {
      result.current.setEditorMode('review');
    });

    expect(result.current.editorMode).toBe('review');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored.editorMode).toBe('review');
  });

  it('handles localStorage getItem errors gracefully (returns defaults)', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');

    Storage.prototype.getItem = originalGetItem;
  });

  it('handles localStorage setItem errors gracefully on setEditorMode', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => usePreferences());

    // Should not throw
    act(() => {
      result.current.setEditorMode('review');
    });

    // State still updates even if localStorage fails
    expect(result.current.editorMode).toBe('review');

    Storage.prototype.setItem = originalSetItem;
  });

  it('returns defaults when stored object has invalid editorMode value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ editorMode: 'invalid-mode' }));
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');
  });

  it('returns defaults when stored object has no editorMode property', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ someOtherProp: true }));
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');
  });

  it('handles malformed JSON in localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json');
    const { result } = renderHook(() => usePreferences());
    expect(result.current.editorMode).toBe('edit');
  });

  it('setEditorMode is stable across renders', () => {
    const { result, rerender } = renderHook(() => usePreferences());
    const firstSetter = result.current.setEditorMode;
    rerender();
    expect(result.current.setEditorMode).toBe(firstSetter);
  });
});
