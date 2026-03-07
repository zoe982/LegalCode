import { describe, it, expect } from 'vitest';
import {
  errorSourceSchema,
  errorSeveritySchema,
  errorStatusSchema,
  reportErrorSchema,
  errorQuerySchema,
  errorLogEntrySchema,
} from '../../src/schemas/errors.js';

describe('errorSourceSchema', () => {
  it('accepts all valid sources', () => {
    const sources = ['frontend', 'backend', 'websocket', 'functional'];
    for (const source of sources) {
      expect(errorSourceSchema.safeParse(source).success).toBe(true);
    }
  });

  it('rejects invalid sources', () => {
    expect(errorSourceSchema.safeParse('unknown').success).toBe(false);
    expect(errorSourceSchema.safeParse('').success).toBe(false);
    expect(errorSourceSchema.safeParse(42).success).toBe(false);
  });
});

describe('errorSeveritySchema', () => {
  it('accepts all valid severities', () => {
    const severities = ['error', 'warning', 'critical'];
    for (const severity of severities) {
      expect(errorSeveritySchema.safeParse(severity).success).toBe(true);
    }
  });

  it('rejects invalid severities', () => {
    expect(errorSeveritySchema.safeParse('info').success).toBe(false);
    expect(errorSeveritySchema.safeParse('').success).toBe(false);
  });
});

describe('errorStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['open', 'resolved'];
    for (const status of statuses) {
      expect(errorStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid statuses', () => {
    expect(errorStatusSchema.safeParse('closed').success).toBe(false);
    expect(errorStatusSchema.safeParse('').success).toBe(false);
  });
});

describe('reportErrorSchema', () => {
  it('accepts valid minimal input', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'Something broke',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = reportErrorSchema.safeParse({
      source: 'backend',
      severity: 'critical',
      message: 'Database connection failed',
      stack: 'Error: DB fail\n  at connect (db.ts:10)',
      metadata: '{"retries":3}',
      url: '/api/templates',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null stack, metadata, url', () => {
    const result = reportErrorSchema.safeParse({
      source: 'websocket',
      message: 'Connection lost',
      stack: null,
      metadata: null,
      url: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional severity (defaults handled by service)', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'Minor issue',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBeUndefined();
    }
  });

  it('rejects empty message', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects message exceeding 5000 chars', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects stack exceeding 50000 chars', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'error',
      stack: 'x'.repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects metadata exceeding 50000 chars', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'error',
      metadata: 'x'.repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects url exceeding 2000 chars', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      message: 'error',
      url: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid source', () => {
    const result = reportErrorSchema.safeParse({
      source: 'invalid',
      message: 'error',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
      severity: 'info',
      message: 'error',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing source', () => {
    const result = reportErrorSchema.safeParse({
      message: 'error',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing message', () => {
    const result = reportErrorSchema.safeParse({
      source: 'frontend',
    });
    expect(result.success).toBe(false);
  });
});

describe('errorQuerySchema', () => {
  it('accepts empty query (all optional)', () => {
    const result = errorQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid source filter', () => {
    const result = errorQuerySchema.safeParse({ source: 'frontend' });
    expect(result.success).toBe(true);
  });

  it('accepts valid status filter', () => {
    const result = errorQuerySchema.safeParse({ status: 'open' });
    expect(result.success).toBe(true);
  });

  it('accepts valid severity filter', () => {
    const result = errorQuerySchema.safeParse({ severity: 'critical' });
    expect(result.success).toBe(true);
  });

  it('accepts all filters combined', () => {
    const result = errorQuerySchema.safeParse({
      source: 'backend',
      status: 'resolved',
      severity: 'error',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source in query', () => {
    const result = errorQuerySchema.safeParse({ source: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status in query', () => {
    const result = errorQuerySchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity in query', () => {
    const result = errorQuerySchema.safeParse({ severity: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('errorLogEntrySchema', () => {
  const validEntry = {
    id: 'err-123',
    timestamp: '2026-03-07T10:00:00.000Z',
    source: 'frontend' as const,
    severity: 'error' as const,
    message: 'Something went wrong',
    stack: 'Error: fail\n  at foo (bar.ts:1)',
    metadata: '{"page":"/dashboard"}',
    url: '/dashboard',
    userId: 'user-1',
    status: 'open' as const,
    resolvedAt: null,
    resolvedBy: null,
    fingerprint: 'abc123def456',
    occurrenceCount: 3,
    lastSeenAt: '2026-03-07T12:00:00.000Z',
  };

  it('accepts a valid full entry', () => {
    const result = errorLogEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it('accepts resolved entry', () => {
    const result = errorLogEntrySchema.safeParse({
      ...validEntry,
      status: 'resolved',
      resolvedAt: '2026-03-07T13:00:00.000Z',
      resolvedBy: 'admin-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts entry with null optional fields', () => {
    const result = errorLogEntrySchema.safeParse({
      ...validEntry,
      stack: null,
      metadata: null,
      url: null,
      userId: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects entry with missing id', () => {
    const entryWithoutId = { ...validEntry };

    delete (entryWithoutId as Record<string, unknown>).id;
    const result = errorLogEntrySchema.safeParse(entryWithoutId);
    expect(result.success).toBe(false);
  });

  it('rejects entry with invalid source', () => {
    const result = errorLogEntrySchema.safeParse({
      ...validEntry,
      source: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects entry with non-integer occurrenceCount', () => {
    const result = errorLogEntrySchema.safeParse({
      ...validEntry,
      occurrenceCount: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects entry with occurrenceCount less than 1', () => {
    const result = errorLogEntrySchema.safeParse({
      ...validEntry,
      occurrenceCount: 0,
    });
    expect(result.success).toBe(false);
  });
});
