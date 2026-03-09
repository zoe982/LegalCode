import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit } from '../../src/services/audit.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('logAudit', () => {
  let db: AppDb;
  let valuesSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = getDb(createMockD1());
    valuesSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(db, 'insert').mockReturnValue({ values: valuesSpy } as never);
  });

  it('inserts audit log entry with correct fields', async () => {
    await logAudit(db, {
      userId: 'user-1',
      action: 'create',
      entityType: 'template',
      entityId: 'tmpl-1',
    });

    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'create',
        entityType: 'template',
        entityId: 'tmpl-1',
      }),
    );
  });

  it('generates UUID for id field', async () => {
    await logAudit(db, {
      userId: 'user-1',
      action: 'update',
      entityType: 'template',
      entityId: 'tmpl-1',
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.id).toBeDefined();
    expect(typeof values.id).toBe('string');
    expect(values.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
  });

  it('generates ISO timestamp for createdAt', async () => {
    const before = new Date().toISOString();

    await logAudit(db, {
      userId: 'user-1',
      action: 'login',
      entityType: 'session',
      entityId: 'sess-1',
    });

    const after = new Date().toISOString();
    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof values.createdAt).toBe('string');
    expect((values.createdAt as string) >= before).toBe(true);
    expect((values.createdAt as string) <= after).toBe(true);
  });

  it('JSON stringifies metadata when provided', async () => {
    const metadata = { oldTitle: 'Draft', newTitle: 'Final' };

    await logAudit(db, {
      userId: 'user-1',
      action: 'update',
      entityType: 'template',
      entityId: 'tmpl-1',
      metadata,
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.metadata).toBe(JSON.stringify(metadata));
  });

  it('sets metadata to null when not provided', async () => {
    await logAudit(db, {
      userId: 'user-1',
      action: 'delete',
      entityType: 'template',
      entityId: 'tmpl-1',
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.metadata).toBeNull();
  });
});
