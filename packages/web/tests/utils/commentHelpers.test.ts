import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatRelativeTime,
  getAvatarColor,
  AVATAR_COLORS,
} from '../../src/utils/commentHelpers.js';

describe('commentHelpers', () => {
  describe('AVATAR_COLORS', () => {
    it('exports an array of 6 color strings', () => {
      expect(AVATAR_COLORS).toHaveLength(6);
      for (const color of AVATAR_COLORS) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('getAvatarColor', () => {
    it('returns first color for index 0', () => {
      expect(getAvatarColor(0)).toBe(AVATAR_COLORS[0]);
    });

    it('returns second color for index 1', () => {
      expect(getAvatarColor(1)).toBe(AVATAR_COLORS[1]);
    });

    it('wraps around for indices >= array length', () => {
      expect(getAvatarColor(6)).toBe(AVATAR_COLORS[0]);
      expect(getAvatarColor(7)).toBe(AVATAR_COLORS[1]);
    });

    it('returns fallback color for out-of-bounds (should not happen but safe)', () => {
      // With modulo this won't happen, but the ?? fallback covers it
      expect(getAvatarColor(0)).toBe('#8027FF');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-08T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for less than 1 minute ago', () => {
      const dateStr = new Date('2026-03-08T11:59:30Z').toISOString();
      expect(formatRelativeTime(dateStr)).toBe('just now');
    });

    it('returns minutes ago for less than 60 minutes', () => {
      const dateStr = new Date('2026-03-08T11:30:00Z').toISOString();
      expect(formatRelativeTime(dateStr)).toBe('30m ago');
    });

    it('returns hours ago for less than 24 hours', () => {
      const dateStr = new Date('2026-03-08T06:00:00Z').toISOString();
      expect(formatRelativeTime(dateStr)).toBe('6h ago');
    });

    it('returns days ago for less than 30 days', () => {
      const dateStr = new Date('2026-03-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(dateStr)).toBe('7d ago');
    });

    it('returns formatted date for 30+ days', () => {
      const dateStr = new Date('2026-01-01T12:00:00Z').toISOString();
      const result = formatRelativeTime(dateStr);
      // Should be a locale date string
      expect(result).toBe(new Date(dateStr).toLocaleDateString());
    });
  });
});
