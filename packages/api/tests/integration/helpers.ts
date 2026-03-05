import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '../../src/db/schema.js';
import type { AppDb } from '../../src/db/index.js';

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  '../../../../drizzle/0000_past_dreadnoughts.sql',
);

/**
 * Creates an in-memory SQLite database with the full schema applied and test users seeded.
 * Returns a Drizzle instance cast to AppDb for use with service functions.
 */
export function createTestDb(): { db: AppDb; sqlite: Database.Database } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Apply migration — split on Drizzle's statement-breakpoint delimiter
  const migration = readFileSync(MIGRATION_PATH, 'utf-8');
  const statements = migration
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    sqlite.exec(stmt);
  }

  const db = drizzle(sqlite, { schema });

  // Polyfill batch for better-sqlite3 (D1 driver has db.batch but better-sqlite3 does not)
  (db as unknown as Record<string, unknown>).batch = async (
    queries: Promise<unknown>[],
  ): Promise<unknown[]> => {
    const results: unknown[] = [];
    for (const query of queries) {
      results.push(await query);
    }
    return results;
  };

  // Seed test users
  sqlite.exec(
    `INSERT INTO users (id, email, name, role, created_at, updated_at)
     VALUES ('test-user-1', 'test@example.com', 'Test User', 'editor', datetime('now'), datetime('now'))`,
  );
  sqlite.exec(
    `INSERT INTO users (id, email, name, role, created_at, updated_at)
     VALUES ('test-admin-1', 'admin@example.com', 'Test Admin', 'admin', datetime('now'), datetime('now'))`,
  );

  return { db: db as unknown as AppDb, sqlite };
}

/**
 * Clears all data from the database tables (preserves schema).
 * Deletes in order to respect foreign key constraints.
 */
export function clearAllData(sqlite: Database.Database): void {
  sqlite.exec('DELETE FROM audit_log');
  sqlite.exec('DELETE FROM template_tags');
  sqlite.exec('DELETE FROM template_versions');
  sqlite.exec('DELETE FROM templates');
  sqlite.exec('DELETE FROM tags');
  sqlite.exec('DELETE FROM users');

  // Re-seed test users
  sqlite.exec(
    `INSERT INTO users (id, email, name, role, created_at, updated_at)
     VALUES ('test-user-1', 'test@example.com', 'Test User', 'editor', datetime('now'), datetime('now'))`,
  );
  sqlite.exec(
    `INSERT INTO users (id, email, name, role, created_at, updated_at)
     VALUES ('test-admin-1', 'admin@example.com', 'Test Admin', 'admin', datetime('now'), datetime('now'))`,
  );
}
