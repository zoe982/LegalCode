import { describe, it, expect } from 'vitest';
import { captureSelection, resolveAnchors } from '../../src/editor/commentAnchors.js';

describe('commentAnchors', () => {
  describe('captureSelection', () => {
    it('returns correct anchor object', () => {
      const result = captureSelection(10, 25, 'selected text');
      expect(result).toEqual({
        anchorText: 'selected text',
        anchorFrom: '10',
        anchorTo: '25',
      });
    });

    it('truncates text to 500 chars', () => {
      const longText = 'a'.repeat(600);
      const result = captureSelection(0, 600, longText);
      expect(result.anchorText).toHaveLength(500);
    });

    it('handles empty text', () => {
      const result = captureSelection(5, 5, '');
      expect(result.anchorText).toBe('');
      expect(result.anchorFrom).toBe('5');
      expect(result.anchorTo).toBe('5');
    });

    it('serializes positions as strings', () => {
      const result = captureSelection(100, 200, 'text');
      expect(typeof result.anchorFrom).toBe('string');
      expect(typeof result.anchorTo).toBe('string');
    });
  });

  describe('resolveAnchors', () => {
    it('converts string positions to numbers', () => {
      const comments = [{ id: 'c1', anchorFrom: '10', anchorTo: '20', resolved: false }];
      const result = resolveAnchors(comments, 100);
      expect(result).toHaveLength(1);
      expect(result[0]?.from).toBe(10);
      expect(result[0]?.to).toBe(20);
      expect(result[0]?.commentId).toBe('c1');
      expect(result[0]?.resolved).toBe(false);
    });

    it('skips comments without anchors', () => {
      const comments = [
        { id: 'c1', anchorFrom: null, anchorTo: null, resolved: false },
        { id: 'c2', anchorFrom: '5', anchorTo: null, resolved: false },
        { id: 'c3', anchorFrom: null, anchorTo: '10', resolved: false },
      ];
      const result = resolveAnchors(comments, 100);
      expect(result).toHaveLength(0);
    });

    it('skips invalid positions (NaN)', () => {
      const comments = [
        { id: 'c1', anchorFrom: 'abc', anchorTo: '10', resolved: false },
        { id: 'c2', anchorFrom: '5', anchorTo: 'xyz', resolved: false },
      ];
      const result = resolveAnchors(comments, 100);
      expect(result).toHaveLength(0);
    });

    it('skips out-of-range positions', () => {
      const comments = [
        { id: 'c1', anchorFrom: '-1', anchorTo: '10', resolved: false },
        { id: 'c2', anchorFrom: '5', anchorTo: '200', resolved: false },
        { id: 'c3', anchorFrom: '20', anchorTo: '10', resolved: false },
        { id: 'c4', anchorFrom: '10', anchorTo: '10', resolved: false },
      ];
      const result = resolveAnchors(comments, 100);
      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      const result = resolveAnchors([], 100);
      expect(result).toEqual([]);
    });

    it('preserves resolved status', () => {
      const comments = [{ id: 'c1', anchorFrom: '10', anchorTo: '20', resolved: true }];
      const result = resolveAnchors(comments, 100);
      expect(result[0]?.resolved).toBe(true);
    });

    it('handles multiple valid comments', () => {
      const comments = [
        { id: 'c1', anchorFrom: '10', anchorTo: '20', resolved: false },
        { id: 'c2', anchorFrom: '30', anchorTo: '50', resolved: true },
      ];
      const result = resolveAnchors(comments, 100);
      expect(result).toHaveLength(2);
    });
  });
});
