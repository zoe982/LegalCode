import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts.js';

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onTogglePane on Ctrl+Shift+P', () => {
    const onTogglePane = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onTogglePane });
    });
    fireKey('P', { ctrlKey: true, shiftKey: true });
    expect(onTogglePane).toHaveBeenCalledTimes(1);
  });

  it('calls onTogglePane on Meta+Shift+P (Mac)', () => {
    const onTogglePane = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onTogglePane });
    });
    fireKey('P', { metaKey: true, shiftKey: true });
    expect(onTogglePane).toHaveBeenCalledTimes(1);
  });

  it('calls onEscape on Escape key', () => {
    const onEscape = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onEscape });
    });
    fireKey('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('calls onShowHelp on Ctrl+/', () => {
    const onShowHelp = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onShowHelp });
    });
    fireKey('/', { ctrlKey: true });
    expect(onShowHelp).toHaveBeenCalledTimes(1);
  });

  it('calls onShowHelp on Meta+/ (Mac)', () => {
    const onShowHelp = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onShowHelp });
    });
    fireKey('/', { metaKey: true });
    expect(onShowHelp).toHaveBeenCalledTimes(1);
  });

  it('does not call actions for unrelated keys', () => {
    const onTogglePane = vi.fn();
    const onEscape = vi.fn();
    const onShowHelp = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onTogglePane, onEscape, onShowHelp });
    });
    fireKey('a');
    expect(onTogglePane).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
    expect(onShowHelp).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => {
      useKeyboardShortcuts({ onEscape });
    });
    unmount();
    fireKey('Escape');
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('handles missing callbacks gracefully', () => {
    renderHook(() => {
      useKeyboardShortcuts({});
    });
    // Should not throw
    expect(() => {
      fireKey('P', { ctrlKey: true, shiftKey: true });
      fireKey('Escape');
      fireKey('/', { ctrlKey: true });
      fireKey('s', { ctrlKey: true });
    }).not.toThrow();
  });

  it('calls onCtrlS on Ctrl+S', () => {
    const onCtrlS = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onCtrlS });
    });
    fireKey('s', { ctrlKey: true });
    expect(onCtrlS).toHaveBeenCalledTimes(1);
  });

  it('calls onCtrlS on Meta+S (Mac)', () => {
    const onCtrlS = vi.fn();
    renderHook(() => {
      useKeyboardShortcuts({ onCtrlS });
    });
    fireKey('s', { metaKey: true });
    expect(onCtrlS).toHaveBeenCalledTimes(1);
  });
});
