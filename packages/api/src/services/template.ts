import { eq, and, like, sql, desc, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { updateTemplateSchema, templateQuerySchema } from '@legalcode/shared';
import type { CreateTemplateInput, UpdateTemplateInput, TemplateQuery } from '@legalcode/shared';
import type { AppDb } from '../db/index.js';
import { templates, templateVersions, tags, templateTags, auditLog } from '../db/schema.js';

// ── Helpers ───────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

interface TagResolution {
  tagId: string;
  name: string;
  isNew: boolean;
}

async function resolveTag(db: AppDb, tagName: string): Promise<TagResolution> {
  const existing = await db.select().from(tags).where(eq(tags.name, tagName));

  const found = existing[0];
  if (found) {
    return { tagId: found.id, name: found.name, isNew: false };
  }

  const newId = crypto.randomUUID();
  return { tagId: newId, name: tagName, isNew: true };
}

async function resolveTags(db: AppDb, tagNames: string[]): Promise<TagResolution[]> {
  const results: TagResolution[] = [];
  for (const name of tagNames) {
    results.push(await resolveTag(db, name));
  }
  return results;
}

// ── Task 4: createTemplate ────────────────────────────────────────────

export async function createTemplate(
  db: AppDb,
  input: CreateTemplateInput,
  userId: string,
): Promise<{ template: typeof templates.$inferSelect; tags: string[] } | { error: 'db_error' }> {
  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  const now = nowISO();
  const versionId = crypto.randomUUID();
  const tagNames = input.tags ?? [];

  const templateRow = {
    id,
    title: input.title,
    slug,
    category: input.category,
    description: input.description ?? null,
    country: input.country ?? null,
    status: 'draft' as const,
    currentVersion: 1,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const versionRow = {
    id: versionId,
    templateId: id,
    version: 1,
    content: input.content,
    changeSummary: 'Initial version',
    createdBy: userId,
    createdAt: now,
  };

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'create',
    entityType: 'template',
    entityId: id,
    metadata: JSON.stringify({ title: input.title, category: input.category }),
    createdAt: now,
  };

  // Resolve tags
  const resolvedTags = await resolveTags(db, tagNames);

  // Build batch operations
  const ops: BatchItem<'sqlite'>[] = [
    db.insert(templates).values(templateRow),
    db.insert(templateVersions).values(versionRow),
    db.insert(auditLog).values(auditRow),
  ];

  for (const tag of resolvedTags) {
    if (tag.isNew) {
      ops.push(db.insert(tags).values({ id: tag.tagId, name: tag.name }));
    }
    ops.push(db.insert(templateTags).values({ templateId: id, tagId: tag.tagId }));
  }

  try {
    await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  } catch (e) {
    console.error('[createTemplate] batch insert failed:', e);
    return { error: 'db_error' as const };
  }

  return {
    template: templateRow,
    tags: tagNames,
  };
}

// ── Task 5: listTemplates ─────────────────────────────────────────────

interface ListResult {
  data: (typeof templates.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
}

export async function listTemplates(db: AppDb, query: Partial<TemplateQuery>): Promise<ListResult> {
  const parsed = templateQuerySchema.parse(query);

  const conditions = [];

  if (parsed.search) {
    const escaped = parsed.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    conditions.push(like(templates.title, `%${escaped}%`));
  }
  if (parsed.status) {
    conditions.push(eq(templates.status, parsed.status));
  }
  if (parsed.category) {
    conditions.push(eq(templates.category, parsed.category));
  }
  if (parsed.country) {
    conditions.push(eq(templates.country, parsed.country));
  }
  if (parsed.tag) {
    const taggedIds = db
      .select({ templateId: templateTags.templateId })
      .from(templateTags)
      .innerJoin(tags, eq(templateTags.tagId, tags.id))
      .where(eq(tags.name, parsed.tag));
    conditions.push(inArray(templates.id, taggedIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (parsed.page - 1) * parsed.limit;

  // Count query
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(templates)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  // Data query
  const rows = await db
    .select()
    .from(templates)
    .where(whereClause)
    .offset(offset)
    .limit(parsed.limit)
    .all();

  return {
    data: rows,
    total,
    page: parsed.page,
    limit: parsed.limit,
  };
}

// ── Task 6: getTemplate ───────────────────────────────────────────────

interface GetTemplateResult {
  template: typeof templates.$inferSelect;
  content: string;
  changeSummary: string | null;
  tags: string[];
}

export async function getTemplate(
  db: AppDb,
  templateId: string,
): Promise<GetTemplateResult | null> {
  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!template) {
    return null;
  }

  const version = await db.query.templateVersions.findFirst({
    where: and(
      eq(templateVersions.templateId, templateId),
      eq(templateVersions.version, template.currentVersion),
    ),
  });

  const tagRows = await db
    .select({ name: tags.name })
    .from(templateTags)
    .innerJoin(tags, eq(templateTags.tagId, tags.id))
    .where(eq(templateTags.templateId, templateId));

  const tagNames = tagRows.map((row) => row.name);

  return {
    template,
    content: version?.content ?? '',
    changeSummary: version?.changeSummary ?? null,
    tags: tagNames,
  };
}

// ── Task 7: updateTemplate ────────────────────────────────────────────

type UpdateResult =
  | { error: 'not_found' }
  | { error: 'archived' }
  | { template: typeof templates.$inferSelect; tags: string[] };

export async function updateTemplate(
  db: AppDb,
  templateId: string,
  input: UpdateTemplateInput,
  userId: string,
): Promise<UpdateResult> {
  const parsed = updateTemplateSchema.parse(input);

  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!existing) {
    return { error: 'not_found' };
  }

  if (existing.status === 'archived') {
    return { error: 'archived' };
  }

  const now = nowISO();
  const newVersion = existing.currentVersion + 1;

  // Determine content for new version
  let content: string;
  if (parsed.content !== undefined) {
    content = parsed.content;
  } else {
    const currentVersion = await db.query.templateVersions.findFirst({
      where: and(
        eq(templateVersions.templateId, templateId),
        eq(templateVersions.version, existing.currentVersion),
      ),
    });
    content = currentVersion?.content ?? '';
  }

  const versionRow = {
    id: crypto.randomUUID(),
    templateId,
    version: newVersion,
    content,
    changeSummary: parsed.changeSummary ?? null,
    createdBy: userId,
    createdAt: now,
  };

  const updatedTemplate = {
    ...existing,
    title: parsed.title ?? existing.title,
    category: parsed.category ?? existing.category,
    description:
      parsed.description !== undefined ? (parsed.description ?? null) : existing.description,
    country: parsed.country !== undefined ? (parsed.country ?? null) : existing.country,
    currentVersion: newVersion,
    updatedAt: now,
  };

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'update',
    entityType: 'template',
    entityId: templateId,
    metadata: JSON.stringify({
      version: newVersion,
      fields: Object.keys(parsed).filter((k) => parsed[k as keyof typeof parsed] !== undefined),
    }),
    createdAt: now,
  };

  const ops: BatchItem<'sqlite'>[] = [
    db
      .update(templates)
      .set({
        title: updatedTemplate.title,
        category: updatedTemplate.category,
        country: updatedTemplate.country,
        currentVersion: newVersion,
        updatedAt: now,
      })
      .where(eq(templates.id, templateId)),
    db.insert(templateVersions).values(versionRow),
    db.insert(auditLog).values(auditRow),
  ];

  // Handle tag sync if tags provided
  let tagNames: string[];
  if (parsed.tags !== undefined) {
    tagNames = [];
    // Delete old tags
    ops.push(db.delete(templateTags).where(eq(templateTags.templateId, templateId)));

    // Resolve and add new tags
    const resolvedTags = await resolveTags(db, parsed.tags);
    for (const tag of resolvedTags) {
      tagNames.push(tag.name);
      if (tag.isNew) {
        ops.push(db.insert(tags).values({ id: tag.tagId, name: tag.name }));
      }
      ops.push(db.insert(templateTags).values({ templateId, tagId: tag.tagId }));
    }
  } else {
    // Fetch existing tags when tags not included in update
    const existingTags = await db
      .select({ name: tags.name })
      .from(templateTags)
      .innerJoin(tags, eq(templateTags.tagId, tags.id))
      .where(eq(templateTags.templateId, templateId));
    tagNames = existingTags.map((row) => row.name);
  }

  await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

  return {
    template: updatedTemplate,
    tags: tagNames,
  };
}

// ── Task 8: publishTemplate ───────────────────────────────────────────

type PublishResult =
  | { error: 'not_found' }
  | { error: 'already_active' }
  | { error: 'archived' }
  | { template: typeof templates.$inferSelect };

export async function publishTemplate(
  db: AppDb,
  templateId: string,
  userId: string,
): Promise<PublishResult> {
  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!existing) {
    return { error: 'not_found' };
  }

  if (existing.status === 'active') {
    return { error: 'already_active' };
  }

  if (existing.status === 'archived') {
    return { error: 'archived' };
  }

  const now = nowISO();

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'publish',
    entityType: 'template',
    entityId: templateId,
    metadata: JSON.stringify({ previousStatus: existing.status }),
    createdAt: now,
  };

  const ops: BatchItem<'sqlite'>[] = [
    db
      .update(templates)
      .set({ status: 'active', updatedAt: now })
      .where(eq(templates.id, templateId)),
    db.insert(auditLog).values(auditRow),
  ];

  await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

  return {
    template: {
      ...existing,
      status: 'active',
      updatedAt: now,
    },
  };
}

