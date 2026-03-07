/**
 * Version thinning service for auto-versions.
 *
 * Retention policy for auto-versions (changeSummary starts with '[auto]'):
 * - Manual versions (no [auto] prefix): NEVER deleted
 * - Auto-versions within 24h: keep all
 * - Auto-versions 1-7 days: keep one per hour (latest in each hour bucket)
 * - Auto-versions 7-30 days: keep one per day (latest in each day bucket)
 * - Auto-versions 30+ days: keep one per week (latest in each week bucket)
 *
 * Uses raw D1 SQL (not Drizzle) since this is shared with the DO.
 */

interface VersionRow {
  id: string;
  change_summary: string | null;
  created_at: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function getBucketKey(timestamp: number, bucketSize: number): number {
  return Math.floor(timestamp / bucketSize);
}

export async function thinAutoVersions(
  db: D1Database,
  templateId: string,
): Promise<{ deleted: number }> {
  // 1. Query all versions for the template ordered by created_at DESC
  const result = await db
    .prepare(
      'SELECT id, change_summary, created_at FROM template_versions WHERE template_id = ? ORDER BY created_at DESC',
    )
    .bind(templateId)
    .all<VersionRow>();

  const versions = result.results;

  if (versions.length === 0) {
    return { deleted: 0 };
  }

  const now = Date.now();
  const oneDayAgo = now - DAY_MS;
  const sevenDaysAgo = now - 7 * DAY_MS;
  const thirtyDaysAgo = now - 30 * DAY_MS;

  // 2. Separate manual from auto-versions
  const toDelete: string[] = [];

  // Track seen buckets for each retention tier
  const hourBuckets = new Set<number>();
  const dayBuckets = new Set<number>();
  const weekBuckets = new Set<number>();

  for (const version of versions) {
    // Manual versions: never delete
    if (!version.change_summary?.startsWith('[auto]')) {
      continue;
    }

    const timestamp = new Date(version.created_at).getTime();

    // Within 24h: keep all
    if (timestamp >= oneDayAgo) {
      continue;
    }

    // 1-7 days: keep one per hour
    if (timestamp >= sevenDaysAgo) {
      const bucket = getBucketKey(timestamp, HOUR_MS);
      if (hourBuckets.has(bucket)) {
        toDelete.push(version.id);
      } else {
        hourBuckets.add(bucket);
      }
      continue;
    }

    // 7-30 days: keep one per day
    if (timestamp >= thirtyDaysAgo) {
      const bucket = getBucketKey(timestamp, DAY_MS);
      if (dayBuckets.has(bucket)) {
        toDelete.push(version.id);
      } else {
        dayBuckets.add(bucket);
      }
      continue;
    }

    // 30+ days: keep one per week
    const bucket = getBucketKey(timestamp, WEEK_MS);
    if (weekBuckets.has(bucket)) {
      toDelete.push(version.id);
    } else {
      weekBuckets.add(bucket);
    }
  }

  // 3. Delete versions that don't survive retention
  if (toDelete.length > 0) {
    const stmts = toDelete.map((id) =>
      db.prepare('DELETE FROM template_versions WHERE id = ?').bind(id),
    );
    await db.batch(stmts);
  }

  return { deleted: toDelete.length };
}
