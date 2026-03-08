import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import type { AppDb } from '../../src/db/index.js';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
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
    it('creates a template with status draft and version 1', async () => {
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

      expect(result.template.status).toBe('draft');
      expect(result.template.currentVersion).toBe(1);
      expect(result.template.title).toBe('Employment Contract');
      expect(result.template.category).toBe('contracts');
      expect(result.template.createdBy).toBe(USER_ID);
      expect(result.template.id).toBeDefined();
      expect(result.template.slug).toMatch(/^employment-contract-[\da-f]{6}$/);
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

    it('lists templates in results', async () => {
      await createTemplate(
        db,
        { title: 'Listed Template', category: 'contracts', content: '# Content' },
        USER_ID,
      );

      const result = await listTemplates(db, {});

      expect(result.total).toBe(1);
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0]?.title).toBe('Listed Template');
    });

    it('publishes a draft template to active status', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'To Publish', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      const result = await publishTemplate(db, template.id, USER_ID);

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.status).toBe('active');
      }

      // Verify in DB
      const fetched = await getTemplate(db, template.id);
      expect(fetched?.template.status).toBe('active');
    });

    it('archives a template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'To Archive', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      const result = await archiveTemplate(db, template.id, USER_ID);

      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.status).toBe('archived');
      }

      // Verify in DB
      const fetched = await getTemplate(db, template.id);
      expect(fetched?.template.status).toBe('archived');
    });

    it('rejects update on archived template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Archived Doc', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const result = await updateTemplate(db, template.id, { title: 'New Title' }, USER_ID);

      expect(result).toEqual({ error: 'archived' });
    });

    it('rejects publish on archived template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Archived Doc', category: 'contracts', content: '# Content' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const result = await publishTemplate(db, template.id, USER_ID);

      expect(result).toEqual({ error: 'archived' });
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

  // ── 2. State Transition Tests ───────────────────────────────────────

  describe('state transitions', () => {
    it('allows draft -> active (publish)', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Draft', category: 'contracts', content: '# D' },
          USER_ID,
        ),
      );

      const result = await publishTemplate(db, template.id, USER_ID);
      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.status).toBe('active');
      }
    });

    it('allows draft -> archived (archive/discard)', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Draft', category: 'contracts', content: '# D' },
          USER_ID,
        ),
      );

      const result = await archiveTemplate(db, template.id, USER_ID);
      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.status).toBe('archived');
      }
    });

    it('allows active -> archived (archive)', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Active', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      await publishTemplate(db, template.id, USER_ID);

      const result = await archiveTemplate(db, template.id, USER_ID);
      expect('template' in result).toBe(true);
      if ('template' in result) {
        expect(result.template.status).toBe('archived');
      }
    });

    it('rejects archived -> active (publish)', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Archived', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const result = await publishTemplate(db, template.id, USER_ID);
      expect(result).toEqual({ error: 'archived' });
    });

    it('rejects publish on already active template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Active', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      await publishTemplate(db, template.id, USER_ID);

      const result = await publishTemplate(db, template.id, USER_ID);
      expect(result).toEqual({ error: 'already_active' });
    });

    it('rejects archive on already archived template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Archived', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const result = await archiveTemplate(db, template.id, USER_ID);
      expect(result).toEqual({ error: 'already_archived' });
    });

    it('rejects update on archived template', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Archived', category: 'contracts', content: '# A' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const result = await updateTemplate(db, template.id, { content: '# New' }, USER_ID);
      expect(result).toEqual({ error: 'archived' });
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

    it('updates template tags — old tags removed, new tags added', async () => {
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

      // Count the tag rows — should only be 1 'shared-tag' row in tags table
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
      // Create 7 templates
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

      // Page 1 with limit 3
      const page1 = await listTemplates(db, { page: 1, limit: 3 });
      expect(page1.templates).toHaveLength(3);
      expect(page1.total).toBe(7);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(3);

      // Page 2 with limit 3
      const page2 = await listTemplates(db, { page: 2, limit: 3 });
      expect(page2.templates).toHaveLength(3);
      expect(page2.total).toBe(7);

      // Page 3 with limit 3 (only 1 remaining)
      const page3 = await listTemplates(db, { page: 3, limit: 3 });
      expect(page3.templates).toHaveLength(1);
      expect(page3.total).toBe(7);
    });

    it('returns empty page when beyond total', async () => {
      await createTemplate(
        db,
        { title: 'Solo', category: 'contracts', content: '# Solo' },
        USER_ID,
      );

      const result = await listTemplates(db, { page: 5, limit: 10 });
      expect(result.templates).toHaveLength(0);
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
      const titles = result.templates.map((t) => t.title);
      expect(titles).toContain('Employment Agreement');
      expect(titles).toContain('Service Level Agreement');
    });

    it('filters by category', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { category: 'policies' });
      expect(result.total).toBe(1);
      expect(result.templates[0]?.title).toBe('Privacy Policy');
    });

    it('filters by status', async () => {
      await seedFilterTemplates();

      // All templates start as draft
      const drafts = await listTemplates(db, { status: 'draft' });
      expect(drafts.total).toBe(3);

      const actives = await listTemplates(db, { status: 'active' });
      expect(actives.total).toBe(0);
    });

    it('filters by country', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { country: 'UK' });
      expect(result.total).toBe(1);
      expect(result.templates[0]?.title).toBe('Privacy Policy');
    });

    it('filters by tag', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { tag: 'employment' });
      expect(result.total).toBe(1);
      expect(result.templates[0]?.title).toBe('Employment Agreement');
    });

    it('combines multiple filters', async () => {
      await seedFilterTemplates();

      const result = await listTemplates(db, { category: 'contracts', country: 'US' });
      expect(result.total).toBe(2);

      const result2 = await listTemplates(db, { category: 'contracts', search: 'employment' });
      expect(result2.total).toBe(1);
      expect(result2.templates[0]?.title).toBe('Employment Agreement');
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
      // Ordered by version DESC
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

    it('logs publish action', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Audited', category: 'contracts', content: '# Audit' },
          USER_ID,
        ),
      );

      await publishTemplate(db, template.id, ADMIN_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.action).toBe('publish');
      expect(entries[1]?.user_id).toBe(ADMIN_ID);
    });

    it('logs archive action', async () => {
      const { template } = expectSuccess(
        await createTemplate(
          db,
          { title: 'Audited', category: 'contracts', content: '# Audit' },
          USER_ID,
        ),
      );

      await archiveTemplate(db, template.id, USER_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.action).toBe('archive');
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
      await publishTemplate(db, template.id, ADMIN_ID);
      await archiveTemplate(db, template.id, ADMIN_ID);

      const entries = getAuditEntries(template.id);
      expect(entries).toHaveLength(4);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['create', 'update', 'publish', 'archive']);
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

    it('returns not_found for publish on nonexistent template', async () => {
      const result = await publishTemplate(db, 'nope', USER_ID);
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns not_found for archive on nonexistent template', async () => {
      const result = await archiveTemplate(db, 'nope', USER_ID);
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
