import { describe, it, expect } from 'vitest';
import { resolveSuggestionAnchors } from '../../src/editor/suggestionAnchors.js';

const baseInput = (
  overrides: Partial<{
    id: string;
    type: 'insert' | 'delete';
    anchorFrom: string;
    anchorTo: string;
    originalText: string;
    replacementText: string | null;
    authorEmail: string;
  }> = {},
) => ({
  id: 's1',
  type: 'delete' as const,
  anchorFrom: '10',
  anchorTo: '20',
  originalText: 'hello',
  replacementText: null,
  authorEmail: 'user@example.com',
  ...overrides,
});

describe('resolveSuggestionAnchors', () => {
  it('empty suggestions array returns empty anchors', () => {
    const result = resolveSuggestionAnchors([], 100);
    expect(result).toEqual([]);
  });

  it('valid anchors resolve to correct positions', () => {
    const result = resolveSuggestionAnchors([baseInput()], 100);
    expect(result).toHaveLength(1);
    expect(result[0]?.suggestionId).toBe('s1');
    expect(result[0]?.from).toBe(10);
    expect(result[0]?.to).toBe(20);
    expect(result[0]?.type).toBe('delete');
    expect(result[0]?.originalText).toBe('hello');
    expect(result[0]?.replacementText).toBeNull();
    expect(result[0]?.authorEmail).toBe('user@example.com');
  });

  it('out-of-bounds anchors (from and to > docSize) clamped to docSize', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: '200', anchorTo: '300' })],
      100,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe(100);
    expect(result[0]?.to).toBe(100);
  });

  it('out-of-bounds anchor (to > docSize) is clamped to docSize', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: '10', anchorTo: '200' })],
      100,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe(10);
    expect(result[0]?.to).toBe(100);
  });

  it('both from and to negative are skipped', () => {
    // Per spec: if rawFrom < 0 && rawTo < 0 → skip before clamping
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: '-5', anchorTo: '-10' })],
      100,
    );
    expect(result).toHaveLength(0);
  });

  it('negative anchorFrom clamped to 0 when anchorTo is positive', () => {
    const result = resolveSuggestionAnchors([baseInput({ anchorFrom: '-5', anchorTo: '20' })], 100);
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe(0);
    expect(result[0]?.to).toBe(20);
  });

  it('anchorFrom > anchorTo swapped correctly (from <= to ensured)', () => {
    const result = resolveSuggestionAnchors([baseInput({ anchorFrom: '30', anchorTo: '10' })], 100);
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe(10);
    expect(result[0]?.to).toBe(30);
  });

  it('invalid anchor string (NaN from) is skipped', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: 'abc', anchorTo: '20' })],
      100,
    );
    expect(result).toHaveLength(0);
  });

  it('invalid anchor string (NaN to) is skipped', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: '10', anchorTo: 'xyz' })],
      100,
    );
    expect(result).toHaveLength(0);
  });

  it('both anchor strings are NaN — skipped', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ anchorFrom: 'abc', anchorTo: 'xyz' })],
      100,
    );
    expect(result).toHaveLength(0);
  });

  it('mixed valid and invalid anchors: only valid returned', () => {
    const result = resolveSuggestionAnchors(
      [
        baseInput({ id: 's1', anchorFrom: '10', anchorTo: '20' }),
        baseInput({ id: 's2', anchorFrom: 'bad', anchorTo: '20' }),
        baseInput({ id: 's3', anchorFrom: '30', anchorTo: '40' }),
      ],
      100,
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.suggestionId).toBe('s1');
    expect(result[1]?.suggestionId).toBe('s3');
  });

  it('docSize of 0: all valid anchors clamped to 0', () => {
    const result = resolveSuggestionAnchors([baseInput({ anchorFrom: '5', anchorTo: '10' })], 0);
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe(0);
    expect(result[0]?.to).toBe(0);
  });

  it('insert type with replacementText preserved', () => {
    const result = resolveSuggestionAnchors(
      [baseInput({ type: 'insert', anchorFrom: '5', anchorTo: '5', replacementText: 'new text' })],
      100,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe('insert');
    expect(result[0]?.replacementText).toBe('new text');
  });
});
