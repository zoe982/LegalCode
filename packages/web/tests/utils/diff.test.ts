import { describe, it, expect } from 'vitest';
import { computeDiff, type DiffLine } from '../../src/utils/diff.js';

describe('computeDiff', () => {
  it('returns empty array for two empty strings', () => {
    const result = computeDiff('', '');
    expect(result).toEqual([]);
  });

  it('returns all unchanged lines for identical strings', () => {
    const text = 'line 1\nline 2\nline 3';
    const result = computeDiff(text, text);
    expect(result).toEqual([
      { type: 'unchanged', text: 'line 1' },
      { type: 'unchanged', text: 'line 2' },
      { type: 'unchanged', text: 'line 3' },
    ] satisfies DiffLine[]);
  });

  it('detects a single added line', () => {
    const oldText = 'line 1\nline 3';
    const newText = 'line 1\nline 2\nline 3';
    const result = computeDiff(oldText, newText);
    expect(result).toEqual([
      { type: 'unchanged', text: 'line 1' },
      { type: 'added', text: 'line 2' },
      { type: 'unchanged', text: 'line 3' },
    ] satisfies DiffLine[]);
  });

  it('detects a single removed line', () => {
    const oldText = 'line 1\nline 2\nline 3';
    const newText = 'line 1\nline 3';
    const result = computeDiff(oldText, newText);
    expect(result).toEqual([
      { type: 'unchanged', text: 'line 1' },
      { type: 'removed', text: 'line 2' },
      { type: 'unchanged', text: 'line 3' },
    ] satisfies DiffLine[]);
  });

  it('detects mixed changes correctly', () => {
    const oldText = 'alpha\nbeta\ngamma\ndelta';
    const newText = 'alpha\ngamma\nepsilon\ndelta';
    const result = computeDiff(oldText, newText);
    expect(result).toEqual([
      { type: 'unchanged', text: 'alpha' },
      { type: 'removed', text: 'beta' },
      { type: 'unchanged', text: 'gamma' },
      { type: 'added', text: 'epsilon' },
      { type: 'unchanged', text: 'delta' },
    ] satisfies DiffLine[]);
  });

  it('handles old text empty and new text with content', () => {
    const result = computeDiff('', 'new line');
    expect(result).toEqual([{ type: 'added', text: 'new line' }] satisfies DiffLine[]);
  });

  it('handles old text with content and new text empty', () => {
    const result = computeDiff('old line', '');
    expect(result).toEqual([{ type: 'removed', text: 'old line' }] satisfies DiffLine[]);
  });

  it('handles completely different content', () => {
    const result = computeDiff('aaa\nbbb', 'ccc\nddd');
    expect(result).toEqual([
      { type: 'removed', text: 'aaa' },
      { type: 'removed', text: 'bbb' },
      { type: 'added', text: 'ccc' },
      { type: 'added', text: 'ddd' },
    ] satisfies DiffLine[]);
  });
});
