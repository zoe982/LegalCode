import { describe, it, expect } from 'vitest';
import { auditActionSchema } from '../../src/schemas/index.js';

describe('auditActionSchema', () => {
  it('accepts all valid audit actions', () => {
    const actions = ['create', 'update', 'publish', 'archive', 'export', 'login', 'client_error'];
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
});
