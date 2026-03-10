import { describe, it, expect } from 'vitest';
import { sequenceToDisplayId, displayIdToSequence } from '../../src/utils/display-id.js';

describe('display-id utility', () => {
  describe('sequenceToDisplayId', () => {
    it('converts sequence 1 to TEM-AAA-001', () => {
      expect(sequenceToDisplayId(1)).toBe('TEM-AAA-001');
    });

    it('converts sequence 999 to TEM-AAA-999', () => {
      expect(sequenceToDisplayId(999)).toBe('TEM-AAA-999');
    });

    it('converts sequence 1000 to TEM-AAB-001', () => {
      expect(sequenceToDisplayId(1000)).toBe('TEM-AAB-001');
    });

    it('converts sequence 1998 to TEM-AAB-999', () => {
      expect(sequenceToDisplayId(1998)).toBe('TEM-AAB-999');
    });

    it('converts sequence 1999 to TEM-AAC-001', () => {
      expect(sequenceToDisplayId(1999)).toBe('TEM-AAC-001');
    });

    it('converts sequence 25974 to TEM-AAZ-999', () => {
      // letterGroup = (25974-1)/999 = 25 (floor), num = ((25974-1)%999)+1 = 999
      // c0=0, c1=0, c2=25 -> A, A, Z
      expect(sequenceToDisplayId(25974)).toBe('TEM-AAZ-999');
    });

    it('converts sequence 25975 to TEM-ABA-001', () => {
      expect(sequenceToDisplayId(25975)).toBe('TEM-ABA-001');
    });

    // TEM-ZZZ-999 = letterGroup = 26*26*26 - 1 = 17575, seq = 17575*999 + 999 = 17557425
    it('converts max sequence to TEM-ZZZ-999', () => {
      const maxSeq = (25 * 676 + 25 * 26 + 25) * 999 + 999;
      expect(sequenceToDisplayId(maxSeq)).toBe('TEM-ZZZ-999');
    });

    it('pads numeric portion to 3 digits', () => {
      expect(sequenceToDisplayId(1)).toBe('TEM-AAA-001');
      expect(sequenceToDisplayId(10)).toBe('TEM-AAA-010');
      expect(sequenceToDisplayId(100)).toBe('TEM-AAA-100');
    });

    it('throws for sequence 0', () => {
      expect(() => sequenceToDisplayId(0)).toThrow();
    });

    it('throws for negative sequence', () => {
      expect(() => sequenceToDisplayId(-1)).toThrow();
    });
  });

  describe('displayIdToSequence', () => {
    it('converts TEM-AAA-001 to 1', () => {
      expect(displayIdToSequence('TEM-AAA-001')).toBe(1);
    });

    it('converts TEM-AAA-999 to 999', () => {
      expect(displayIdToSequence('TEM-AAA-999')).toBe(999);
    });

    it('converts TEM-AAB-001 to 1000', () => {
      expect(displayIdToSequence('TEM-AAB-001')).toBe(1000);
    });

    it('converts TEM-ABA-001 to 25975', () => {
      expect(displayIdToSequence('TEM-ABA-001')).toBe(25975);
    });

    it('throws for invalid format', () => {
      expect(() => displayIdToSequence('INVALID')).toThrow();
      expect(() => displayIdToSequence('TEM-AA-001')).toThrow();
      expect(() => displayIdToSequence('TEM-AAA-000')).toThrow();
      expect(() => displayIdToSequence('FOO-AAA-001')).toThrow();
    });
  });

  describe('round-trip', () => {
    it.each([1, 2, 50, 999, 1000, 1001, 5000, 25974, 25975])('round-trips sequence %d', (seq) => {
      const displayId = sequenceToDisplayId(seq);
      expect(displayIdToSequence(displayId)).toBe(seq);
    });
  });
});
