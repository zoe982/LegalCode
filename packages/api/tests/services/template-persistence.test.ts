import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  persistVersion,
  getLatestVersionContent,
} from '../../src/services/template-persistence.js';

function createMockDb() {
  const mockStmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStmt),
    batch: vi.fn().mockResolvedValue([]),
    _stmt: mockStmt, // helper for test access
  };
}

describe('template-persistence', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createMockDb();
  });

  describe('persistVersion', () => {
    it('creates a new version row and updates template currentVersion', async () => {
      db._stmt.first.mockResolvedValue({ current_version: 2 });

      await persistVersion(db as unknown as D1Database, {
        templateId: 'tmpl-1',
        content: '# Hello',
        createdBy: 'user-1',
        changeSummary: 'Auto-saved on session close',
      });

      expect(db.prepare).toHaveBeenCalledTimes(3); // SELECT + INSERT + UPDATE
      expect(db.batch).toHaveBeenCalledTimes(1);
    });

    it('returns the new version number', async () => {
      db._stmt.first.mockResolvedValue({ current_version: 5 });

      const result = await persistVersion(db as unknown as D1Database, {
        templateId: 'tmpl-1',
        content: '# Updated',
        createdBy: 'user-1',
        changeSummary: 'test',
      });

      expect(result.version).toBe(6);
    });

    it('throws if template not found', async () => {
      db._stmt.first.mockResolvedValue(null);

      await expect(
        persistVersion(db as unknown as D1Database, {
          templateId: 'tmpl-missing',
          content: '# Hello',
          createdBy: 'user-1',
          changeSummary: 'test',
        }),
      ).rejects.toThrow('Template not found');
    });

    it('uses correct snake_case column names in SQL', async () => {
      db._stmt.first.mockResolvedValue({ current_version: 1 });

      await persistVersion(db as unknown as D1Database, {
        templateId: 'tmpl-1',
        content: '# Content',
        createdBy: 'user-1',
        changeSummary: 'test summary',
      });

      const prepareCalls = db.prepare.mock.calls.map(
        (call) => call[0] as string,
      );

      // SELECT should reference current_version
      expect(prepareCalls[0]).toMatch(/current_version/);
      // INSERT should reference template_id, change_summary, created_by, created_at
      expect(prepareCalls[1]).toMatch(/template_id/);
      expect(prepareCalls[1]).toMatch(/change_summary/);
      expect(prepareCalls[1]).toMatch(/created_by/);
      expect(prepareCalls[1]).toMatch(/created_at/);
      // UPDATE should reference current_version, updated_at
      expect(prepareCalls[2]).toMatch(/current_version/);
      expect(prepareCalls[2]).toMatch(/updated_at/);
    });

    it('binds parameters in the correct order for INSERT', async () => {
      db._stmt.first.mockResolvedValue({ current_version: 0 });

      await persistVersion(db as unknown as D1Database, {
        templateId: 'tmpl-1',
        content: '# Content',
        createdBy: 'user-1',
        changeSummary: 'my summary',
      });

      // The INSERT bind call (second prepare -> bind)
      const insertBindArgs = db._stmt.bind.mock.calls[1] as unknown[];
      // Should contain: id, templateId, version, content, changeSummary, createdBy, createdAt
      expect(insertBindArgs).toHaveLength(7);
      expect(insertBindArgs[1]).toBe('tmpl-1'); // templateId
      expect(insertBindArgs[2]).toBe(1); // version (0 + 1)
      expect(insertBindArgs[3]).toBe('# Content'); // content
      expect(insertBindArgs[4]).toBe('my summary'); // changeSummary
      expect(insertBindArgs[5]).toBe('user-1'); // createdBy
    });
  });

  describe('getLatestVersionContent', () => {
    it('returns content and metadata for the latest version', async () => {
      db._stmt.first.mockResolvedValue({
        content: '# Latest',
        version: 3,
        createdAt: '2026-01-01T00:00:00Z',
      });

      const result = await getLatestVersionContent(
        db as unknown as D1Database,
        'tmpl-1',
      );

      expect(result).toEqual({
        content: '# Latest',
        version: 3,
        createdAt: '2026-01-01T00:00:00Z',
      });
      expect(db.prepare).toHaveBeenCalledTimes(1);
    });

    it('returns null if no versions exist', async () => {
      db._stmt.first.mockResolvedValue(null);

      const result = await getLatestVersionContent(
        db as unknown as D1Database,
        'tmpl-1',
      );

      expect(result).toBeNull();
    });

    it('uses correct snake_case column names in SQL', async () => {
      db._stmt.first.mockResolvedValue(null);

      await getLatestVersionContent(db as unknown as D1Database, 'tmpl-1');

      const sql = db.prepare.mock.calls[0]?.[0] as string;
      expect(sql).toMatch(/template_id/);
      expect(sql).toMatch(/created_at/);
    });

    it('binds the templateId parameter', async () => {
      db._stmt.first.mockResolvedValue(null);

      await getLatestVersionContent(db as unknown as D1Database, 'tmpl-42');

      expect(db._stmt.bind).toHaveBeenCalledWith('tmpl-42');
    });
  });
});
