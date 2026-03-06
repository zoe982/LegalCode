/**
 * Shared template persistence functions using raw D1Database.
 *
 * These pure functions operate on the raw D1 binding (not Drizzle AppDb)
 * so they can be called from both Hono routes and Durable Objects.
 */

export interface PersistVersionInput {
  templateId: string;
  content: string;
  createdBy: string;
  changeSummary: string;
}

export async function persistVersion(
  db: D1Database,
  input: PersistVersionInput,
): Promise<{ version: number }> {
  const { templateId, content, createdBy, changeSummary } = input;

  // 1. Get current version
  const row = await db
    .prepare('SELECT current_version FROM templates WHERE id = ?')
    .bind(templateId)
    .first<{ current_version: number }>();

  if (!row) {
    throw new Error('Template not found');
  }

  const newVersion = row.current_version + 1;
  const now = new Date().toISOString();
  const versionId = crypto.randomUUID();

  // 2. Batch: insert version + update template
  const insertStmt = db
    .prepare(
      'INSERT INTO template_versions (id, template_id, version, content, change_summary, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(versionId, templateId, newVersion, content, changeSummary, createdBy, now);

  const updateStmt = db
    .prepare('UPDATE templates SET current_version = ?, updated_at = ? WHERE id = ?')
    .bind(newVersion, now, templateId);

  await db.batch([insertStmt, updateStmt]);

  return { version: newVersion };
}

export interface VersionContent {
  content: string;
  version: number;
  createdAt: string;
}

export async function getLatestVersionContent(
  db: D1Database,
  templateId: string,
): Promise<VersionContent | null> {
  const row = await db
    .prepare(
      'SELECT content, version, created_at AS createdAt FROM template_versions WHERE template_id = ? ORDER BY version DESC LIMIT 1',
    )
    .bind(templateId)
    .first<VersionContent>();

  return row ?? null;
}
