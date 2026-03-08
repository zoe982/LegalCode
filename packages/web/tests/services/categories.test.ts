import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { categoryService } = await import('../../src/services/categories.js');

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

describe('categoryService', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('list', () => {
    it('GETs /categories with credentials', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ categories: [] }), { status: 200 }));

      const result = await categoryService.list();

      expect(fetchSpy).toHaveBeenCalledWith('/categories', {
        credentials: 'include',
      });
      expect(result).toEqual({ categories: [] });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(categoryService.list()).rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('create', () => {
    it('POSTs /categories with body', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Contract',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ category: mockCategory }), { status: 201 }),
      );

      const result = await categoryService.create({ name: 'Contract' });

      expect(fetchSpy).toHaveBeenCalledWith('/categories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Contract' }),
      });
      expect(result).toEqual({ category: mockCategory });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(categoryService.create({ name: '' })).rejects.toThrow(
        'Failed to create category',
      );
    });
  });

  describe('update', () => {
    it('PUTs /categories/:id with body', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Updated Contract',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ category: mockCategory }), { status: 200 }),
      );

      const result = await categoryService.update('cat-1', { name: 'Updated Contract' });

      expect(fetchSpy).toHaveBeenCalledWith('/categories/cat-1', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Contract' }),
      });
      expect(result).toEqual({ category: mockCategory });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(categoryService.update('bad-id', { name: 'X' })).rejects.toThrow(
        'Failed to update category',
      );
    });
  });

  describe('remove', () => {
    it('DELETEs /categories/:id', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await categoryService.remove('cat-1');

      expect(fetchSpy).toHaveBeenCalledWith('/categories/cat-1', {
        method: 'DELETE',
        credentials: 'include',
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(categoryService.remove('bad-id')).rejects.toThrow('Failed to delete category');
    });
  });
});
