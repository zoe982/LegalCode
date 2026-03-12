import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { companyService } = await import('../../src/services/companies.js');

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

describe('companyService', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('list', () => {
    it('GETs /companies with credentials', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ companies: [] }), { status: 200 }));

      const result = await companyService.list();

      expect(fetchSpy).toHaveBeenCalledWith('/api/companies', {
        credentials: 'include',
      });
      expect(result).toEqual({ companies: [] });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(companyService.list()).rejects.toThrow('Failed to fetch companies');
    });
  });

  describe('create', () => {
    it('POSTs /companies with body', async () => {
      const mockCompany = {
        id: 'com-1',
        name: 'Acme Corp',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ company: mockCompany }), { status: 201 }),
      );

      const result = await companyService.create({ name: 'Acme Corp' });

      expect(fetchSpy).toHaveBeenCalledWith('/api/companies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp' }),
      });
      expect(result).toEqual({ company: mockCompany });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(companyService.create({ name: '' })).rejects.toThrow('Failed to create company');
    });
  });

  describe('update', () => {
    it('PUTs /companies/:id with body', async () => {
      const mockCompany = {
        id: 'com-1',
        name: 'Updated Corp',
        createdAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ company: mockCompany }), { status: 200 }),
      );

      const result = await companyService.update('com-1', { name: 'Updated Corp' });

      expect(fetchSpy).toHaveBeenCalledWith('/api/companies/com-1', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Corp' }),
      });
      expect(result).toEqual({ company: mockCompany });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(companyService.update('bad-id', { name: 'X' })).rejects.toThrow(
        'Failed to update company',
      );
    });
  });

  describe('remove', () => {
    it('DELETEs /companies/:id', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await companyService.remove('com-1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/companies/com-1', {
        method: 'DELETE',
        credentials: 'include',
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(companyService.remove('bad-id')).rejects.toThrow('Failed to delete company');
    });
  });
});
