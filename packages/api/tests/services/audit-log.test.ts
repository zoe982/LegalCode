import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit } from '../../src/services/audit-log.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('logAudit (audit-log)', () => {
  let db: AppDb;
  let valuesSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = getDb(createMockD1());
    valuesSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(db, 'insert').mockReturnValue({ values: valuesSpy } as never);
  });

  it('logs an audit entry successfully', async () => {
    await logAudit(db, {
      action: 'template.create',
      resourceType: 'template',
      resourceId: 'tmpl-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- vi.spyOn mock, this-binding not relevant
    expect(db.insert).toHaveBeenCalledOnce();
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'template.create',
        resourceType: 'template',
        resourceId: 'tmpl-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
      }),
    );
  });

  it('does not throw when DB insert fails (fire-and-forget)', async () => {
    valuesSpy.mockRejectedValue(new Error('DB write failed'));

    await expect(
      logAudit(db, {
        action: 'template.update',
        resourceType: 'template',
        resourceId: 'tmpl-2',
        userId: 'user-1',
        userEmail: 'user@example.com',
      }),
    ).resolves.toBeUndefined();
  });

  it('logs console.error when DB insert fails', async () => {
    valuesSpy.mockRejectedValue(new Error('DB write failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await logAudit(db, {
      action: 'template.update',
      resourceType: 'template',
      resourceId: 'tmpl-2',
      userId: 'user-1',
      userEmail: 'user@example.com',
    });

    expect(consoleSpy).toHaveBeenCalledWith('Audit log write failed');
    consoleSpy.mockRestore();
  });

  it('serializes metadata to JSON string', async () => {
    const metadata = { templateId: 'tmpl-1', oldStatus: 'draft' };

    await logAudit(db, {
      action: 'comment.create',
      resourceType: 'comment',
      resourceId: 'cmt-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      metadata,
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.metadata).toBe(JSON.stringify(metadata));
  });

  it('sets metadata to null when not provided', async () => {
    await logAudit(db, {
      action: 'template.archive',
      resourceType: 'template',
      resourceId: 'tmpl-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.metadata).toBeNull();
  });

  it('generates UUID for id field', async () => {
    await logAudit(db, {
      action: 'template.publish',
      resourceType: 'template',
      resourceId: 'tmpl-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
    });

    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values.id).toBeDefined();
    expect(typeof values.id).toBe('string');
    expect(values.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
  });

  it('generates ISO timestamp for createdAt', async () => {
    const before = new Date().toISOString();

    await logAudit(db, {
      action: 'template.unarchive',
      resourceType: 'template',
      resourceId: 'tmpl-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
    });

    const after = new Date().toISOString();
    const values = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof values.createdAt).toBe('string');
    expect((values.createdAt as string) >= before).toBe(true);
    expect((values.createdAt as string) <= after).toBe(true);
  });
});
