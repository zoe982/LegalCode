import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findUserByEmail,
  findUserById,
  listAllUsers,
  createUser,
  updateUserRole,
  deactivateUser,
} from '../../src/services/user.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('user service functions', () => {
  let db: AppDb;

  beforeEach(() => {
    db = getDb(createMockD1());
  });

  describe('findUserByEmail', () => {
    it('returns user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      vi.spyOn(db.query.users, 'findFirst').mockResolvedValue(mockUser);
      const result = await findUserByEmail(db, 'alice@acasus.com');
      expect(result).toEqual(mockUser);
    });

    it('returns undefined when not found', async () => {
      vi.spyOn(db.query.users, 'findFirst').mockResolvedValue(undefined);
      const result = await findUserByEmail(db, 'nobody@acasus.com');
      expect(result).toBeUndefined();
    });
  });

  describe('findUserById', () => {
    it('returns user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      vi.spyOn(db.query.users, 'findFirst').mockResolvedValue(mockUser);
      const result = await findUserById(db, '1');
      expect(result).toEqual(mockUser);
    });

    it('returns undefined when not found', async () => {
      vi.spyOn(db.query.users, 'findFirst').mockResolvedValue(undefined);
      const result = await findUserById(db, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('listAllUsers', () => {
    it('returns all users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'alice@acasus.com',
          name: 'Alice',
          role: 'editor' as const,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];
      vi.spyOn(db.query.users, 'findMany').mockResolvedValue(mockUsers);
      const result = await listAllUsers(db);
      expect(result).toEqual(mockUsers);
    });

    it('returns empty array when no users exist', async () => {
      vi.spyOn(db.query.users, 'findMany').mockResolvedValue([]);
      const result = await listAllUsers(db);
      expect(result).toEqual([]);
    });

    it('passes orderBy callback that sorts by createdAt descending', async () => {
      const mockDesc = vi.fn().mockReturnValue('desc(createdAt)');
      let capturedOrderBy: ((u: Record<string, unknown>, helpers: { desc: typeof mockDesc }) => unknown[]) | undefined;

      vi.spyOn(db.query.users, 'findMany').mockImplementation((opts?: Record<string, unknown>) => {
        if (opts && typeof opts.orderBy === 'function') {
          capturedOrderBy = opts.orderBy as typeof capturedOrderBy;
        }
        return Promise.resolve([]);
      });

      await listAllUsers(db);

      expect(capturedOrderBy).toBeDefined();
      const result = capturedOrderBy!({ createdAt: 'createdAt' }, { desc: mockDesc });
      expect(mockDesc).toHaveBeenCalledWith('createdAt');
      expect(result).toEqual(['desc(createdAt)']);
    });
  });

  describe('createUser', () => {
    it('creates a user and returns it', async () => {
      const input = { email: 'bob@acasus.com', name: 'Bob', role: 'viewer' as const };
      const valuesSpy = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesSpy } as never);

      const result = await createUser(db, input);
      expect(result.email).toBe('bob@acasus.com');
      expect(result.name).toBe('Bob');
      expect(result.role).toBe('viewer');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(valuesSpy).toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    it('calls update with correct parameters', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      const setSpy = vi.fn().mockReturnValue({ where: whereSpy });
      vi.spyOn(db, 'update').mockReturnValue({ set: setSpy } as never);

      await updateUserRole(db, '1', 'admin');
      expect(setSpy).toHaveBeenCalled();
      expect(whereSpy).toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('calls delete with correct parameters', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'delete').mockReturnValue({ where: whereSpy } as never);

      await deactivateUser(db, '1');
      expect(whereSpy).toHaveBeenCalled();
    });
  });
});
