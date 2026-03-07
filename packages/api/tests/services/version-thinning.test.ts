/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { thinAutoVersions } from '../../src/services/version-thinning.js';

interface MockVersion {
  id: string;
  change_summary: string | null;
  created_at: string;
}

function createMockDb(versions: MockVersion[]) {
  const deletedIds: string[] = [];
  return {
    db: {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) {
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: versions }),
            }),
          };
        }
        // DELETE statement
        return {
          bind: vi.fn().mockImplementation((...args: unknown[]) => {
            deletedIds.push(args[0] as string);
            return {
              run: vi.fn().mockResolvedValue({}),
            };
          }),
        };
      }),
      batch: vi.fn().mockResolvedValue([]),
    } as unknown as D1Database,
    deletedIds,
  };
}

function makeVersion(id: string, changeSummary: string | null, hoursAgo: number): MockVersion {
  const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return {
    id,
    change_summary: changeSummary,
    created_at: date.toISOString(),
  };
}

describe('thinAutoVersions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not delete manual versions', async () => {
    const versions = [
      makeVersion('v1', 'Manual save', 48),
      makeVersion('v2', 'Updated section', 72),
      makeVersion('v3', null, 96),
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    expect(result.deleted).toBe(0);
  });

  it('keeps all auto-versions within 24 hours', async () => {
    const versions = [
      makeVersion('v1', '[auto] Checkpoint', 1),
      makeVersion('v2', '[auto] Checkpoint', 2),
      makeVersion('v3', '[auto] Checkpoint', 5),
      makeVersion('v4', '[auto] Checkpoint', 10),
      makeVersion('v5', '[auto] Checkpoint', 23),
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    expect(result.deleted).toBe(0);
  });

  it('thins to hourly for 1-7 days', async () => {
    // Create multiple auto-versions in the same hour bucket (36h ago)
    // Use a timestamp that's well within an hour boundary to avoid edge cases
    const hourMs = 60 * 60 * 1000;
    const baseTimestamp = Date.now() - 36 * hourMs;
    // Align to the start of the hour bucket, then add offsets within the same hour
    const bucketStart = Math.floor(baseTimestamp / hourMs) * hourMs;
    const versions: MockVersion[] = [
      {
        id: 'v1',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 50 * 60 * 1000).toISOString(), // latest in hour
      },
      {
        id: 'v2',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'v3',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 10 * 60 * 1000).toISOString(),
      },
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    // Should keep v1 (latest in hour), delete v2 and v3
    expect(result.deleted).toBe(2);
  });

  it('thins to daily for 7-30 days', async () => {
    // Create multiple auto-versions in the same day window (10 days ago)
    const baseDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const versions: MockVersion[] = [
      {
        id: 'v1',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString(), // latest in day
      },
      {
        id: 'v2',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'v3',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(baseDate.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    // Should keep v1 (latest in day), delete v2 and v3
    expect(result.deleted).toBe(2);
  });

  it('thins to weekly beyond 30 days', async () => {
    // Create multiple auto-versions in the same week (35 days ago)
    const baseDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const versions: MockVersion[] = [
      {
        id: 'v1',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // latest in week
      },
      {
        id: 'v2',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'v3',
        change_summary: '[auto] Checkpoint',
        created_at: baseDate.toISOString(),
      },
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    // Should keep v1 (latest in week), delete v2 and v3
    expect(result.deleted).toBe(2);
  });

  it('returns correct deleted count', async () => {
    // Mix of manual and auto-versions, some in thinning range
    const hourMs = 60 * 60 * 1000;
    const baseTimestamp = Date.now() - 36 * hourMs;
    const bucketStart = Math.floor(baseTimestamp / hourMs) * hourMs;
    const versions: MockVersion[] = [
      makeVersion('v-manual', 'Manual save', 48), // manual - keep
      makeVersion('v-auto-recent', '[auto] Checkpoint', 2), // recent auto - keep
      // Two auto versions in same hour bucket, 36h ago
      {
        id: 'v-auto-36h-a',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 40 * 60 * 1000).toISOString(),
      },
      {
        id: 'v-auto-36h-b',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 10 * 60 * 1000).toISOString(),
      },
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    // v-auto-36h-b should be deleted (older in same hour bucket)
    expect(result.deleted).toBe(1);
  });

  it('handles empty version list', async () => {
    const { db } = createMockDb([]);
    const result = await thinAutoVersions(db, 'tmpl-1');
    expect(result.deleted).toBe(0);
  });

  it('handles only manual versions (deletes nothing)', async () => {
    const versions = [
      makeVersion('v1', 'First draft', 48),
      makeVersion('v2', null, 72),
      makeVersion('v3', 'Major revision', 200),
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    expect(result.deleted).toBe(0);
  });

  it('preserves auto-versions that are the sole representative in their bucket', async () => {
    // Auto-versions in different hour buckets (1-7 days range)
    const versions = [
      makeVersion('v1', '[auto] Checkpoint', 25), // hour bucket A
      makeVersion('v2', '[auto] Checkpoint', 30), // hour bucket B
      makeVersion('v3', '[auto] Checkpoint', 40), // hour bucket C
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    // Each is in a different hour bucket, all should be kept
    expect(result.deleted).toBe(0);
  });

  it('batches deletions when there are versions to delete', async () => {
    const hourMs = 60 * 60 * 1000;
    const baseTimestamp = Date.now() - 36 * hourMs;
    // Align to same hour bucket
    const bucketStart = Math.floor(baseTimestamp / hourMs) * hourMs;
    const versions: MockVersion[] = [
      {
        id: 'v1',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 50 * 60 * 1000).toISOString(),
      },
      {
        id: 'v2',
        change_summary: '[auto] Checkpoint',
        created_at: new Date(bucketStart + 10 * 60 * 1000).toISOString(),
      },
    ];

    const { db } = createMockDb(versions);
    const result = await thinAutoVersions(db, 'tmpl-1');
    expect(result.deleted).toBe(1);
    // batch should have been called for the deletion
    expect(db.batch).toHaveBeenCalled();
  });
});
