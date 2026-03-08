/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import {
  getComments,
  createComment,
  resolveComment,
  deleteComment,
} from '../../src/services/comment.js';
import { getDb, type AppDb } from '../../src/db/index.js';

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('comment service', () => {
  let db: AppDb;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = getDb(createMockD1());
  });

  // ── getComments ──

  describe('getComments', () => {
    it('returns comments for a template', async () => {
      const mockComments = [
        {
          id: 'c-1',
          templateId: 't-1',
          parentId: null,
          authorId: 'u-1',
          authorName: 'Alice',
          authorEmail: 'alice@example.com',
          content: 'Good',
          anchorText: null,
          anchorFrom: null,
          anchorTo: null,
          resolved: false,
          resolvedBy: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Mock the chained select().from().where().orderBy()
      const orderByMock = vi.fn().mockResolvedValue(mockComments);
      const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await getComments(db, 't-1');
      expect(result).toEqual(mockComments);
      expect(db.select).toHaveBeenCalled();
    });
  });

  // ── createComment ──

  describe('createComment', () => {
    it('validates input and inserts a comment', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: 'Hello' },
        {
          id: 'u-1',
          email: 'alice@example.com',
          name: 'Alice',
        },
      );

      expect(result.id).toBeDefined();
      expect(result.templateId).toBe('t-1');
      expect(result.content).toBe('Hello');
      expect(result.authorId).toBe('u-1');
      expect(result.authorName).toBe('Alice');
      expect(result.authorEmail).toBe('alice@example.com');
      expect(result.resolved).toBe(false);
      expect(result.resolvedBy).toBeNull();
      expect(result.parentId).toBeNull();
      expect(db.insert).toHaveBeenCalled();
    });

    it('creates a comment with optional anchor fields', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        {
          content: 'Inline note',
          parentId: 'c-0',
          anchorText: 'selected text',
          anchorFrom: '10',
          anchorTo: '20',
        },
        {
          id: 'u-1',
          email: 'alice@example.com',
          name: 'Alice',
        },
      );

      expect(result.parentId).toBe('c-0');
      expect(result.anchorText).toBe('selected text');
      expect(result.anchorFrom).toBe('10');
      expect(result.anchorTo).toBe('20');
    });

    it('uses email as name when name is not provided', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: 'test' },
        {
          id: 'u-1',
          email: 'alice@example.com',
        },
      );

      expect(result.authorName).toBe('alice@example.com');
    });

    it('rejects empty content', async () => {
      await expect(
        createComment(db, 't-1', { content: '' }, { id: 'u-1', email: 'a@b.com' }),
      ).rejects.toThrow(ZodError);
    });

    it('rejects content over 5000 chars', async () => {
      await expect(
        createComment(db, 't-1', { content: 'a'.repeat(5001) }, { id: 'u-1', email: 'a@b.com' }),
      ).rejects.toThrow(ZodError);
    });

    it('strips HTML tags from content to prevent XSS', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: '<script>alert("xss")</script>' },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.content).toBe('alert("xss")');
    });

    it('passes normal text through unchanged', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: 'This is a normal comment with no HTML' },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.content).toBe('This is a normal comment with no HTML');
    });

    it('strips nested and malformed HTML tags', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: '<div><b>bold</b> and <img src=x onerror=alert(1)>text</div>' },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.content).toBe('bold and text');
    });

    it('sanitizes anchorText to strip HTML tags', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        {
          content: 'comment',
          anchorText: '<em>highlighted</em> text',
          anchorFrom: '0',
          anchorTo: '10',
        },
        { id: 'u-1', email: 'a@b.com' },
      );

      expect(result.anchorText).toBe('highlighted text');
    });

    it('sets null for omitted optional fields', async () => {
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'insert').mockReturnValue({ values: valuesMock } as never);

      const result = await createComment(
        db,
        't-1',
        { content: 'test' },
        {
          id: 'u-1',
          email: 'a@b.com',
        },
      );

      expect(result.anchorText).toBeNull();
      expect(result.anchorFrom).toBeNull();
      expect(result.anchorTo).toBeNull();
    });
  });

  // ── resolveComment ──

  describe('resolveComment', () => {
    it('resolves a comment by its author', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const setWhereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
      vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

      const result = await resolveComment(db, 't-1', 'c-1', { id: 'u-1', role: 'editor' });
      expect(result).toEqual({ ok: true });
      expect(db.update).toHaveBeenCalled();
    });

    it('resolves a comment by an admin (not the author)', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const setWhereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
      vi.spyOn(db, 'update').mockReturnValue({ set: setMock } as never);

      const result = await resolveComment(db, 't-1', 'c-1', { id: 'u-admin', role: 'admin' });
      expect(result).toEqual({ ok: true });
    });

    it('returns forbidden when non-author/non-admin tries to resolve', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await resolveComment(db, 't-1', 'c-1', { id: 'u-other', role: 'editor' });
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('returns not_found for invalid comment ID', async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await resolveComment(db, 't-1', 'c-nonexistent', { id: 'u-1', role: 'admin' });
      expect(result).toEqual({ error: 'not_found' });
    });
  });

  // ── deleteComment ──

  describe('deleteComment', () => {
    it('deletes a comment by its author and cascade-deletes replies', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'delete').mockReturnValue({ where: deleteWhereMock } as never);

      const result = await deleteComment(db, 't-1', 'c-1', { id: 'u-1', role: 'editor' });
      expect(result).toEqual({ ok: true });
      expect(db.delete).toHaveBeenCalled();
    });

    it('deletes a comment by an admin', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(db, 'delete').mockReturnValue({ where: deleteWhereMock } as never);

      const result = await deleteComment(db, 't-1', 'c-1', { id: 'u-admin', role: 'admin' });
      expect(result).toEqual({ ok: true });
    });

    it('returns forbidden when non-author/non-admin tries to delete', async () => {
      const existing = [
        {
          id: 'c-1',
          templateId: 't-1',
          authorId: 'u-1',
          content: 'test',
        },
      ];

      const whereMock = vi.fn().mockResolvedValue(existing);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await deleteComment(db, 't-1', 'c-1', { id: 'u-other', role: 'viewer' });
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('returns not_found for invalid comment ID', async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn().mockReturnValue({ where: whereMock });
      vi.spyOn(db, 'select').mockReturnValue({ from: fromMock } as never);

      const result = await deleteComment(db, 't-1', 'c-nonexistent', { id: 'u-1', role: 'admin' });
      expect(result).toEqual({ error: 'not_found' });
    });
  });
});
