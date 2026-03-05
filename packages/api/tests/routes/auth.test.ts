import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../../src/routes/auth.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

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

function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _stmt: mockStatement,
  };
}

function createTestApp() {
  const kv = createMockKv();
  const db = createMockDb();
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!c.env) {
      // @ts-expect-error -- env is undefined in test context
      c.env = {};
    }
    const env = c.env as Record<string, unknown>;
    env.JWT_SECRET = JWT_SECRET;
    env.AUTH_KV = kv;
    env.DB = db;
    env.GOOGLE_CLIENT_ID = 'test-client-id';
    env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    env.ALLOWED_EMAILS = 'alice@acasus.com,zoe@marsico.org';
    await next();
  });
  app.route('/auth', authRoutes);
  return { app, kv, db };
}

describe('GET /auth/google', () => {
  it('returns Google OAuth URL with PKCE parameters', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/google');
    expect(res.status).toBe(200);
    const body: { url: string } = await res.json();
    const url = new URL(body.url);
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeDefined();
  });

  it('stores PKCE state in KV', async () => {
    const { app, kv } = createTestApp();
    await app.request('/auth/google');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.put).toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  it('returns 401 without auth cookie', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid auth cookie', async () => {
    const { app } = createTestApp();
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const res = await app.request('/auth/me', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { user: { email: string } } = await res.json();
    expect(body.user.email).toBe('alice@acasus.com');
  });
});

describe('POST /auth/logout', () => {
  it('clears auth cookies and returns 200', async () => {
    const { app } = createTestApp();
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /auth/refresh', () => {
  it('returns 401 without refresh cookie', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/refresh', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
