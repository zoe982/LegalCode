import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { countryService } = await import('../../src/services/countries.js');

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

describe('countryService', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('list', () => {
    it('GETs /countries with credentials', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ countries: [] }), { status: 200 }));

      const result = await countryService.list();

      expect(fetchSpy).toHaveBeenCalledWith('/api/countries', {
        credentials: 'include',
      });
      expect(result).toEqual({ countries: [] });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(countryService.list()).rejects.toThrow('Failed to fetch countries');
    });
  });

  describe('create', () => {
    it('POSTs /countries with body', async () => {
      const mockCountry = {
        id: 'ctry-1',
        name: 'United States',
        code: 'US',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ country: mockCountry }), { status: 201 }),
      );

      const result = await countryService.create({ name: 'United States', code: 'US' });

      expect(fetchSpy).toHaveBeenCalledWith('/api/countries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'United States', code: 'US' }),
      });
      expect(result).toEqual({ country: mockCountry });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(countryService.create({ name: '', code: '' })).rejects.toThrow(
        'Failed to create country',
      );
    });
  });

  describe('update', () => {
    it('PUTs /countries/:id with body', async () => {
      const mockCountry = {
        id: 'ctry-1',
        name: 'United Kingdom',
        code: 'UK',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ country: mockCountry }), { status: 200 }),
      );

      const result = await countryService.update('ctry-1', { name: 'United Kingdom', code: 'UK' });

      expect(fetchSpy).toHaveBeenCalledWith('/api/countries/ctry-1', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'United Kingdom', code: 'UK' }),
      });
      expect(result).toEqual({ country: mockCountry });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(countryService.update('bad-id', { name: 'X', code: 'XX' })).rejects.toThrow(
        'Failed to update country',
      );
    });
  });

  describe('remove', () => {
    it('DELETEs /countries/:id', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await countryService.remove('ctry-1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/countries/ctry-1', {
        method: 'DELETE',
        credentials: 'include',
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(countryService.remove('bad-id')).rejects.toThrow('Failed to delete country');
    });
  });
});
