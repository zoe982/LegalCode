import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../../src/middleware/security.js';
import type { AppEnv } from '../../src/types/env.js';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.use('*', securityHeaders);
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('securityHeaders', () => {
  it('sets Content-Security-Policy header', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'",
    );
  });

  it('sets X-Content-Type-Options header', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Referrer-Policy header', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('sets Permissions-Policy header', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('sets Cache-Control to no-store for API responses', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