// ── Task 8: archiveTemplate ──────────────────────────────────────────

type ArchiveResult =
  | { error: 'not_found' }
  | { error: 'already_archived' }
  | { template: typeof templates.$inferSelect };

export async function archiveTemplate(
  db: AppDb,
  templateId: string,
  userId: string,
): Promise<ArchiveResult> {
  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!existing) {
    return { error: 'not_found' };
  }

  if (existing.status === 'archived') {
    return { error: 'already_archived' };
  }

  const now = nowISO();

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'archive',
    entityType: 'template',
    entityId: templateId,
    metadata: JSON.stringify({ previousStatus: existing.status }),
    createdAt: now,
  };

  const ops: BatchItem<'sqlite'>[] = [
    db
      .update(templates)
      .set({ status: 'archived', updatedAt: now })
      .where(eq(templates.id, templateId)),
    db.insert(auditLog).values(auditRow),
  ];

  await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

  return {
    template: {
      ...existing,
      status: 'archived',
      updatedAt: now,
    },
  };
}

// ── WS5: unarchiveTemplate ────────────────────────────────────────────

type UnarchiveResult =
  | { error: 'not_found' }
  | { error: 'not_archived' }
  | { template: typeof templates.$inferSelect };

export async function unarchiveTemplate(
  db: AppDb,
  templateId: string,
  userId: string,
): Promise<UnarchiveResult> {
  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!existing) {
    return { error: 'not_found' };
  }

  if (existing.status !== 'archived') {
    return { error: 'not_archived' };
  }

  const now = nowISO();

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'unarchive',
    entityType: 'template',
    entityId: templateId,
    metadata: JSON.stringify({ previousStatus: existing.status }),
    createdAt: now,
  };

  const ops: BatchItem<'sqlite'>[] = [
    db
      .update(templates)
      .set({ status: 'draft', updatedAt: now })
      .where(eq(templates.id, templateId)),
    db.insert(auditLog).values(auditRow),
  ];

  await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

  return {
    template: {
      ...existing,
      status: 'draft',
      updatedAt: now,
    },
  };
}

