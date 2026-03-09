import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import type { AppDb } from '../../src/db/index.js';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
  deleteTemplate,
  restoreTemplate,
  hardDeleteTemplate,
  listDeletedTemplates,
  saveContent,
} from '../../src/services/template.js';
import { createTestDb, clearAllData } from './helpers.js';

/** Asserts createTemplate succeeded and narrows the type. */
function expectSuccess(result: Awaited<ReturnType<typeof createTemplate>>) {
  if ('error' in result) throw new Error(`Expected success but got error: ${result.error}`);
  return result;
}

const USER_ID = 'test-user-1';
const ADMIN_ID = 'test-admin-1';

describe('template CRUD integration (real SQLite)', () => {
  let db: AppDb;
  let sqlite: Database.Database;

  beforeAll(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
  });

  beforeEach(() => {
    clearAllData(sqlite);
  });

  // ── 1. Full CRUD Lifecycle ──────────────────────────────────────────

  describe('full CRUD lifecycle', () => {
    it('creates a template with currentVersion 1 and null deletedAt', async () => {
      const result = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'Employment Contract',
            category: 'contracts',
            content: '# Employment\n\nContent here.',
          },
          USER_ID,
        ),
      );

      expect(result.template.currentVersion).toBe(1);
      expect(result.template.title).toBe('Employment Contract');
      expect(result.template.category).toBe('contracts');
      expect(result.template.createdBy).toBe(USER_ID);
      expect(result.template.id).toBeDefined();
      expect(result.template.slug).toMatch(/^employment-contract-[\da-f]{6}$/);
      expect(result.template.deletedAt).toBeNull();
      expect(result.template.deletedBy).toBeNull();
    });

    it('retrieves template with content and tags via getTemplate', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'NDA Template',
            category: 'contracts',
            content: '# NDA\n\nNon-disclosure agreement.',
            tags: ['nda', 'confidential'],
          },
          USER_ID,
        ),
      );

      const result = await getTemplate(db, template.id);

      expect(result).not.toBeNull();
      expect(result?.template.title).toBe('NDA Template');
      expect(result?.content).toBe('# NDA\n\nNon-disclosure agreement.');
      expect(result?.tags).toEqual(expect.arrayContaining(['nda', 'confidential']));
      expect(result?.tags).toHaveLength(2);
    });

    it('updates template creating version 2 while preserving version 1', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Original', category: 'contracts', content: '# V1 content' },
          USER_ID,
        ),
      );

      const updateResult = await updateTemplate(
        db,
        template.id,
        { content: '# V2 content', changeSummary: 'Updated content' },
        USER_ID,
      );

      expect('template' in updateResult).toBe(true);
      if ('template' in updateResult) {
        expect(updateResult.template.currentVersion).toBe(2);
      }

      // Verify old version still exists
      const v1 = await getTemplateVersion(db, template.id, 1);
      expect(v1).not.toBeNull();
      expect(v1?.content).toBe('# V1 content');

      const v2 = await getTemplateVersion(db, template.id, 2);
      expect(v2).not.toBeNull();
      expect(v2?.content).toBe('# V2 content');
    });

    it('lists templates in results (excludes deleted)', async () => {
      expectSuccess(
        await createTemplate(
          db,
          { title: 'Listed Template', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      const { template: t2 } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Deleted Template', category: 'contracts', content: '# Deleted' },
          USER_ID,
        ),
      );

      // Soft-delete t2
      await deleteTemplate(db, t2.id, USER_ID);

      const result = await listTemplates(db, {});

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.title).toBe('Listed Template');
    });

    it('soft-deletes and restores a template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'To Delete', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      // Soft delete
      const deleteResult = await deleteTemplate(db, template.id, USER_ID);
      expect(deleteResult).toEqual({ success: true });

      // getTemplate should return null for deleted
      const fetched = await getTemplate(db, template.id);
      expect(fetched).toBeNull();

      // Restore
      const restoreResult = await restoreTemplate(db, template.id);
      expect(restoreResult).toEqual({ success: true });

      // getTemplate should work again
      const restored = await getTemplate(db, template.id);
      expect(restored).not.toBeNull();
      expect(restored?.template.title).toBe('To Delete');
      expect(restored?.template.deletedAt).toBeNull();
      expect(restored?.template.deletedBy).toBeNull();
    });

    it('hard-deletes a template permanently', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'To Hard Delete', category: 'contracts', content: '# Content', tags: ['test'] },
          USER_ID,
        ),
      );

      const result = await hardDeleteTemplate(db, template.id);
      expect(result).toEqual({ success: true });

      // Template should be completely gone
      const fetched = await getTemplate(db, template.id);
      expect(fetched).toBeNull();

      // Versions should also be gone
      const versions = await getTemplateVersions(db, template.id);
      expect(versions).toHaveLength(0);
    });

    it('rejects update on deleted template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Deleted Doc', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      await deleteTemplate(db, template.id, USER_ID);

      const result = await updateTemplate(db, template.id, { title: 'New Title' }, USER_ID);

      expect(result).toEqual({ error: 'deleted' });
    });

    it('rejects autosave on deleted template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Deleted Doc', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      await deleteTemplate(db, template.id, USER_ID);

      const result = await saveContent(db, template.id, '# New content', undefined);

      expect(result).toEqual({ error: 'deleted' });
    });

    it('downloads template with correct filename and content', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Download Me', category: 'contracts', content: '# Download content' },
          USER_ID,
        ),
      );

      const result = await downloadTemplate(db, template.id);

      expect(result).not.toBeNull();
      expect(result?.filename).toMatch(/^download-me-[\da-f]{6}\.md$/);
      expect(result?.content).toBe('# Download content');
    });
  });

  // ── 2. Delete / Restore Tests ───────────────────────────────────────

  describe('delete and restore', () => {
    it('rejects double soft-delete', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Double Delete', category: 'contracts', content: '# D' },
          USER_ID,
        ),
      );

      await deleteTemplate(db, template.id, USER_ID);

      const result = await deleteTemplate(db, template.id, USER_ID);
      expect(result).toEqual({ error: 'already_deleted' });
    });

    it('rejects restore on non-deleted template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Not Deleted', category: 'contracts', content: '# D' },
          USER_ID,
        ),
      );

      const result = await restoreTemplate(db, template.id);
      expect(result).toEqual({ error: 'not_deleted' });
    });

    it('listDeletedTemplates returns only deleted templates', async () => {
      expectSuccess(
        await createTemplate(
          db,
          { title: 'Active', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      const { template: t2 } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Deleted', category: 'contracts', content: '# D' },
          USER_ID,
        ),
      );

      await deleteTemplate(db, t2.id, USER_ID);

      const deletedList = await listDeletedTemplates(db);
      expect(deletedList).toHaveLength(1);
      expect(deletedList[0]?.id).toBe(t2.id);
    });

    it('hard delete removes all related data', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'Full Remove',
            category: 'contracts',
            content: '# Body',
            tags: ['tag1', 'tag2'],
          },
          USER_ID,
        ),
      );

      // Add a version
      await updateTemplate(db, template.id, { content: '# V2' }, USER_ID);

      await hardDeleteTemplate(db, template.id);

      // Check all related tables
      const templateRow = sqlite.prepare('SELECT * FROM templates WHERE id = ?').get(template.id);
      expect(templateRow).toBeUndefined();

      const versionRows = sqlite
        .prepare('SELECT * FROM template_versions WHERE template_id = ?')
        .all(template.id);
      expect(versionRows).toHaveLength(0);

      const tagRows = sqlite
        .prepare('SELECT * FROM template_tags WHERE template_id = ?')
        .all(template.id);
      expect(tagRows).toHaveLength(0);
    });
  });

  // ── 3. Tag Management ──────────────────────────────────────────────

  describe('tag management', () => {
    it('creates tags when creating template with tags', async () => {
      const result = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'Tagged',
            category: 'contracts',
            content: '# Tagged',
            tags: ['employment', 'compliance'],
          },
          USER_ID,
        ),
      );

      expect(result.tags).toEqual(expect.arrayContaining(['employment', 'compliance']));

      // Verify tags in DB
      const fetched = await getTemplate(db, result.template.id);
      expect(fetched?.tags).toHaveLength(2);
      expect(fetched?.tags).toEqual(expect.arrayContaining(['employment', 'compliance']));
    });

    it('updates template tags - old tags removed, new tags added', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'Tag Update',
            category: 'contracts',
            content: '# Body',
            tags: ['old-tag-1', 'old-tag-2'],
          },
          USER_ID,
        ),
      );

      await updateTemplate(
        db,
        template.id,
        { content: '# Updated', tags: ['new-tag-1', 'new-tag-3'] },
        USER_ID,
      );

      const fetched = await getTemplate(db, template.id);
      expect(fetched?.tags).toHaveLength(2);
      expect(fetched?.tags).toEqual(expect.arrayContaining(['new-tag-1', 'new-tag-3']));
      expect(fetched?.tags).not.toContain('old-tag-1');
      expect(fetched?.tags).not.toContain('old-tag-2');
    });

    it('reuses tag rows when two templates share a tag', async () => {
      await createTemplate(
        db,
        {
          title: 'Template A',
          category: 'contracts',
          content: '# A',
          tags: ['shared-tag'],
        },
        USER_ID,
      );

      await createTemplate(
        db,
        {
          title: 'Template B',
          category: 'contracts',
          content: '# B',
          tags: ['shared-tag'],
        },
        USER_ID,
      );

      const tagCount = sqlite
        .prepare("SELECT COUNT(*) as count FROM tags WHERE name = 'shared-tag'")
        .get() as { count: number };
      expect(tagCount.count).toBe(1);
    });

    it('clears templateTags when updating to empty tags array', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          {
            title: 'Remove Tags',
            category: 'contracts',
            content: '# Body',
            tags: ['tag-to-remove'],
          },
          USER_ID,
        ),
      );

      await updateTemplate(db, template.id, { content: '# Updated', tags: [] }, USER_ID);

      const fetched = await getTemplate(db, template.id);
      expect(fetched?.tags).toHaveLength(0);
    });
  });

  // ── 4. Pagination ──────────────────────────────────────────────────

  describe('pagination', () => {
    it('paginates results correctly', async () => {
      for (let i = 1; i <= 7; i++) {
        await createTemplate(
          db,
          {
            title: `Template ${String(i)}`,
            category: 'contracts',
            content: `# Content ${String(i)}`,
          },
          USER_ID,
        );
      }

      const page1 = await listTemplates(db, { page: 1, limit: 3 });
      expect(page1.data).toHaveLength(3);
      expect(page1.total).toBe(7);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(3);

      const page2 = await listTemplates(db, { page: 2, limit: 3 });
      expect(page2.data).toHaveLength(3);
      expect(page2.total).toBe(7);

      const page3 = await listTemplates(db, { page: 3, limit: 3 });
      expect(page3.data).toHaveLength(1);
      expect(page3.total).toBe(7);
    });

    it('returns empty page when beyond total', async () => {
      await createTemplate(
        db,
        { title: 'Solo', category: 'contracts', content: '# Solo' },
        USER_ID,
      );

      const result = await listTemplates(db, { page: 5, limit: 10 });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(1);
    });
  });

  // ── 5. Search and Filters ─────────────────────────────────────────

  describe('search and filters', () => {
    async function seedFilterTemplates() {
      await createTemplate(
        db,
        {
          title: 'Employment Agreement',
          category: 'contracts',
          content: '# EA',
          country: 'US',
          tags: ['employment'],
        },
        USER_ID,
      );
      await createTemplate(
        db,
        {
          title: 'Privacy Policy',
          category: 'policies',
          content: '# PP',
          country: 'UK',
          tags: ['privacy'],
        },
        USER_ID,
      );
      await createTemplate(
        db,
        {
          title: 'Service Level Agreement',
          category: 'contracts',
          content: '# SLA',
          country: 'US',
        },
        USER_ID,
      );
    }

    it('searches by title (case-insensitive via LIKE)', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { search: 'agreement' });
      expect(result.total).toBe(2);
      const titles = result.data.map((t) => t.title);
      expect(titles).toContain('Employment Agreement');
      expect(titles).toContain('Service Level Agreement');
    });

    it('filters by category', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { category: 'policies' });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe('Privacy Policy');
    });

    it('filters by country', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { country: 'UK' });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe('Privacy Policy');
    });

    it('filters by tag', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { tag: 'employment' });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe('Employment Agreement');
    });

    it('combines multiple filters', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { category: 'contracts', country: 'US' });
      expect(result.total).toBe(2);

      const result2 = await listTemplates(db, { category: 'contracts', search: 'employment' });
      expect(result2.total).toBe(1);
      expect(result2.data[0]?.title).toBe('Employment Agreement');
    });

    it('excludes deleted templates from search results', async () => {
      await seedFilterTemplates();

      // Delete one
      const allTemplates = await listTemplates(db, {});
      const templateToDelete = allTemplates.data.find((t) => t.title === 'Employment Agreement');
      if (templateToDelete) {
        await deleteTemplate(db, templateToDelete.id, USER_ID);
      }

      const result = await listTemplates(db, { search: 'agreement' });
      expect(result.total).toBe(1);
      expect(result.data[0]?.title).toBe('Service Level Agreement');
    });
  });

  // ── 6. Version History ─────────────────────────────────────────────

  describe('version history', () => {
    it('tracks multiple versions with correct content', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Versioned', category: 'contracts', content: '# Version 1' },
          USER_ID,
        ),
      );

      await updateTemplate(
        db,
        template.id,
        { content: '# Version 2', changeSummary: 'Second revision' },
        USER_ID,
      );

      await updateTemplate(
        db,
        template.id,
        { content: '# Version 3', changeSummary: 'Third revision' },
        USER_ID,
      );

      const versions = await getTemplateVersions(db, template.id);
      expect(versions).toHaveLength(3);
      expect(versions[0]?.version).toBe(3);
      expect(versions[1]?.version).toBe(2);
      expect(versions[2]?.version).toBe(1);
    });

    it('returns specific version content via getTemplateVersion', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Versioned', category: 'contracts', content: '# V1 content' },
          USER_ID,
        ),
      );

      await updateTemplate(
        db,
        template.id,
        { content: '# V2 content', changeSummary: 'Updated' },
        USER_ID,
      );

      const v1 = await getTemplateVersion(db, template.id, 1);
      expect(v1?.content).toBe('# V1 content');
      expect(v1?.changeSummary).toBe('Initial version');

      const v2 = await getTemplateVersion(db, template.id, 2);
      expect(v2?.content).toBe('# V2 content');
      expect(v2?.changeSummary).toBe('Updated');
    });

    it('returns null for nonexistent version', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'One Version', category: 'contracts', content: '# Only' },
          USER_ID,
        ),
      );

      const result = await getTemplateVersion(db, template.id, 99);
      expect(result).toBeNull();
    });

    it('preserves content from previous version when only metadata changes', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Original Title', category: 'contracts', content: '# Preserved content' },
          USER_ID,
        ),
      );

      await updateTemplate(db, template.id, { title: 'New Title' }, USER_ID);

      const v2 = await getTemplateVersion(db, template.id, 2);
      expect(v2?.content).toBe('# Preserved content');
    });
  });

  // ── 7. Audit Logging ───────────────────────────────────────────────

  describe('audit logging', () => {
    function getAuditEntries(entityId: string) {
      return sqlite
        .prepare('SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at')
        .all(entityId) as {
        id: string;
        user_id: string;
        action: string;
        entity_type: string;
        entity_id: string;
        metadata: string | null;
        created_at: string;
      }[];
    }

    it('logs create action', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Audited', category: 'contracts', content: '# Audit' },
          USER_ID,
        ),
      );

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.action).toBe('create');
      expect(entries[0]?.entity_type).toBe('template');
      expect(entries[0]?.entity_id).toBe(template.id);
      expect(entries[0]?.user_id).toBe(USER_ID);
    });

    it('logs update action', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Audited', category: 'contracts', content: '# Audit' },
          USER_ID,
        ),
      );

      await updateTemplate(db, template.id, { title: 'Updated' }, ADMIN_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.action).toBe('update');
      expect(entries[1]?.user_id).toBe(ADMIN_ID);
    });

    it('logs delete action', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Audited', category: 'contracts', content: '# Audit' },
          USER_ID,
        ),
      );

      await deleteTemplate(db, template.id, USER_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.action).toBe('delete');
    });

    it('captures full lifecycle audit trail', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Full Lifecycle', category: 'contracts', content: '# Body' },
          USER_ID,
        ),
      );

      await updateTemplate(db, template.id, { content: '# Updated' }, USER_ID);
      await deleteTemplate(db, template.id, ADMIN_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(3);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['create', 'update', 'delete']);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns null for getTemplate with nonexistent ID', async () => {
      const result = await getTemplate(db, 'does-not-exist');
      expect(result).toBeNull();
    });

    it('returns not_found for update on nonexistent template', async () => {
      const result = await updateTemplate(db, 'nope', { title: 'X' }, USER_ID);
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_found for delete on nonexistent template', async () => {
      const result = await deleteTemplate(db, 'nope', USER_ID);
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_found for restore on nonexistent template', async () => {
      const result = await restoreTemplate(db, 'nope');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_found for hard delete on nonexistent template', async () => {
      const result = await hardDeleteTemplate(db, 'nope');
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns null for download on nonexistent template', async () => {
      const result = await downloadTemplate(db, 'nope');
      expect(result).toBeNull();
    });

    it('handles template with null country', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'No Country', category: 'contracts', content: '# Body' },
          USER_ID,
        ),
      );

      const fetched = await getTemplate(db, template.id);
      expect(fetched?.template.country).toBeNull();
    });

    it('handles country set then cleared to null via update', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Has Country', category: 'contracts', content: '# Body', country: 'US' },
          USER_ID,
        ),
      );

      await updateTemplate(db, template.id, { country: null, content: '# Body' }, USER_ID);

      const fetched = await getTemplate(db, template.id);
      expect(fetched?.template.country).toBeNull();
    });
  });
});
