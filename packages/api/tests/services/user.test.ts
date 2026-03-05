import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../src/services/user.js';

function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };
  const mockDb = {
    prepare: vi.fn().mockReturnValue(mockStatement),
  };
  return { db: mockDb as unknown as D1Database, stmt: mockStatement };
}

describe('UserService', () => {
  let db: D1Database;
  let stmt: ReturnType<typeof createMockDb>['stmt'];
  let service: UserService;

  beforeEach(() => {
    const mock = createMockDb();
    db = mock.db;
    stmt = mock.stmt;
    service = new UserService(db);
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      stmt.first.mockResolvedValue(user);
      const result = await service.findByEmail('alice@acasus.com');
      expect(result).toEqual(user);
      expect(stmt.bind).toHaveBeenCalledWith('alice@acasus.com');
    });

    it('returns null when not found', async () => {
      stmt.first.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@acasus.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      stmt.first.mockResolvedValue(user);
      const result = await service.findById('1');
      expect(result).toEqual(user);
      expect(stmt.bind).toHaveBeenCalledWith('1');
    });
  });

  describe('listAll', () => {
    it('returns all users', async () => {
      const users = [
        {
          id: '1',
          email: 'alice@acasus.com',
          name: 'Alice',
          role: 'editor',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];
      stmt.all.mockResolvedValue({ results: users });
      const result = await service.listAll();
      expect(result).toEqual(users);
    });
  });

  describe('create', () => {
    it('creates a user and returns it', async () => {
      stmt.run.mockResolvedValue({ success: true });
      const result = await service.create({ email: 'bob@acasus.com', name: 'Bob', role: 'viewer' });
      expect(result.email).toBe('bob@acasus.com');
      expect(result.name).toBe('Bob');
      expect(result.role).toBe('viewer');
      expect(result.id).toBeDefined();
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      stmt.run.mockResolvedValue({ success: true });
      await service.updateRole('1', 'admin');
      expect(stmt.bind).toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('deletes user by id', async () => {
      stmt.run.mockResolvedValue({ success: true });
      await service.deactivate('1');
      expect(stmt.bind).toHaveBeenCalledWith('1');
    });
  });
});
