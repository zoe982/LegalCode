import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '../../src/db/schema.js';
import type { AppDb } from '../../src/db/index.js';

const MIGRATION_DIR = resolve(import.meta.dirname, '../../../../drizzle');
const MIGRATION_FILES = [
  '0000_past_dreadnoughts.sql',
  '0001_add_error_log.sql',
  '0001_dizzy_jean_grey.sql',
  '0002_delete_templates.sql',
  '0003_add_display_id.sql',
  '0004_add_company.sql',
];

/**
 * Creates an in-memory SQLite database with the full schema applied and test users seeded.
 * Returns a Drizzle instance cast to AppDb for use with service functions.
 */
export function createTestDb(): { db: AppDb; sqlite: Database.Database } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Apply migrations — split on Drizzle's statement-breakpoint delimiter
  for (const file of MIGRATION_FILES) {
    let migration: string;
    try {
      migration = readFileSync(resolve(MIGRATION_DIR, file), 'utf-8');
    } catch {
      // Skip missing migration files (e.g., if not all exist)
      continue;
    }
    const statements = migration
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        sqlite.exec(stmt);
      } catch {
        // Some ALTERs may fail on fresh schema (e.g., DROP COLUMN on non-existent column)
        // This is expected when applying incremental migrations on a fresh DB
      }
    }
  }

  // Create tables not in migrations (added via drizzle push)
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY NOT NULL,
      template_id TEXT NOT NULL REFERENCES templates(id),
      parent_id TEXT,
      author_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      content TEXT NOT NULL,
      anchor_text TEXT,
      anchor_from TEXT,
      anchor_to TEXT,
      resolved INTEGER DEFAULT 0 NOT NULL,
      resolved_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  } catch {
    // Table may already exist
  }
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`);
  } catch {
    // Table may already exist
  }
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS countries (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`);
  } catch {
    // Table may already exist
  }
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    )`);
  } catch {
    // Table may already exist
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
  // Disable FK checks during cleanup to avoid ordering issues
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DELETE FROM audit_log');
  sqlite.exec('DELETE FROM audit_logs');
  sqlite.exec('DELETE FROM comments');
  sqlite.exec('DELETE FROM template_tags');
  sqlite.exec('DELETE FROM template_versions');
  sqlite.exec('DELETE FROM templates');
  sqlite.exec('DELETE FROM tags');
  sqlite.exec('DELETE FROM users');
  sqlite.pragma('foreign_keys = ON');

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
