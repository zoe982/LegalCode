import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from '../../src/middleware/rate-limit.js';
import type { AppEnv } from '../../src/types/env.js';

function createMockKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
}

function createTestApp(
  kv: KVNamespace,
  config = { maxRequests: 3, windowSeconds: 60, prefix: 'test' },
) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!c.env) {
      // @ts-expect-error -- env is undefined in test context
      c.env = {};
    }
    (c.env as Record<string, unknown>).AUTH_KV = kv;
    await next();
  });

  app.use('*', rateLimit(config));
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('rateLimit', () => {
  it('allows requests within the limit', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);

    const res1 = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    expect(res1.status).toBe(200);

    const res2 = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    expect(res2.status).toBe(200);

    const res3 = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    expect(res3.status).toBe(200);
  });

  it('returns 429 when requests exceed limit', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);
    const ip = '1.2.3.4';

    // Make 3 requests (at limit)
    for (let i = 0; i < 3; i++) {
      await app.request('/test', {
        headers: { 'CF-Connecting-IP': ip },
      });
    }

    // 4th request should be blocked
    const res = await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });
    expect(res.status).toBe(429);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Too many requests' });
  });

  it('sets Retry-After header on 429 response', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);
    const ip = '10.0.0.1';

    for (let i = 0; i < 3; i++) {
      await app.request('/test', {
        headers: { 'CF-Connecting-IP': ip },
      });
    }

    const res = await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('tracks different IPs separately', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);

    // Fill up limit for IP A
    for (let i = 0; i < 3; i++) {
      await app.request('/test', {
        headers: { 'CF-Connecting-IP': '1.1.1.1' },
      });
    }

    // IP A should be blocked
    const resA = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '1.1.1.1' },
    });
    expect(resA.status).toBe(429);

    // IP B should still be allowed
    const resB = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '2.2.2.2' },
    });
    expect(resB.status).toBe(200);
  });

  it('allows requests after window expires', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv, { maxRequests: 2, windowSeconds: 10, prefix: 'expire' });
    const ip = '3.3.3.3';

    // Use a fixed "now" for the first two requests
    const baseTime = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(baseTime * 1000);

    await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });
    await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });

    // Should be blocked now
    const blocked = await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });
    expect(blocked.status).toBe(429);

    // Advance time past the window (11 seconds later)
    vi.spyOn(Date, 'now').mockReturnValue((baseTime + 11) * 1000);

    const allowed = await app.request('/test', {
      headers: { 'CF-Connecting-IP': ip },
    });
    expect(allowed.status).toBe(200);

    vi.restoreAllMocks();
  });

  it('uses X-Forwarded-For as fallback IP', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);

    const res = await app.request('/test', {
      headers: { 'X-Forwarded-For': '5.5.5.5, 6.6.6.6' },
    });
    expect(res.status).toBe(200);

    // Verify the KV key used the first IP from X-Forwarded-For
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.put).toHaveBeenCalledWith(
      'ratelimit:test:5.5.5.5',
      expect.any(String),
      expect.objectContaining({ expirationTtl: 60 }),
    );
  });

  it('uses "unknown" when no IP headers present', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);

    await app.request('/test');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.put).toHaveBeenCalledWith(
      'ratelimit:test:unknown',
      expect.any(String),
      expect.objectContaining({ expirationTtl: 60 }),
    );
  });

  it('handles corrupted KV data gracefully', async () => {
    const kv = createMockKv();
    const app = createTestApp(kv);

    // Pre-store corrupted data
    await kv.put('ratelimit:test:7.7.7.7', 'not-valid-json');

    const res = await app.request('/test', {
      headers: { 'CF-Connecting-IP': '7.7.7.7' },
    });
    // Should still pass through — corrupted data resets to empty
    expect(res.status).toBe(200);
  });
});
