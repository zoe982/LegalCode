/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import {
  getSuggestions,
  createSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  deleteSuggestion,
} from '../../src/services/suggestion.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('suggestion service', () => {
  let db: AppDb;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = getDb(createMockD1());
  });

  // ── getSuggestions ──

  describe('getSuggestions', () => {
    it('returns pending suggestions for a template', async () => {
      const mockSuggestions = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          authorName: 'Alice',
          authorEmail: 'alice@example.com',
          type: 'insert' as const,
          anchorFrom: '0',
          anchorTo: '10',
          originalText: 'hello',
          replacementText: 'hello world',
          status: 'pending' as const,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Mock the chained select().from().where().orderBy()
      const orderByMock = vi.fn().mockResolvedValue(mockSuggestions);
      const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await getSuggestions(db, 't-1');
      expect(result).toEqual(mockSuggestions);
      expect(db.select).toHaveBeenCalled();
    });
  });

  // ── createSuggestion ──

  describe('createSuggestion', () => {
    it('validates input and inserts a suggestion', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createSuggestion(
        db,
        't-1',
        {
          type: 'insert',
          anchorFrom: '0',
          anchorTo: '10',
          originalText: 'hello',
          replacementText: 'hello world',
        },
        {
          id: 'u-1',
          email: 'alice@example.com',
          name: 'Alice',
        },
      );

      expect(result.id).toBeDefined();
      expect(result.templateId).toBe('t-1');
      expect(result.type).toBe('insert');
      expect(result.authorId).toBe('u-1');
      expect(result.authorName).toBe('Alice');
      expect(result.authorEmail).toBe('alice@example.com');
      expect(result.status).toBe('pending');
      expect(result.resolvedBy).toBeNull();
      expect(result.resolvedAt).toBeNull();
      expect(db.insert).toHaveBeenCalled();
    });

    it('uses email as name when name is not provided', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createSuggestion(
        db,
        't-1',
        {
          type: 'delete',
          anchorFrom: '5',
          anchorTo: '15',
          originalText: 'remove this',
        },
        {
          id: 'u-1',
          email: 'alice@example.com',
        },
      );

      expect(result.authorName).toBe('alice@example.com');
    });

    it('rejects invalid input (ZodError)', async () => {
      await expect(
        createSuggestion(
          db,
          't-1',
          { type: 'invalid', anchorFrom: '0', anchorTo: '10', originalText: 'x' },
          { id: 'u-1', email: 'a@b.com' },
        ),
      ).rejects.toThrow(ZodError);
    });

    it('rejects missing anchorFrom', async () => {
      await expect(
        createSuggestion(
          db,
          't-1',
          { type: 'insert', anchorTo: '10', originalText: 'x' },
          { id: 'u-1', email: 'a@b.com' },
        ),
      ).rejects.toThrow(ZodError);
    });

    it('strips HTML from originalText', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createSuggestion(
        db,
        't-1',
        {
          type: 'insert',
          anchorFrom: '0',
          anchorTo: '10',
          originalText: '<b>bold</b> text',
          replacementText: '<em>new</em> text',
        },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.originalText).toBe('bold text');
      expect(result.replacementText).toBe('new text');
    });

    it('handles null replacementText for delete type', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createSuggestion(
        db,
        't-1',
        {
          type: 'delete',
          anchorFrom: '0',
          anchorTo: '10',
          originalText: 'delete me',
        },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.replacementText).toBeNull();
    });
  });

  // ── acceptSuggestion ──

  describe('acceptSuggestion', () => {
    it('accepts a pending suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'pending',
          anchorFrom: '10',
          anchorTo: '20',
        },
      ];

      let selectCallCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get the target suggestion
          const whereMock = vi.fn().mockResolvedValue(existing);
          const fromMock = vi.fn().mockReturnValue({ where: whereMock });
          return { from: fromMock } as never;
        }
        // Second call: get all pending suggestions for overlap check
        const whereMock = vi.fn().mockResolvedValue([]);
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        return { from: fromMock } as never;
      });

      const setWhereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
      vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

      const result = await acceptSuggestion(db, 't-1', 's-1', {
        id: 'u-admin',
        email: 'admin@test.com',
        role: 'admin',
      });
      expect(result).toEqual({ ok: true });
      expect(db.update).toHaveBeenCalled();
    });

    it('returns not_found for invalid suggestion ID', async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await acceptSuggestion(db, 't-1', 's-nonexistent', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns invalid_state for already-accepted suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'accepted',
          anchorFrom: '10',
          anchorTo: '20',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await acceptSuggestion(db, 't-1', 's-1', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'invalid_state' });
    });

    it('returns invalid_state for already-rejected suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'rejected',
          anchorFrom: '10',
          anchorTo: '20',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await acceptSuggestion(db, 't-1', 's-1', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'invalid_state' });
    });

    it('auto-rejects overlapping pending suggestions', async () => {
      const target = {
        id: 's-1',
        templateId: 't-1',
        authorId: 'u-1',
        status: 'pending',
        anchorFrom: '10',
        anchorTo: '20',
      };

      const overlapping = {
        id: 's-2',
        templateId: 't-1',
        authorId: 'u-2',
        status: 'pending',
        anchorFrom: '15',
        anchorTo: '25',
      };

      const nonOverlapping = {
        id: 's-3',
        templateId: 't-1',
        authorId: 'u-3',
        status: 'pending',
        anchorFrom: '30',
        anchorTo: '40',
      };

      let selectCallCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          const whereMock = vi.fn().mockResolvedValue([target]);
          const fromMock = vi.fn().mockReturnValue({ where: whereMock });
          return { from: fromMock } as never;
        }
        // All pending suggestions for this template (excluding target)
        const whereMock = vi.fn().mockResolvedValue([overlapping, nonOverlapping]);
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        return { from: fromMock } as never;
      });

      const setWhereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
      vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

      const result = await acceptSuggestion(db, 't-1', 's-1', {
        id: 'u-admin',
        email: 'admin@test.com',
        role: 'admin',
      });
      expect(result).toEqual({ ok: true });

      // update called once for the accept itself, once for the overlapping suggestion
      expect(db.update).toHaveBeenCalledTimes(2);
    });
  });

  // ── rejectSuggestion ──

  describe('rejectSuggestion', () => {
    it('rejects a pending suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'pending',
          anchorFrom: '0',
          anchorTo: '10',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const setWhereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
      vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

      const result = await rejectSuggestion(db, 't-1', 's-1', {
        id: 'u-admin',
        email: 'admin@test.com',
        role: 'admin',
      });
      expect(result).toEqual({ ok: true });
      expect(db.update).toHaveBeenCalled();
    });

    it('returns not_found for invalid suggestion ID', async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await rejectSuggestion(db, 't-1', 's-nonexistent', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns invalid_state for non-pending suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'accepted',
          anchorFrom: '0',
          anchorTo: '10',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await rejectSuggestion(db, 't-1', 's-1', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'invalid_state' });
    });

    it('returns invalid_state for already-rejected suggestion', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'rejected',
          anchorFrom: '0',
          anchorTo: '10',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await rejectSuggestion(db, 't-1', 's-1', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'invalid_state' });
    });
  });

  // ── deleteSuggestion ──

  describe('deleteSuggestion', () => {
    it('deletes a suggestion by its author', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'pending',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'delete').mockReturnValue({ where: deleteWhereMock } as never);

      const result = await deleteSuggestion(db, 't-1', 's-1', {
        id: 'u-1',
        email: 'alice@test.com',
        role: 'editor',
      });
      expect(result).toEqual({ ok: true });
      expect(db.delete).toHaveBeenCalled();
    });

    it('deletes a suggestion by an admin', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'pending',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'delete').mockReturnValue({ where: deleteWhereMock } as never);

      const result = await deleteSuggestion(db, 't-1', 's-1', {
        id: 'u-admin',
        email: 'admin@test.com',
        role: 'admin',
      });
      expect(result).toEqual({ ok: true });
    });

    it('returns forbidden for non-author/non-admin', async () => {
      const existing = [
        {
          id: 's-1',
          templateId: 't-1',
          authorId: 'u-1',
          status: 'pending',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await deleteSuggestion(db, 't-1', 's-1', {
        id: 'u-other',
        email: 'other@test.com',
        role: 'viewer',
      });
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('returns not_found for invalid suggestion ID', async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await deleteSuggestion(db, 't-1', 's-nonexistent', {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(result).toEqual({ error: 'not_found' });
    });
  });
});
