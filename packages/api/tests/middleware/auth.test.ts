import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../src/middleware/auth.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!c.env) {
      // @ts-expect-error -- env is undefined in test context
      c.env = {};
    }
    (c.env as Record<string, unknown>).JWT_SECRET = JWT_SECRET;
    await next();
  });
  return app;
}

describe('authMiddleware', () => {
  it('returns 401 when no cookie present', async () => {
    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => c.json({ ok: true }));
    const res = await app.request('/protected/data');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid JWT', async () => {
    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => c.json({ ok: true }));
    const res = await app.request('/protected/data', {
      headers: { Cookie: '__Host-auth=invalid.jwt.token' },
    });
    expect(res.status).toBe(401);
  });

  it('sets user on context for valid JWT', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => {
      const user = c.get('user');
      return c.json({ id: user.id, email: user.email, role: user.role });
    });
    const res = await app.request('/protected/data', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { id: string; email: string; role: string } = await res.json();
    expect(body.id).toBe('user-1');
    expect(body.email).toBe('alice@acasus.com');
    expect(body.role).toBe('editor');
  });
});

describe('requireRole', () => {
  it('allows access when user has required role', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'admin@acasus.com', role: 'admin' },
      JWT_SECRET,
      900,
    );
    const app = createTestApp();
    app.use('/admin/*', authMiddleware);
    app.use('/admin/*', requireRole('admin'));
    app.get('/admin/users', (c) => c.json({ ok: true }));
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('returns 403 when user lacks required role', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'viewer@acasus.com', role: 'viewer' },
      JWT_SECRET,
      900,
    );
    const app = createTestApp();
    app.use('/admin/*', authMiddleware);
    app.use('/admin/*', requireRole('admin'));
    app.get('/admin/users', (c) => c.json({ ok: true }));
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });
});
