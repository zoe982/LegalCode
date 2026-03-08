import { describe, it, expect, vi } from 'vitest';
import app from '../src/index.js';

describe('app', () => {
  it('responds to /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as { status: string }).status).toBe('ok');
  });

  it('mounts auth routes at /api/auth', async () => {
    const res = await app.request('/api/auth/google', undefined, {
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@test.com',
      AUTH_KV: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(),
        }),
      },
    });
    // Should return Google OAuth URL
    expect(res.status).toBe(200);
  });

  it('mounts admin routes at /api/admin', async () => {
    const res = await app.request('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('serves static assets via ASSETS.fetch for non-API routes', async () => {
    const mockAssetResponse = new Response('asset content', { status: 200 });
    const res = await app.request('/some-asset.js', undefined, {
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@test.com',
      AUTH_KV: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(),
        }),
      },
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(mockAssetResponse),
      },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('asset content');
  });

  it('falls back to index.html when ASSETS.fetch returns 404', async () => {
    const indexResponse = new Response('<html>SPA</html>', { status: 200 });
    const assetsFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      .mockResolvedValueOnce(indexResponse);
    const res = await app.request('/unknown-route', undefined, {
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@test.com',
      AUTH_KV: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(),
        }),
      },
      ASSETS: {
        fetch: assetsFetch,
      },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('<html>SPA</html>');
    expect(assetsFetch).toHaveBeenCalledTimes(2);
    // Second call should be for /index.html
    const secondCallArg = assetsFetch.mock.calls[1]?.[0] as Request;
    expect(new URL(secondCallArg.url).pathname).toBe('/index.html');
  });
});
