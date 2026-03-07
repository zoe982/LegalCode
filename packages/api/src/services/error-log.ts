import { eq, and, desc, type SQL } from 'drizzle-orm';
import type { AppDb } from '../db/index.js';
import { errorLog } from '../db/schema.js';
import type { ErrorSource, ErrorSeverity, ErrorStatus } from '@legalcode/shared';

interface LogErrorInput {
  source: ErrorSource;
  severity?: ErrorSeverity | undefined;
  message: string;
  stack?: string | null | undefined;
  metadata?: string | null | undefined;
  url?: string | null | undefined;
  userId?: string | null | undefined;
}

interface ListErrorsFilters {
  source?: ErrorSource | undefined;
  status?: ErrorStatus | undefined;
  severity?: ErrorSeverity | undefined;
}

function extractFirstStackFrame(stack: string | null | undefined): string {
  if (!stack) return '';
  const lines = stack.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines containing file paths (e.g., "at foo (bar.ts:10)" or "/path/to/file.js:10")
    if (/[/\\].*\.\w+[:/]/.test(trimmed) || /^\s*at\s+/.test(trimmed)) {
      return trimmed;
    }
  }
  return '';
}

export async function generateFingerprint(
  source: string,
  message: string,
  stack: string | null | undefined,
): Promise<string> {
  const firstFrame = extractFirstStackFrame(stack);
  const input = `${source}:${message}:${firstFrame}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function logError(d1: D1Database, input: LogErrorInput): Promise<{ errorId: string }> {
  const errorId = crypto.randomUUID();
  const now = new Date().toISOString();
  const severity = input.severity ?? 'error';
  const fingerprint = await generateFingerprint(input.source, input.message, input.stack);

  const stmt = d1.prepare(
    `INSERT INTO error_log (id, timestamp, source, severity, message, stack, metadata, url, user_id, status, resolved_at, resolved_by, fingerprint, occurrence_count, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', NULL, NULL, ?10, 1, ?2)
     ON CONFLICT(fingerprint) DO UPDATE SET
       occurrence_count = occurrence_count + 1,
       last_seen_at = ?2,
       status = 'open',
       resolved_at = NULL,
       resolved_by = NULL`,
  );

  await stmt
    .bind(
      errorId,
      now,
      input.source,
      severity,
      input.message,
      input.stack ?? null,
      input.metadata ?? null,
      input.url ?? null,
      input.userId ?? null,
      fingerprint,
    )
    .run();

  return { errorId };
}

export async function listErrors(
  db: AppDb,
  filters: ListErrorsFilters,
): Promise<(typeof errorLog.$inferSelect)[]> {
  const conditions: SQL[] = [];

  if (filters.source !== undefined) {
    conditions.push(eq(errorLog.source, filters.source));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(errorLog.status, filters.status));
  }
  if (filters.severity !== undefined) {
    conditions.push(eq(errorLog.severity, filters.severity));
  }

  const query = db.select().from(errorLog);

  if (conditions.length > 0) {
    const firstCondition = conditions[0];
    if (firstCondition === undefined) {
      return query.orderBy(desc(errorLog.lastSeenAt)).limit(100);
    }
    const where = conditions.length === 1 ? firstCondition : and(...conditions);
    return query.where(where).orderBy(desc(errorLog.lastSeenAt)).limit(100);
  }

  return query.orderBy(desc(errorLog.lastSeenAt)).limit(100);
}

export async function resolveError(db: AppDb, errorId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const updated = await db
    .update(errorLog)
    .set({
      status: 'resolved',
      resolvedAt: now,
      resolvedBy: userId,
    })
    .where(eq(errorLog.id, errorId))
    .returning({ id: errorLog.id });

  return updated.length > 0;
}
