import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../../src/routes/auth.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';
import { loginResponseSchema } from '@legalcode/shared';

vi.mock('../../src/services/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    fetchGoogleUserInfo: vi.fn(),
  };
});

vi.mock('../../src/services/user.js', () => ({
  findUserByEmail: vi.fn(),
}));

import { exchangeCodeForTokens, fetchGoogleUserInfo } from '../../src/services/auth.js';
import { findUserByEmail } from '../../src/services/user.js';

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

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe('GET /auth/callback', () => {
  it('returns 400 when error query param is present', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/callback?error=access_denied');
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Authentication was unsuccessful.');
  });

  it('returns 400 when code or state is missing', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/callback?code=abc');
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Authentication was unsuccessful.');
  });

  it('returns 400 when PKCE state is not found in KV', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/callback?code=abc&state=unknown-state');
    expect(res.status).toBe(400);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Invalid or expired state' });
  });

  it('returns 403 when email is not in allowed list', async () => {
    const { app, kv } = createTestApp();
    // Pre-store PKCE state
    await kv.put('pkce:valid-state', JSON.stringify({ codeVerifier: 'test-verifier' }));

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: 'mock-access',
      id_token: 'mock-id',
      token_type: 'Bearer',
    });
    vi.mocked(fetchGoogleUserInfo).mockResolvedValue({
      email: 'evil@hacker.com',
      name: 'Hacker',
      picture: 'http://example.com/pic.jpg',
    });

    const res = await app.request('/auth/callback?code=auth-code&state=valid-state');
    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Email not authorized' });
  });

  it('returns 403 when user is not provisioned in DB', async () => {
    const { app, kv } = createTestApp();
    await kv.put('pkce:valid-state', JSON.stringify({ codeVerifier: 'test-verifier' }));

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: 'mock-access',
      id_token: 'mock-id',
      token_type: 'Bearer',
    });
    vi.mocked(fetchGoogleUserInfo).mockResolvedValue({
      email: 'alice@acasus.com',
      name: 'Alice',
      picture: 'http://example.com/pic.jpg',
    });
    vi.mocked(findUserByEmail).mockResolvedValue(undefined);

    const res = await app.request('/auth/callback?code=auth-code&state=valid-state');
    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'User not provisioned. Contact an admin.' });
  });

  it('sets cookies and redirects on successful callback', async () => {
    const { app, kv } = createTestApp();
    await kv.put('pkce:valid-state', JSON.stringify({ codeVerifier: 'test-verifier' }));

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: 'mock-access',
      id_token: 'mock-id',
      token_type: 'Bearer',
    });
    vi.mocked(fetchGoogleUserInfo).mockResolvedValue({
      email: 'alice@acasus.com',
      name: 'Alice',
      picture: 'http://example.com/pic.jpg',
    });
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    const res = await app.request('/auth/callback?code=auth-code&state=valid-state');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Signing in');
    expect(text).toContain('meta http-equiv="refresh"');

    // Check cookies are set
    const cookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
    const authCookie = cookies.find((c: string) => c.includes('__Host-auth='));
    const refreshCookie = cookies.find((c: string) => c.includes('__Host-refresh='));
    expect(authCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
  });

  it('deletes PKCE state from KV after use', async () => {
    const { app, kv } = createTestApp();
    await kv.put('pkce:valid-state', JSON.stringify({ codeVerifier: 'test-verifier' }));

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: 'mock-access',
      id_token: 'mock-id',
      token_type: 'Bearer',
    });
    vi.mocked(fetchGoogleUserInfo).mockResolvedValue({
      email: 'alice@acasus.com',
      name: 'Alice',
      picture: 'http://example.com/pic.jpg',
    });
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    await app.request('/auth/callback?code=auth-code&state=valid-state');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.delete).toHaveBeenCalledWith('pkce:valid-state');
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
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const res = await app.request('/auth/me', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: {
      user: { id: string; email: string; name: string; role: string; createdAt: string };
    } = await res.json();
    expect(body.user).toEqual({
      id: 'user-1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
    });
  });

  it('returns response matching loginResponseSchema shape', async () => {
    const { app } = createTestApp();
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const res = await app.request('/auth/me', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    const body: unknown = await res.json();
    const parsed = loginResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 404 when authenticated user is not in DB', async () => {
    const { app } = createTestApp();
    vi.mocked(findUserByEmail).mockResolvedValue(undefined);
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    const res = await app.request('/auth/me', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
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

  it('returns 401 when refresh token is not in KV', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: '__Host-refresh=invalid-token' },
    });
    expect(res.status).toBe(401);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Invalid or expired refresh token' });
  });

  it('rotates tokens on valid refresh', async () => {
    const { app, kv } = createTestApp();
    // Pre-store refresh token
    await kv.put(
      'refresh:valid-refresh-token',
      JSON.stringify({ userId: 'user-1', email: 'alice@acasus.com', role: 'editor' }),
    );

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: '__Host-refresh=valid-refresh-token' },
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });

    // Old refresh token should be deleted
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.delete).toHaveBeenCalledWith('refresh:valid-refresh-token');

    // New cookies should be set
    const cookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
    const authCookie = cookies.find((c: string) => c.includes('__Host-auth='));
    const refreshCookie = cookies.find((c: string) => c.includes('__Host-refresh='));
    expect(authCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
  });
});

describe('POST /auth/logout', () => {
  it('deletes refresh token from KV when present', async () => {
    const { app, kv } = createTestApp();
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );
    // Pre-store a refresh token
    await kv.put(
      'refresh:my-refresh-token',
      JSON.stringify({ userId: 'user-1', email: 'alice@acasus.com', role: 'editor' }),
    );

    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}; __Host-refresh=my-refresh-token` },
    });

    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.delete).toHaveBeenCalledWith('refresh:my-refresh-token');
  });
});
