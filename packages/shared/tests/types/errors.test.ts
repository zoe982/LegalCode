import { describe, it, expect } from 'vitest';
import type {
  ErrorSource,
  ErrorSeverity,
  ErrorStatus,
  ErrorLogEntry,
} from '../../src/types/errors.js';

describe('error types', () => {
  it('ErrorSource includes all valid sources', () => {
    const sources: ErrorSource[] = ['frontend', 'backend', 'websocket', 'functional'];
    expect(sources).toHaveLength(4);
  });

  it('ErrorSeverity includes all valid severities', () => {
    const severities: ErrorSeverity[] = ['error', 'warning', 'critical'];
    expect(severities).toHaveLength(3);
  });

  it('ErrorStatus includes all valid statuses', () => {
    const statuses: ErrorStatus[] = ['open', 'resolved'];
    expect(statuses).toHaveLength(2);
  });

  it('ErrorLogEntry has all required fields', () => {
    const entry: ErrorLogEntry = {
      id: 'err-1',
      timestamp: '2026-03-07T10:00:00.000Z',
      source: 'frontend',
      severity: 'error',
      message: 'Test error',
      stack: null,
      metadata: null,
      url: null,
      userId: null,
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
      fingerprint: 'fp-123',
      occurrenceCount: 1,
      lastSeenAt: '2026-03-07T10:00:00.000Z',
    };
    expect(entry.id).toBe('err-1');
    expect(entry.source).toBe('frontend');
    expect(entry.status).toBe('open');
  });

  it('ErrorLogEntry supports resolved state', () => {
    const entry: ErrorLogEntry = {
      id: 'err-2',
      timestamp: '2026-03-07T10:00:00.000Z',
      source: 'backend',
      severity: 'critical',
      message: 'DB crash',
      stack: 'Error: fail\n  at db.ts:10',
      metadata: '{"retries":3}',
      url: '/api/data',
      userId: 'user-1',
      status: 'resolved',
      resolvedAt: '2026-03-07T12:00:00.000Z',
      resolvedBy: 'admin-1',
      fingerprint: 'fp-456',
      occurrenceCount: 5,
      lastSeenAt: '2026-03-07T11:00:00.000Z',
    };
    expect(entry.status).toBe('resolved');
    expect(entry.resolvedAt).not.toBeNull();
    expect(entry.resolvedBy).toBe('admin-1');
  });

  it('ErrorLogEntry supports all source types', () => {
    const sources: ErrorSource[] = ['frontend', 'backend', 'websocket', 'functional'];
    for (const source of sources) {
      const entry: ErrorLogEntry = {
        id: `err-${source}`,
        timestamp: '2026-03-07T10:00:00.000Z',
        source,
        severity: 'error',
        message: `Error from ${source}`,
        stack: null,
        metadata: null,
        url: null,
        userId: null,
        status: 'open',
        resolvedAt: null,
        resolvedBy: null,
        fingerprint: `fp-${source}`,
        occurrenceCount: 1,
        lastSeenAt: '2026-03-07T10:00:00.000Z',
      };
      expect(entry.source).toBe(source);
    }
  });
});
