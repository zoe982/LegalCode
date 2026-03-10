import { describe, it, expect } from 'vitest';
import { BUILD_TIMESTAMP } from '../src/buildInfo.js';

describe('BUILD_TIMESTAMP', () => {
  it('is a non-empty string', () => {
    expect(typeof BUILD_TIMESTAMP).toBe('string');
    expect(BUILD_TIMESTAMP.length).toBeGreaterThan(0);
  });
});
