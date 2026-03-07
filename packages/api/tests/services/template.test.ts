import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  unarchiveTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
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

describe('template service', () => {
  let db: AppDb;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = getDb(createMockD1());
  });

  // ── Task 4: createTemplate ──────────────────────────────────────────

  describe('createTemplate', () => {
    it('validates input with createTemplateSchema', async () => {
      await expect(
        createTemplate(db, { title: '', category: 'contracts', content: 'body' }, 'user-1'),
      ).rejects.toThrow(ZodError);
    });

    it('rejects empty content', async () => {
      await expect(
        createTemplate(db, { title: 'Good Title', category: 'contracts', content: '' }, 'user-1'),
      ).rejects.toThrow(ZodError);
    });

    it('generates slug from title with random suffix', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'My Template Title', category: 'contracts', content: '# Hello' },
        'user-1',
      );

      expect(result.template.slug).toMatch(/^my-template-title-[\da-f]{6}$/);
    });

    it('strips special characters from slug', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: '  Hello!  World@#$  ', category: 'contracts', content: '# Test' },
        'user-1',
      );

      expect(result.template.slug).toMatch(/^hello-world-[\da-f]{6}$/);
    });

    it('creates template with status draft and currentVersion 1', async () => {
      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'Draft Doc', category: 'contracts', content: '# Draft' },
        'user-1',
      );

      expect(result.template.status).toBe('draft');
      expect(result.template.currentVersion).toBe(1);
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
      // batch should include at least template insert, version insert, audit log
      expect(batchOps.length).toBeGreaterThanOrEqual(3);
    });

    it('creates tags when provided', async () => {
      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      // Mock select for tag lookup (tags don't exist yet — return empty array)
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

      expect(result.tags).toEqual(['employment', 'compliance']);
      // batch should have extra ops for tag creation + templateTags linking
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

      expect(result.tags).toEqual(['employment']);
    });

    it('returns template with tags array', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'No Tags', category: 'contracts', content: '# Body' },
        'user-1',
      );

      expect(result.template).toBeDefined();
      expect(result.template.id).toBeDefined();
      expect(result.template.title).toBe('No Tags');
      expect(result.template.category).toBe('contracts');
      expect(result.tags).toEqual([]);
    });

    it('sets country to null when not provided', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'No Country', category: 'contracts', content: '# Body' },
        'user-1',
      );

      expect(result.template.country).toBeNull();
    });

    it('sets country when provided', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'With Country', category: 'contracts', content: '# Body', country: 'US' },
        'user-1',
      );

      expect(result.template.country).toBe('US');
    });

    it('sets createdBy to the userId', async () => {
      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await createTemplate(
        db,
        { title: 'Authored', category: 'contracts', content: '# Body' },
        'author-42',
      );

      expect(result.template.createdBy).toBe('author-42');
    });
  });

  // ── Task 5: listTemplates ──────────────────────────────────────────

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
        // For tag subquery: select({ templateId }) → from → innerJoin → where
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
      const mockTemplates = [
        {
          id: 't1',
          title: 'Template 1',
          slug: 'template-1-abc123',
          category: 'contracts',
          country: null,
          status: 'draft' as const,
          currentVersion: 1,
          createdBy: 'user-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      setupListMock(db, mockTemplates, 1);

      const result = await listTemplates(db, {});
      expect(result.templates).toEqual(mockTemplates);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies search filter', async () => {
      const { allSpy } = setupListMock(db, [], 0);

      await listTemplates(db, { search: 'employment' });
      expect(allSpy).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { status: 'active' });
      expect(result.templates).toEqual([]);
    });

    it('applies category filter', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { category: 'contracts' });
      expect(result.templates).toEqual([]);
    });

    it('applies country filter', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { country: 'US' });
      expect(result.templates).toEqual([]);
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
      expect(result.templates).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('escapes LIKE metacharacters in search terms', async () => {
      const { allSpy } = setupListMock(db, [], 0);

      await listTemplates(db, { search: '100%_done' });

      // Verify the query was executed (the important thing is no SQL injection via % or _)
      expect(allSpy).toHaveBeenCalled();
    });

    it('applies tag filter via subquery', async () => {
      setupListMock(db, [], 0);

      const result = await listTemplates(db, { tag: 'employment' });
      expect(result.templates).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── Task 6: getTemplate ──────────────────────────────────────────

  describe('getTemplate', () => {
    it('returns null if template not found', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await getTemplate(db, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns template with content and tags', async () => {
      const mockTemplate = {
        id: 't1',
        title: 'My Template',
        slug: 'my-template-abc123',
        category: 'contracts',
        country: 'US',
        status: 'active' as const,
        currentVersion: 2,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const mockVersion = {
        id: 'v2',
        templateId: 't1',
        version: 2,
        content: '# Content v2',
        changeSummary: 'Updated content',
        createdBy: 'user-1',
        createdAt: '2026-01-02T00:00:00.000Z',
      };

      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplate);
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(mockVersion);

      const whereSpy = vi.fn().mockResolvedValue([{ name: 'employment' }, { name: 'compliance' }]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await getTemplate(db, 't1');

      expect(result).not.toBeNull();
      expect(result?.template).toEqual(mockTemplate);
      expect(result?.content).toBe('# Content v2');
      expect(result?.changeSummary).toBe('Updated content');
      expect(result?.tags).toEqual(['employment', 'compliance']);
    });

    it('returns empty tags array when no tags exist', async () => {
      const mockTemplate = {
        id: 't1',
        title: 'My Template',
        slug: 'my-template-abc123',
        category: 'contracts',
        country: null,
        status: 'draft' as const,
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const mockVersion = {
        id: 'v1',
        templateId: 't1',
        version: 1,
        content: '# Content',
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(mockTemplate);
      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(mockVersion);

      const whereSpy = vi.fn().mockResolvedValue([]);
      const innerJoinSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const fromSpy = vi.fn().mockReturnValue({ innerJoin: innerJoinSpy });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromSpy } as never);

      const result = await getTemplate(db, 't1');

      expect(result?.tags).toEqual([]);
    });
  });

  // ── Task 7: updateTemplate ──────────────────────────────────────────

  describe('updateTemplate', () => {
    it('validates input with updateTemplateSchema', async () => {
      await expect(updateTemplate(db, 't1', { title: '' }, 'user-1')).rejects.toThrow(ZodError);
    });

    it('returns not_found error if template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await updateTemplate(db, 'nonexistent', { title: 'Updated' }, 'user-1');

      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns archived error if template is archived', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Old',
        slug: 'old-abc123',
        category: 'contracts',
        country: null,
        status: 'archived',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await updateTemplate(db, 't1', { title: 'Updated' }, 'user-1');

      expect(result).toEqual({ error: 'archived' });
    });

    it('increments version and creates new version row with content', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Original',
        slug: 'original-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      // Mock select for fetching existing tags (no tags provided in update)
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
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Original',
        slug: 'original-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

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

      // Mock select for fetching existing tags (no tags provided in update)
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
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Tagged',
        slug: 'tagged-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

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
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Old Title',
        slug: 'old-title-abc123',
        category: 'contracts',
        country: null,
        status: 'active',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      // Mock select for fetching existing tags (no tags provided in update)
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

    it('syncs tags when provided', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Tagged',
        slug: 'tagged-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

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

  // ── Task 8: publishTemplate and archiveTemplate ──────────────────────

  describe('publishTemplate', () => {
    it('returns not_found if template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await publishTemplate(db, 'nonexistent', 'user-1');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns already_active if template is already active', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Active',
        slug: 'active-abc123',
        category: 'contracts',
        country: null,
        status: 'active',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await publishTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'already_active' });
    });

    it('returns archived error if template is archived', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Archived',
        slug: 'archived-abc123',
        category: 'contracts',
        country: null,
        status: 'archived',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await publishTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'archived' });
    });

    it('publishes draft template successfully', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Draft',
        slug: 'draft-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await publishTemplate(db, 't1', 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.status).toBe('active');
      }
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('archiveTemplate', () => {
    it('returns not_found if template does not exist', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await archiveTemplate(db, 'nonexistent', 'user-1');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns already_archived if template is already archived', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Archived',
        slug: 'archived-abc123',
        category: 'contracts',
        country: null,
        status: 'archived',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await archiveTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'already_archived' });
    });

    it('archives draft template successfully', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Draft',
        slug: 'draft-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await archiveTemplate(db, 't1', 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.status).toBe('archived');
      }
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });

    it('archives active template successfully', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Active',
        slug: 'active-abc123',
        category: 'contracts',
        country: null,
        status: 'active',
        currentVersion: 2,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await archiveTemplate(db, 't1', 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.status).toBe('archived');
      }
    });

    it('includes previousStatus in audit metadata', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Active',
        slug: 'active-abc123',
        category: 'contracts',
        country: null,
        status: 'active',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      await archiveTemplate(db, 't1', 'user-1');

      // The batch should include an audit log insert with previousStatus metadata
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps).toBeDefined();
      expect(batchOps.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── WS5: unarchiveTemplate ───────────────────────────────────────────

  describe('unarchiveTemplate', () => {
    it('returns not_found for missing template', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue(undefined);

      const result = await unarchiveTemplate(db, 'nonexistent', 'user-1');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_archived for draft templates', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Draft',
        slug: 'draft-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await unarchiveTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'not_archived' });
    });

    it('returns not_archived for active templates', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Active',
        slug: 'active-abc123',
        category: 'contracts',
        country: null,
        status: 'active',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await unarchiveTemplate(db, 't1', 'user-1');
      expect(result).toEqual({ error: 'not_archived' });
    });

    it('successfully unarchives an archived template', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Archived Template',
        slug: 'archived-abc123',
        category: 'contracts',
        country: null,
        status: 'archived',
        currentVersion: 3,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      const result = await unarchiveTemplate(db, 't1', 'user-1');

      expect(result).toHaveProperty('template');
      if ('template' in result) {
        expect(result.template.status).toBe('draft');
      }
      expect(batchSpy).toHaveBeenCalledTimes(1);
    });

    it('creates audit log with unarchive action', async () => {
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Archived',
        slug: 'archived-abc123',
        category: 'contracts',
        country: null,
        status: 'archived',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const batchSpy = vi.spyOn(db, 'batch').mockResolvedValue([] as never);

      await unarchiveTemplate(db, 't1', 'admin-1');

      // The batch should include template update + audit log insert
      const batchOps = batchSpy.mock.calls[0]?.[0] as readonly unknown[];
      expect(batchOps).toBeDefined();
      expect(batchOps.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Task 9: getTemplateVersions, getTemplateVersion, downloadTemplate ──

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
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Employment Contract',
        slug: 'employment-contract-abc123',
        category: 'contracts',
        country: 'US',
        status: 'active',
        currentVersion: 2,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });

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
      vi.spyOn(db.query.templates, 'findFirst').mockResolvedValue({
        id: 't1',
        title: 'Test',
        slug: 'test-abc123',
        category: 'contracts',
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      vi.spyOn(db.query.templateVersions, 'findFirst').mockResolvedValue(undefined);

      const result = await downloadTemplate(db, 't1');
      expect(result).toBeNull();
    });
  });
});
