/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFirstUseTooltip } from '../../src/hooks/useFirstUseTooltip.js';

describe('useFirstUseTooltip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns shouldShow: true when localStorage key is not set', () => {
    const { result } = renderHook(() => useFirstUseTooltip('test-feature'));
    expect(result.current.shouldShow).toBe(true);
  });

  it('returns shouldShow: false when localStorage key is "true"', () => {
    localStorage.setItem('legalcode:tooltip:test-feature:dismissed', 'true');
    const { result } = renderHook(() => useFirstUseTooltip('test-feature'));
    expect(result.current.shouldShow).toBe(false);
  });

  it('dismiss() sets localStorage key to "true" and shouldShow becomes false', () => {
    const { result } = renderHook(() => useFirstUseTooltip('test-feature'));
    expect(result.current.shouldShow).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
    expect(localStorage.getItem('legalcode:tooltip:test-feature:dismissed')).toBe('true');
  });

  it('handles localStorage errors gracefully (shouldShow defaults to false)', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => useFirstUseTooltip('test-feature'));
    expect(result.current.shouldShow).toBe(false);

    Storage.prototype.getItem = originalGetItem;
  });

  it('handles localStorage setItem errors gracefully on dismiss', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => useFirstUseTooltip('test-feature'));

    // Should not throw
    act(() => {
      result.current.dismiss();
    });

    // shouldShow becomes false even if localStorage fails
    expect(result.current.shouldShow).toBe(false);

    Storage.prototype.setItem = originalSetItem;
  });

  it('uses different storage keys for different feature IDs', () => {
    const { result: result1 } = renderHook(() => useFirstUseTooltip('feature-a'));
    const { result: result2 } = renderHook(() => useFirstUseTooltip('feature-b'));

    expect(result1.current.shouldShow).toBe(true);
    expect(result2.current.shouldShow).toBe(true);

    act(() => {
      result1.current.dismiss();
    });

    expect(result1.current.shouldShow).toBe(false);
    expect(result2.current.shouldShow).toBe(true);
    expect(localStorage.getItem('legalcode:tooltip:feature-a:dismissed')).toBe('true');
    expect(localStorage.getItem('legalcode:tooltip:feature-b:dismissed')).toBeNull();
  });

  it('dismiss function is stable across renders', () => {
    const { result, rerender } = renderHook(() => useFirstUseTooltip('test-feature'));
    const firstDismiss = result.current.dismiss;
    rerender();
    expect(result.current.dismiss).toBe(firstDismiss);
  });
});
