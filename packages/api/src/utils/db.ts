import type { BatchItem } from 'drizzle-orm/batch';
import type { AppDb } from '../db/index.js';

export function batchOps(db: AppDb, ops: BatchItem<'sqlite'>[]): Promise<unknown[]> {
  if (ops.length === 0) {
    throw new Error('batchOps requires at least one operation');
  }
  // Single cast point: Drizzle requires non-empty tuple but we validate at runtime
  return db.batch(ops as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
}
