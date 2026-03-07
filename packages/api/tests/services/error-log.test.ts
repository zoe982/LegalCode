import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateFingerprint,
  logError,
  listErrors,
  resolveError,
} from '../../src/services/error-log.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1() {
  const bindMock = vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({ success: true }),
  });
  const prepareMock = vi.fn().mockReturnValue({
    bind: bindMock,
  });
  const d1 = {
    prepare: prepareMock,
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
  return { d1, prepareMock, bindMock };
}

describe('generateFingerprint', () => {
  it('returns a hex string of 64 chars (SHA-256)', async () => {
    const fp = await generateFingerprint('frontend', 'Error occurred', null);
    expect(fp).toMatch(/^[\da-f]{64}$/);
  });

  it('produces same fingerprint for same inputs', async () => {
    const fp1 = await generateFingerprint('frontend', 'Error occurred', null);
    const fp2 = await generateFingerprint('frontend', 'Error occurred', null);
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprint for different sources', async () => {
    const fp1 = await generateFingerprint('frontend', 'Error occurred', null);
    const fp2 = await generateFingerprint('backend', 'Error occurred', null);
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprint for different messages', async () => {
    const fp1 = await generateFingerprint('frontend', 'Error A', null);
    const fp2 = await generateFingerprint('frontend', 'Error B', null);
    expect(fp1).not.toBe(fp2);
  });

  it('extracts first stack frame from stack trace', async () => {
    const stack = 'Error: fail\n  at connect (db.ts:10)\n  at main (index.ts:5)';
    const fpWithStack = await generateFingerprint('backend', 'fail', stack);
    const fpWithoutStack = await generateFingerprint('backend', 'fail', null);
    expect(fpWithStack).not.toBe(fpWithoutStack);
  });

  it('handles empty stack the same as null', async () => {
    const fp1 = await generateFingerprint('frontend', 'error', null);
    const fp2 = await generateFingerprint('frontend', 'error', '');
    expect(fp1).toBe(fp2);
  });

  it('handles undefined stack the same as null', async () => {
    const fp1 = await generateFingerprint('frontend', 'error', null);
    const fp2 = await generateFingerprint('frontend', 'error', undefined);
    expect(fp1).toBe(fp2);
  });

  it('uses first frame with file path from stack', async () => {
    const stack1 = 'Error: fail\n  at connect (/src/db.ts:10)\n  at main (/src/index.ts:5)';
    const stack2 = 'Error: fail\n  at connect (/src/db.ts:10)\n  at other (/src/other.ts:99)';
    // Same first frame, should produce same fingerprint
    const fp1 = await generateFingerprint('backend', 'fail', stack1);
    const fp2 = await generateFingerprint('backend', 'fail', stack2);
    expect(fp1).toBe(fp2);
  });

  it('handles stack with no file path lines', async () => {
    const stack = 'Error: fail\nno path here\njust text';
    const fp1 = await generateFingerprint('frontend', 'fail', stack);
    const fp2 = await generateFingerprint('frontend', 'fail', null);
    // No extractable frame, should be same as null stack
    expect(fp1).toBe(fp2);
  });
});