// ── saveDraftContent (autosave) ───────────────────────────────────────

type SaveDraftResult = { error: 'not_found' } | { error: 'not_draft' } | { updatedAt: string };

export async function saveDraftContent(
  db: AppDb,
  templateId: string,
  content: string,
  title: string | undefined,
): Promise<SaveDraftResult> {
  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!existing) {
    return { error: 'not_found' };
  }

  if (existing.status !== 'draft') {
    return { error: 'not_draft' };
  }

  const now = nowISO();

  const templateUpdate: Record<string, unknown> = { updatedAt: now };
  if (title !== undefined) {
    templateUpdate.title = title;
  }

  const ops: BatchItem<'sqlite'>[] = [
    db
      .update(templateVersions)
      .set({ content })
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, existing.currentVersion),
        ),
      ),
    db.update(templates).set(templateUpdate).where(eq(templates.id, templateId)),
  ];

  await db.batch(ops as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

  return { updatedAt: now };
}

// ── Task 9: getTemplateVersions ───────────────────────────────────────

export async function getTemplateVersions(
  db: AppDb,
  templateId: string,
): Promise<(typeof templateVersions.$inferSelect)[]> {
  return db.query.templateVersions.findMany({
    where: eq(templateVersions.templateId, templateId),
    orderBy: [desc(templateVersions.version)],
  });
}

// ── Task 9: getTemplateVersion ────────────────────────────────────────

export async function getTemplateVersion(
  db: AppDb,
  templateId: string,
  version: number,
): Promise<typeof templateVersions.$inferSelect | null> {
  const result = await db.query.templateVersions.findFirst({
    where: and(eq(templateVersions.templateId, templateId), eq(templateVersions.version, version)),
  });

  return result ?? null;
}

// ── Task 9: downloadTemplate ──────────────────────────────────────────

interface DownloadResult {
  filename: string;
  content: string;
}

export async function downloadTemplate(
  db: AppDb,
  templateId: string,
): Promise<DownloadResult | null> {
  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  });

  if (!template) {
    return null;
  }

  const version = await db.query.templateVersions.findFirst({
    where: and(
      eq(templateVersions.templateId, templateId),
      eq(templateVersions.version, template.currentVersion),
    ),
  });

  if (!version) {
    return null;
  }

  return {
    filename: `${template.slug}.md`,
    content: version.content,
  };
}
