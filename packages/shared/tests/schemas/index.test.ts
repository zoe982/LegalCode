import { describe, it, expect } from 'vitest';
import { auditActionSchema } from '../../src/schemas/index.js';
import { isAutoVersion } from '../../src/schemas/index.js';

describe('auditActionSchema', () => {
  it('accepts all valid audit actions', () => {
    const actions = [
      'create',
      'update',
      'publish',
      'archive',
      'unarchive',
      'export',
      'login',
      'client_error',
    ];
    for (const action of actions) {
      expect(auditActionSchema.safeParse(action).success).toBe(true);
    }
  });

  it('rejects invalid audit actions', () => {
    expect(auditActionSchema.safeParse('invalid').success).toBe(false);
    expect(auditActionSchema.safeParse('').success).toBe(false);
  });

  it('includes client_error for error reporting', () => {
    const result = auditActionSchema.safeParse('client_error');
    expect(result.success).toBe(true);
  });

  it('includes unarchive action', () => {
    const result = auditActionSchema.safeParse('unarchive');
    expect(result.success).toBe(true);
  });
});

describe('isAutoVersion', () => {
  it('returns true for changeSummary starting with [auto]', () => {
    expect(isAutoVersion('[auto] Checkpoint')).toBe(true);
    expect(isAutoVersion('[auto] Session close')).toBe(true);
    expect(isAutoVersion('[auto]')).toBe(true);
  });

  it('returns false for null changeSummary', () => {
    expect(isAutoVersion(null)).toBe(false);
  });

  it('returns false for manual changeSummary', () => {
    expect(isAutoVersion('Manual save')).toBe(false);
    expect(isAutoVersion('Updated section 2')).toBe(false);
    expect(isAutoVersion('Initial version')).toBe(false);
  });

  it('returns false for changeSummary containing [auto] but not at start', () => {
    expect(isAutoVersion('Not [auto] at start')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAutoVersion('')).toBe(false);
  });
});