describe('logError', () => {
  it('calls D1 prepare with INSERT ON CONFLICT SQL', async () => {
    const { d1, prepareMock } = createMockD1();
    await logError(d1, {
      source: 'frontend',
      message: 'Test error',
    });

    expect(prepareMock).toHaveBeenCalledOnce();
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain('INSERT INTO error_log');
    expect(sql).toContain('ON CONFLICT(fingerprint)');
  });

  it('binds correct parameters', async () => {
    const { d1, bindMock } = createMockD1();

    await logError(d1, {
      source: 'backend',
      severity: 'critical',
      message: 'DB crash',
      stack: 'Error\n  at db.ts:10',
      metadata: '{"retries":3}',
      url: '/api/data',
      userId: 'user-1',
    });

    expect(bindMock).toHaveBeenCalledOnce();
    const args = bindMock.mock.calls[0] as unknown[];
    // args: id, now, source, severity, message, stack, metadata, url, userId, fingerprint
    expect(args[2]).toBe('backend');
    expect(args[3]).toBe('critical');
    expect(args[4]).toBe('DB crash');
    expect(args[5]).toBe('Error\n  at db.ts:10');
    expect(args[6]).toBe('{"retries":3}');
    expect(args[7]).toBe('/api/data');
    expect(args[8]).toBe('user-1');
    // fingerprint should be a hex string
    expect(args[9]).toMatch(/^[\da-f]{64}$/);
  });

  it('defaults severity to error when not provided', async () => {
    const { d1, bindMock } = createMockD1();

    await logError(d1, {
      source: 'frontend',
      message: 'Minor issue',
    });

    const args = bindMock.mock.calls[0] as unknown[];
    expect(args[3]).toBe('error');
  });

  it('returns an errorId', async () => {
    const { d1 } = createMockD1();
    const result = await logError(d1, {
      source: 'frontend',
      message: 'test',
    });

    expect(result).toHaveProperty('errorId');
    expect(typeof result.errorId).toBe('string');
    expect(result.errorId).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
  });

  it('binds null for optional fields when not provided', async () => {
    const { d1, bindMock } = createMockD1();

    await logError(d1, {
      source: 'frontend',
      message: 'error',
    });

    const args = bindMock.mock.calls[0] as unknown[];
    // stack, metadata, url, userId should be null
    expect(args[5]).toBeNull();
    expect(args[6]).toBeNull();
    expect(args[7]).toBeNull();
    expect(args[8]).toBeNull();
  });
});

describe('listErrors', () => {
  let db: AppDb;
  let limitMock: ReturnType<typeof vi.fn>;
  let orderByMock: ReturnType<typeof vi.fn>;
  let whereMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const { d1 } = createMockD1();
    db = getDb(d1);
    limitMock = vi.fn().mockResolvedValue([]);
    orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });

    vi.spyOn(db, 'select').mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: whereMock,
        orderBy: orderByMock,
      }),
    } as never);
  });

  it('returns empty array when no errors exist', async () => {
    const result = await listErrors(db, {});
    expect(result).toEqual([]);
  });

  it('queries without where clause when no filters provided', async () => {
    await listErrors(db, {});
    expect(whereMock).not.toHaveBeenCalled();
    expect(orderByMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(100);
  });

  it('applies source filter when provided', async () => {
    await listErrors(db, { source: 'frontend' });
    expect(whereMock).toHaveBeenCalled();
  });

  it('applies status filter when provided', async () => {
    await listErrors(db, { status: 'open' });
    expect(whereMock).toHaveBeenCalled();
  });

  it('applies severity filter when provided', async () => {
    await listErrors(db, { severity: 'critical' });
    expect(whereMock).toHaveBeenCalled();
  });

  it('applies multiple filters when provided', async () => {
    await listErrors(db, { source: 'backend', status: 'open', severity: 'error' });
    expect(whereMock).toHaveBeenCalled();
  });
});

describe('resolveError', () => {
  let db: AppDb;
  let returningMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const { d1 } = createMockD1();
    db = getDb(d1);
    returningMock = vi.fn().mockResolvedValue([{ id: 'err-1' }]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);
  });

  it('returns true when error is found and resolved', async () => {
    const result = await resolveError(db, 'err-1', 'admin-1');
    expect(result).toBe(true);
  });

  it('returns false when error is not found', async () => {
    returningMock.mockResolvedValueOnce([]);
    const result = await resolveError(db, 'nonexistent', 'admin-1');
    expect(result).toBe(false);
  });

  it('sets resolved status, timestamp, and user', async () => {
    const setMock = vi.fn();
    const whereMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'err-1' }]),
    });
    setMock.mockReturnValue({ where: whereMock });
    vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

    await resolveError(db, 'err-1', 'admin-1');

    const setArg = setMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty('status', 'resolved');
    expect(setArg).toHaveProperty('resolvedBy', 'admin-1');
    expect(setArg).toHaveProperty('resolvedAt');
    expect(typeof setArg.resolvedAt).toBe('string');
  });
});
