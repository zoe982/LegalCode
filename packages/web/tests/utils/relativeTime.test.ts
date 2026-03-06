import { describe, it, expect, vi, afterEach } from 'vitest';
import { relativeTime } from '../../src/utils/relativeTime.js';

describe('relativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for dates less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:30Z'));
    expect(relativeTime('2026-03-06T12:00:00Z')).toBe('just now');
  });

  it('returns minutes ago for dates less than 60 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:15:00Z'));
    expect(relativeTime('2026-03-06T12:00:00Z')).toBe('15m ago');
  });

  it('returns hours ago for dates less than 24 hours ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T14:00:00Z'));
    expect(relativeTime('2026-03-06T12:00:00Z')).toBe('2h ago');
  });

  it('returns "yesterday" for dates 1 day ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    expect(relativeTime('2026-03-05T12:00:00Z')).toBe('yesterday');
  });

  it('returns days ago for dates less than 30 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    expect(relativeTime('2026-02-28T12:00:00Z')).toBe('6d ago');
  });

  it('returns formatted date for dates 30 or more days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    const result = relativeTime('2026-01-01T12:00:00Z');
    // toLocaleDateString returns locale-specific format; just check it's not a relative string
    expect(result).not.toContain('ago');
    expect(result).not.toBe('just now');
    expect(result).not.toBe('yesterday');
  });

  it('returns "1m ago" for exactly 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:01:00Z'));
    expect(relativeTime('2026-03-06T12:00:00Z')).toBe('1m ago');
  });

  it('returns "1h ago" for exactly 60 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T13:00:00Z'));
    expect(relativeTime('2026-03-06T12:00:00Z')).toBe('1h ago');
  });
});
