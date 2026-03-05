import { describe, it, expect, vi } from 'vitest';
import { getDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('getDb', () => {
  it('returns a Drizzle instance with query property', () => {
    const mockD1 = createMockD1();
    const db = getDb(mockD1);
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
  });

  it('includes users table in query namespace', () => {
    const mockD1 = createMockD1();
    const db = getDb(mockD1);
    expect(db.query.users).toBeDefined();
  });

  it('returns consistent type for same D1 binding', () => {
    const mockD1 = createMockD1();
    const db1 = getDb(mockD1);
    const db2 = getDb(mockD1);
    expect(typeof db1.query).toBe(typeof db2.query);
  });
});
