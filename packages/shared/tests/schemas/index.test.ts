import { describe, it, expect } from 'vitest';
import {
  auditActionSchema,
  isAutoVersion,
  createTemplateSchema,
  updateTemplateSchema,
  templateSchema,
  templateQuerySchema,
  autosaveSchema,
  autosaveResponseSchema,
  autosaveDraftSchema,
  autosaveDraftResponseSchema,
} from '../../src/schemas/index.js';

describe('auditActionSchema', () => {
  it('accepts all valid audit actions', () => {
    const actions = [
      'create',
      'update',
      'delete',
      'restore',
      'hard_delete',
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

  it('rejects removed actions (publish, archive, unarchive)', () => {
    expect(auditActionSchema.safeParse('publish').success).toBe(false);
    expect(auditActionSchema.safeParse('archive').success).toBe(false);
    expect(auditActionSchema.safeParse('unarchive').success).toBe(false);
  });

  it('includes client_error for error reporting', () => {
    const result = auditActionSchema.safeParse('client_error');
    expect(result.success).toBe(true);
  });

  it('includes delete action', () => {
    const result = auditActionSchema.safeParse('delete');
    expect(result.success).toBe(true);
  });

  it('includes restore action', () => {
    const result = auditActionSchema.safeParse('restore');
    expect(result.success).toBe(true);
  });

  it('includes hard_delete action', () => {
    const result = auditActionSchema.safeParse('hard_delete');
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

describe('templateSchema', () => {
  it('includes deletedAt and deletedBy fields', () => {
    const valid = {
      id: 't1',
      title: 'Test',
      slug: 'test-abc',
      category: 'contracts',
      description: null,
      country: null,
      currentVersion: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
      deletedBy: null,
    };
    const result = templateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts non-null deletedAt and deletedBy', () => {
    const valid = {
      id: 't1',
      title: 'Test',
      slug: 'test-abc',
      category: 'contracts',
      description: null,
      country: null,
      currentVersion: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: '2026-02-01T00:00:00Z',
      deletedBy: 'user-2',
    };
    const result = templateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('does not include status field', () => {
    const withStatus = {
      id: 't1',
      title: 'Test',
      slug: 'test-abc',
      category: 'contracts',
      description: null,
      country: null,
      status: 'draft',
      currentVersion: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
      deletedBy: null,
    };
    // Should still parse (extra keys are stripped by default in zod)
    const result = templateSchema.safeParse(withStatus);
    expect(result.success).toBe(true);
    // But the parsed data should not have status
    if (result.success) {
      expect('status' in result.data).toBe(false);
    }
  });
});

describe('templateQuerySchema', () => {
  it('does not have status field', () => {
    const result = templateQuerySchema.safeParse({ status: 'draft' });
    expect(result.success).toBe(true);
    if (result.success) {
      // status should be stripped (not in schema)
      expect('status' in result.data).toBe(false);
    }
  });

  it('parses valid query params', () => {
    const result = templateQuerySchema.safeParse({
      search: 'test',
      category: 'contracts',
      page: '2',
      limit: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('test');
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('provides defaults for page and limit', () => {
    const result = templateQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });
});

describe('autosaveSchema', () => {
  it('accepts valid input', () => {
    const result = autosaveSchema.safeParse({ content: '# Content' });
    expect(result.success).toBe(true);
  });

  it('accepts content with optional title', () => {
    const result = autosaveSchema.safeParse({ content: '# Content', title: 'My Title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = autosaveSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('backwards-compatible aliases work', () => {
    expect(autosaveDraftSchema).toBe(autosaveSchema);
    expect(autosaveDraftResponseSchema).toBe(autosaveResponseSchema);
  });
});

describe('autosaveResponseSchema', () => {
  it('accepts valid response', () => {
    const result = autosaveResponseSchema.safeParse({ updatedAt: '2026-01-01T00:00:00Z' });
    expect(result.success).toBe(true);
  });

  it('rejects missing updatedAt', () => {
    const result = autosaveResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('createTemplateSchema country field', () => {
  it('accepts 2-character country codes', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'General',
      content: '# Test',
      country: 'US',
    });
    expect(result.success).toBe(true);
  });

  it('accepts 3-character country codes', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'General',
      content: '# Test',
      country: 'USA',
    });
    expect(result.success).toBe(true);
  });

  it('rejects 1-character country codes', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'General',
      content: '# Test',
      country: 'U',
    });
    expect(result.success).toBe(false);
  });

  it('rejects 4-character country codes', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'General',
      content: '# Test',
      country: 'USAA',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null country', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'General',
      content: '# Test',
      country: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('updateTemplateSchema country field', () => {
  it('accepts 3-character country codes', () => {
    const result = updateTemplateSchema.safeParse({
      country: 'USA',
    });
    expect(result.success).toBe(true);
  });
});
