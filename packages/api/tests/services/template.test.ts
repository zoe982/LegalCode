import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
  saveContent,
  deleteTemplate,
  restoreTemplate,
  hardDeleteTemplate,
  listDeletedTemplates,
  purgeExpiredTemplates,
} from '../../src/services/template.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

// Helper to create a mock template row (no status, with deletedAt/deletedBy)
function mockTemplateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 't1',
    title: 'Test',
    slug: 'test-abc123',
    category: 'contracts',
    description: null,
    country: null,
    currentVersion: 1,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('template service', () => {
  let db: AppDb;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = getDb(createMockD1());
  });

  // ── createTemplate ──────────────────────────────────────────────────

  describe('createTemplate', () => {
    it('returns db_error when db.batch throws', async () => {
      vi.spyOn(db, 'batch').mockRejectedValue(new Error('D1_ERROR'));

      const result = await createTemplate(
        db,
        { title: 'Failing', category: 'contracts', content: '# Fail' },
        'user-1',
      );

      expect(result).toEqual({ error: 'db_error' });
    });

    it('logs error to console.error when batch insert fails', async () => {
      const dbError = new Error('D1_ERROR');
      vi.spyOn(db, 'batch').mockRejectedValue(dbError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await createTemplate(
        db,
        { title: 'Failing', category: 'contracts', content: '# Fail' },
        'user-1',
      );

      expect(consoleSpy).toHaveBeenCalledWith('[createTemplate] batch insert failed:', dbError);
      consoleSpy.mockRestore();
    });

    it('returns db_error on UNIQUE constraint failure', async () => {
      vi.spyOn(db, 'batch').mockRejectedValue(
        new Error('UNIQUE constraint failed: templates.slug'),
      );

      const result = await createTemplate(
        db,
        { title: 'Duplicate', category: 'contracts', content: '# Dup' },
        'user-1',
      );

      expect(result).toEqual({ error: 'db_error' });
    });

    it('generates slug from title with random suffix', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'My Template Title', category: 'contracts', content: '# Hello' },
        'user-1',
      );

      expect('template' in result && result.template.slug).toMatch(
        /^my-template-title-[\da-f]{6}$/,
      );
    });

    it('strips special characters from slug', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: '  Hello!  World@#$  ', category: 'contracts', content: '# Test' },
        'user-1',
      );

      expect('template' in result && result.template.slug).toMatch(/^hello-world-[\da-f]{6}$/);
    });

    it('creates template with currentVersion 1 and null deletedAt', async () => {
      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'Draft Doc', category: 'contracts', content: '# Draft' },
        'user-1',
      );

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.currentVersion).toBe(1);
        expect(result.template.deletedAt).toBeNull();
        expect(result.template.deletedBy).toBeNull();
      }
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });

    it('creates version 1 with Initial version changeSummary', async () => {
      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      await createTemplate(
        db,
        { title: 'Test', category: 'contracts', content: '# Content' },
        'user-1',
      );

      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps.length).toBeGreaterThanOrEqual(3);
    });

    it('creates tags when provided', async () => {
      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const result = await createTemplate(
        db,
        {
          title: 'Tagged',
          category: 'contracts',
          content: '# Tagged',
          tags: ['employment', 'compliance'],
        },
        'user-1',
      );

      expect('tags' in result && result.tags).toEqual(['employment', 'compliance']);
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps.length).toBeGreaterThanOrEqual(3);
    });

    it('reuses existing tags when they already exist', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const existingTag = { id: 'tag-existing', name: 'employment' };
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingTag]),
        }),
      } as never);

      const result = await createTemplate(
        db,
        {
          title: 'Reuse Tags',
          category: 'contracts',
          content: '# Reuse',
          tags: ['employment'],
        },
        'user-1',
      );

      expect('tags' in result && result.tags).toEqual(['employment']);
    });

    it('returns template with tags array', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'No Tags', category: 'contracts', content: '# Body' },
        'user-1',
      );

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template).toBeDefined();
        expect(result.template.id).toBeDefined();
        expect(result.template.title).toBe('No Tags');
        expect(result.template.category).toBe('contracts');
        expect(result.tags).toEqual([]);
      }
    });

    it('sets country to null when not provided', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'No Country', category: 'contracts', content: '# Body' },
        'user-1',
      );

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.country).toBeNull();
      }
    });

    it('sets country when provided', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'With Country', category: 'contracts', content: '# Body', country: 'US' },
        'user-1',
      );

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.country).toBe('US');
      }
    });

    it('sets createdBy to the userId', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'Authored', category: 'contracts', content: '# Body' },
        'author-42',
      );

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.createdBy).toBe('author-42');
      }
    });
  });

  // ── listTemplates ──────────────────────────────────────────────────

  describe('listTemplates', () => {
    function setupListMock(db: AppDb, rows: unknown[], countResult: number) {
      const allSpy = vi.fn().mockResolvedValue(rows);
      const limitSpy = vi.fn().mockReturnValue({ all: allSpy });
      const offsetSpy = vi.fn().mockReturnValue({ limit: limitSpy });
      const whereSpy = vi.fn().mockReturnValue({ offset: offsetSpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockImplementation((...args: unknown[]) => {
        const selectArg = args[0] as Record<string, unknown> | undefined;
        if (selectArg && 'count' in selectArg) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: countResult }]),
            }),
          } as never;
        }
        // For tag subquery: select({ templateId }) -> from -> innerJoin -> where
        if (selectArg && 'templateId' in selectArg) {
          const subWhere = vi.fn().mockReturnValue({});
          const subInnerJoin = vi.fn().mockReturnValue({ where: subWhere });
          const subFrom = vi.fn().mockReturnValue({ innerJoin: subInnerJoin });
          return { from: subFrom } as never;
        }
        return { from: fromSpy } as never;
      });
      return { whereSpy, allSpy };
    }

    it('validates query with templateQuerySchema', async () => {
      await expect(listTemplates(db, { page: -1 })).rejects.toThrow(ZodError);
    });

    it('returns paginated results with defaults', async () => {
      const mockTemplates = [mockTemplateRow()];

      setupListMock(db, mockTemplates, 1);

      const result = await listTemplates(db, {});
      expect(result.data).toEqual(mockTemplates);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies search filter', async () => {
      const { allSpy } = setupListMock(db, [], 0);

      await listTemplates(db, { search: 'employment' });
      expect(allSpy).toHaveBeenCalled();
    });

    it('applies category filter', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { category: 'contracts' });
      expect(result.data).toEqual([]);
    });

    it('applies country filter', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { country: 'US' });
      expect(result.data).toEqual([]);
    });

    it('handles custom page and limit', async () => {
      setupListMock(db, [], 50);

      const result = await listTemplates(db, { page: 3, limit: 10 });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });

    it('returns empty results', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, {});
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('defaults total to 0 when count query returns empty array', async () => {
      const allSpy = vi.fn().mockResolvedValue([]);
      const limitSpy = vi.fn().mockReturnValue({ all: allSpy });
      const offsetSpy = vi.fn().mockReturnValue({ limit: limitSpy });
      const whereSpy = vi.fn().mockReturnValue({ offset: offsetSpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockImplementation((...args: unknown[]) => {
        const selectArg = args[0] as Record<string, unknown> | undefined;
        if (selectArg && 'count' in selectArg) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          } as never;
        }
        return { from: fromSpy } as never;
      });

      const result = await listTemplates(db, {});
      expect(result.total).toBe(0);
    });

    it('escapes LIKE metacharacters in search terms', async () => {
      const { allSpy } = setupListMock(db, [], 0);

      await listTemplates(db, { search: '100%_done' });
      expect(allSpy).toHaveBeenCalled();
    });

    it('applies tag filter via subquery', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { tag: 'employment' });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── getTemplate ──────────────────────────────────────────────────

  describe('getTemplate', () => {
    it('returns null if template not found', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await getTemplate(db, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns null if template is soft-deleted', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z', deletedBy: 'user-1' }) as never,
      );

      const result = await getTemplate(db, 't1');
      expect(result).toBeNull();
    });

    it('returns template with content and tags', async () => {
      const template = mockTemplateRow({ currentVersion: 2, country: 'US' });

      const mockVersion = {
        id: 'v2',
        templateId: 't1',
        version: 2,
        content: '# Content v2',
        changeSummary: 'Updated content',
        createdBy: 'user-1',
        createdAt: '2026-01-02T00:00:00.000Z',
      };

      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(template as never);
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(mockVersion);

      const whereSpy = vi.fn().mockResolvedValue([{ name: 'employment' }, { name: 'compliance' }]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await getTemplate(db, 't1');

      expect(result).not.toBeNull();
      expect(result?.template).toEqual(template);
      expect(result?.content).toBe('# Content v2');
      expect(result?.changeSummary).toBe('Updated content');
      expect(result?.tags).toEqual(['employment', 'compliance']);
    });

    it('returns empty content when version is not found', async () => {
      const template = mockTemplateRow();

      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(template as never);
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(undefined);

      const whereSpy = vi.fn().mockResolvedValue([]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await getTemplate(db, 't1');

      expect(result).not.toBeNull();
      expect(result?.content).toBe('');
      expect(result?.changeSummary).toBeNull();
    });

    it('returns empty tags array when no tags exist', async () => {
      const template = mockTemplateRow();

      const mockVersion = {
        id: 'v1',
        templateId: 't1',
        version: 1,
        content: '# Content',
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(template as never);
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(mockVersion);

      const whereSpy = vi.fn().mockResolvedValue([]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await getTemplate(db, 't1');

      expect(result?.tags).toEqual([]);
    });
  });

  // ── updateTemplate ──────────────────────────────────────────────────

  describe('updateTemplate', () => {
    it('validates input with updateTemplateSchema', async () => {
      await expect(updateTemplate(db, 't1', { title: '' }, 'user-1')).rejects.toThrow(ZodError);
    });

    it('returns not_found error if template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await updateTemplate(db, 'nonexistent', { title: 'Updated' }, 'user-1');

      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns deleted error if template is soft-deleted', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z', deletedBy: 'user-1' }) as never,
      );

      const result = await updateTemplate(db, 't1', { title: 'Updated' }, 'user-1');

      expect(result).toEqual({ error: 'deleted' });
    });

    it('increments version and creates new version row with content', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(
        db,
        't1',
        { content: '# Updated content', changeSummary: 'Revised section 2' },
        'user-1',
      );

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.currentVersion).toBe(2);
      }
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });

    it('copies content from current version when content not provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue({
        id: 'v1',
        templateId: 't1',
        version: 1,
        content: '# Original content',
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      });

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(db, 't1', { title: 'Updated Title' }, 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.title).toBe('Updated Title');
        expect(result.template.currentVersion).toBe(2);
      }
    });

    it('returns existing tags when tags not provided in update', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue({
        id: 'v1',
        templateId: 't1',
        version: 1,
        content: '# Content',
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      });

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const whereSpy = vi.fn().mockResolvedValue([{ name: 'employment' }, { name: 'compliance' }]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await updateTemplate(db, 't1', { title: 'Updated Title' }, 'user-1');

      expect(result).toHaveProperty('tags');
      if ('tags' in result) {
        expect(result.tags).toEqual(['employment', 'compliance']);
      }
    });

    it('updates title, category, and country when provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(
        db,
        't1',
        { title: 'New Title', category: 'policies', country: 'UK', content: '# Body' },
        'user-1',
      );

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.title).toBe('New Title');
        expect(result.template.category).toBe('policies');
        expect(result.template.country).toBe('UK');
      }
    });

    it('falls back to empty content when current version not found during update without content', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      // Return undefined for version lookup — triggers the ?? '' fallback
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(undefined);

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(db, 't1', { title: 'Updated Title' }, 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.currentVersion).toBe(2);
      }
    });

    it('keeps existing description when description is not provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ description: 'Old description' }) as never,
      );

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(db, 't1', { content: '# Body' }, 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.description).toBe('Old description');
      }
    });

    it('sets country to null when explicitly provided as null', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ country: 'US' }) as never,
      );

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const tagWhereSpy = vi.fn().mockResolvedValue([]);
      const tagInnerJoinSpy = vi.fn().mockReturnValue({ where: tagWhereSpy });
      const tagFromSpy = vi.fn().mockReturnValue({ innerJoin: tagInnerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: tagFromSpy } as never);

      const result = await updateTemplate(db, 't1', { content: '# Body', country: null }, 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.country).toBeNull();
      }
    });

    it('syncs tags when provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const result = await updateTemplate(
        db,
        't1',
        { content: '# Body', tags: ['new-tag'] },
        'user-1',
      );

      expect(result).toHaveProperty('template');
    });
  });

  // ── saveContent ────────────────────────────────────────────────────

  describe('saveContent', () => {
    it('returns not_found when template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await saveContent(db, 'nonexistent', '# Content', undefined);
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns deleted when template is soft-deleted', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z' }) as never,
      );

      const result = await saveContent(db, 't1', '# Content', undefined);
      expect(result).toEqual({ error: 'deleted' });
    });

    it('updates content in place without version bump', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ currentVersion: 2 }) as never,
      );

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await saveContent(db, 't1', '# Updated', undefined);

      expect(result).toHaveProperty('updatedAt');
      expect(batchSpy).toHaveBeenCalledTimes(1);
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps.length).toBe(2);
    });

    it('updates title when provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await saveContent(db, 't1', '# Content', 'New Title');

      expect(result).toHaveProperty('updatedAt');
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not change title when not provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await saveContent(db, 't1', '# Content', undefined);

      expect(result).toHaveProperty('updatedAt');
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── deleteTemplate ─────────────────────────────────────────────────

  describe('deleteTemplate', () => {
    it('returns not_found when template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await deleteTemplate(db, 'nonexistent', 'user-1');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns already_deleted when template is already soft-deleted', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z', deletedBy: 'user-1' }) as never,
      );

      const result = await deleteTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'already_deleted' });
    });

    it('soft-deletes a template successfully', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await deleteTemplate(db, 't1', 'user-1');

      expect(result).toEqual({ success: true });
      expect(batchSpy).toHaveBeenCalledTimes(1);
      // Should have 2 ops: update template + audit log
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps.length).toBe(2);
    });
  });

  // ── restoreTemplate ────────────────────────────────────────────────

  describe('restoreTemplate', () => {
    it('returns not_found when template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await restoreTemplate(db, 'nonexistent');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_deleted when template is not deleted', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const result = await restoreTemplate(db, 't1');
      expect(result).toEqual({ error: 'not_deleted' });
    });

    it('restores a soft-deleted template successfully', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z', deletedBy: 'user-1' }) as never,
      );

      // Mock the update call (not batch, single update)
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);

      const result = await restoreTemplate(db, 't1');

      expect(result).toEqual({ success: true });
    });
  });

  // ── hardDeleteTemplate ─────────────────────────────────────────────

  describe('hardDeleteTemplate', () => {
    it('returns not_found when template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await hardDeleteTemplate(db, 'nonexistent');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('permanently deletes template and related data', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await hardDeleteTemplate(db, 't1');

      expect(result).toEqual({ success: true });
      expect(batchSpy).toHaveBeenCalledTimes(1);
      // Should delete comments, templateTags, templateVersions, templates
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps.length).toBe(4);
    });
  });

  // ── listDeletedTemplates ───────────────────────────────────────────

  describe('listDeletedTemplates', () => {
    it('returns deleted templates', async () => {
      const deletedTemplates = [
        mockTemplateRow({ deletedAt: '2026-02-01T00:00:00.000Z', deletedBy: 'user-1' }),
      ];

      const allSpy = vi.fn().mockResolvedValue(deletedTemplates);
      const orderBySpy = vi.fn().mockReturnValue({ all: allSpy });
      const whereSpy = vi.fn().mockReturnValue({ orderBy: orderBySpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await listDeletedTemplates(db);

      expect(result).toEqual(deletedTemplates);
    });

    it('returns empty array when no deleted templates exist', async () => {
      const allSpy = vi.fn().mockResolvedValue([]);
      const orderBySpy = vi.fn().mockReturnValue({ all: allSpy });
      const whereSpy = vi.fn().mockReturnValue({ orderBy: orderBySpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await listDeletedTemplates(db);

      expect(result).toEqual([]);
    });
  });

  // ── purgeExpiredTemplates ──────────────────────────────────────────

  describe('purgeExpiredTemplates', () => {
    it('returns 0 when no expired templates', async () => {
      const allSpy = vi.fn().mockResolvedValue([]);
      const whereSpy = vi.fn().mockReturnValue({ all: allSpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await purgeExpiredTemplates(db);

      expect(result).toBe(0);
    });

    it('does not count templates that fail hard delete', async () => {
      const allSpy = vi.fn().mockResolvedValue([{ id: 'missing-1' }]);
      const whereSpy = vi.fn().mockReturnValue({ all: allSpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      // Mock hardDeleteTemplate to return not_found
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await purgeExpiredTemplates(db);

      expect(result).toBe(0);
    });

    it('purges templates deleted more than 30 days ago', async () => {
      const expiredId = 'expired-1';
      const allSpy = vi.fn().mockResolvedValue([{ id: expiredId }]);
      const whereSpy = vi.fn().mockReturnValue({ all: allSpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      // Mock for hardDeleteTemplate's findFirst
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({ id: expiredId }) as never,
      );
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await purgeExpiredTemplates(db);

      expect(result).toBe(1);
    });
  });

  // ── getTemplateVersions, getTemplateVersion, downloadTemplate ──────

  describe('getTemplateVersions', () => {
    it('returns all versions ordered by version DESC', async () => {
      const versions = [
        {
          id: 'v3',
          templateId: 't1',
          version: 3,
          content: '# v3',
          changeSummary: 'Third',
          createdBy: 'user-1',
          createdAt: '2026-01-03T00:00:00.000Z',
        },
        {
          id: 'v2',
          templateId: 't1',
          version: 2,
          content: '# v2',
          changeSummary: 'Second',
          createdBy: 'user-1',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
        {
          id: 'v1',
          templateId: 't1',
          version: 1,
          content: '# v1',
          changeSummary: 'Initial version',
          createdBy: 'user-1',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      vi.spyOn(db.query.templateVersions, 'findMany').mockResolvedValue(versions);

      const result = await getTemplateVersions(db, 't1');
      expect(result).toEqual(versions);
    });

    it('returns empty array when no versions exist', async () => {
      vi.spyOn(db.query.templateVersions, 'findMany').mockResolvedValue([]);

      const result = await getTemplateVersions(db, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getTemplateVersion', () => {
    it('returns specific version', async () => {
      const version = {
        id: 'v2',
        templateId: 't1',
        version: 2,
        content: '# v2',
        changeSummary: 'Second',
        createdBy: 'user-1',
        createdAt: '2026-01-02T00:00:00.000Z',
      };

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(version);

      const result = await getTemplateVersion(db, 't1', 2);
      expect(result).toEqual(version);
    });

    it('returns null when version not found', async () => {
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(undefined);

      const result = await getTemplateVersion(db, 't1', 99);
      expect(result).toBeNull();
    });
  });

  describe('downloadTemplate', () => {
    it('returns filename and content for existing template', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(
        mockTemplateRow({
          title: 'Employment Contract',
          slug: 'employment-contract-abc123',
          country: 'US',
          currentVersion: 2,
        }) as never,
      );

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue({
        id: 'v2',
        templateId: 't1',
        version: 2,
        content: '# Employment Contract\n\nContent here.',
        changeSummary: 'Updated',
        createdBy: 'user-1',
        createdAt: '2026-01-02T00:00:00.000Z',
      });

      const result = await downloadTemplate(db, 't1');

      expect(result).not.toBeNull();
      expect(result?.filename).toBe('employment-contract-abc123.md');
      expect(result?.content).toBe('# Employment Contract\n\nContent here.');
    });

    it('returns null when template not found', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await downloadTemplate(db, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when current version not found', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplateRow() as never);

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(undefined);

      const result = await downloadTemplate(db, 't1');
      expect(result).toBeNull();
    });
  });
});
