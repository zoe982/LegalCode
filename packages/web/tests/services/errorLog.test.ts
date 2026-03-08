import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { errorLogService } = await import('../../src/services/errorLog.js');

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

describe('errorLogService', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('list', () => {
    it('GETs /admin/errors with no query params when no filters', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 200 }));

      const result = await errorLogService.list();

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/errors', {
        credentials: 'include',
      });
      expect(result).toEqual({ errors: [] });
    });

    it('appends source filter as query param', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 200 }));

      await errorLogService.list({ source: 'frontend' });

      const url = fetchSpy.mock.calls[0]?.[0] as string;
      expect(url).toContain('source=frontend');
    });

    it('appends status filter as query param', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 200 }));

      await errorLogService.list({ status: 'open' });

      const url = fetchSpy.mock.calls[0]?.[0] as string;
      expect(url).toContain('status=open');
    });

    it('appends severity filter as query param', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 200 }));

      await errorLogService.list({ severity: 'critical' });

      const url = fetchSpy.mock.calls[0]?.[0] as string;
      expect(url).toContain('severity=critical');
    });

    it('appends multiple filters', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ errors: [] }), { status: 200 }));

      await errorLogService.list({ source: 'backend', status: 'resolved' });

      const url = fetchSpy.mock.calls[0]?.[0] as string;
      expect(url).toContain('source=backend');
      expect(url).toContain('status=resolved');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(errorLogService.list()).rejects.toThrow('Failed to fetch error log');
    });
  });

  describe('resolve', () => {
    it('PATCHes /admin/errors/:id/resolve', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      await errorLogService.resolve('err-123');

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/errors/err-123/resolve', {
        method: 'PATCH',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );

      await expect(errorLogService.resolve('bad-id')).rejects.toThrow('Not found');
    });
  });
});
