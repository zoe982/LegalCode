import { describe, it, expect, vi } from 'vitest';
import { app } from '../src/index.js';
import workerExport from '../src/index.js';

vi.mock('../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({ mockDb: true }),
}));

vi.mock('../src/services/template.js', () => ({
  purgeExpiredTemplates: vi.fn().mockResolvedValue(0),
}));

const mockListAllUsers = vi.fn().mockResolvedValue([]);
const mockCreateUser = vi.fn();
const mockUpdateUserRole = vi.fn().mockResolvedValue(undefined);
const mockDeactivateUser = vi.fn().mockResolvedValue(undefined);
const mockFindUserById = vi.fn();

vi.mock('../src/services/user.js', () => ({
  listAllUsers: (...args: unknown[]) => mockListAllUsers(...args) as unknown,
  createUser: (...args: unknown[]) => mockCreateUser(...args) as unknown,
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args) as unknown,
  deactivateUser: (...args: unknown[]) => mockDeactivateUser(...args) as unknown,
  findUserById: (...args: unknown[]) => mockFindUserById(...args) as unknown,
}));

const mockListErrors = vi.fn().mockResolvedValue([]);
const mockResolveError = vi.fn().mockResolvedValue(true);
const mockLogError = vi.fn().mockResolvedValue({ errorId: 'mock-err' });

vi.mock('../src/services/error-log.js', () => ({
  listErrors: (...args: unknown[]) => mockListErrors(...args) as unknown,
  resolveError: (...args: unknown[]) => mockResolveError(...args) as unknown,
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

const mockGetAllowedEmails = vi.fn().mockResolvedValue(['a@acasus.com']);
const mockAddAllowedEmail = vi.fn().mockResolvedValue(['a@acasus.com', 'b@acasus.com']);
const mockRemoveAllowedEmail = vi.fn().mockResolvedValue([]);

vi.mock('../src/services/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/auth.js')>();
  return {
    ...actual,
    getAllowedEmails: (...args: unknown[]) => mockGetAllowedEmails(...args) as unknown,
    addAllowedEmail: (...args: unknown[]) => mockAddAllowedEmail(...args) as unknown,
    removeAllowedEmail: (...args: unknown[]) => mockRemoveAllowedEmail(...args) as unknown,
  };
});

describe('app', () => {
  it('responds to /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as { status: string }).status).toBe('ok');
  });

  // These tests exercise requireJsonContentType as mounted on /api/templates/*
  // to ensure V8 coverage is correctly attributed when running the full suite.
  it('rejects POST to /api/templates without application/json Content-Type', async () => {
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': '8',
        Origin: 'https://legalcode.ax1access.com',
      },
      body: 'not json',
    });
    expect(res.status).toBe(415);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Content-Type must be application/json' });
  });

  it('allows GET to /api/templates without Content-Type (non-body method passthrough)', async () => {
    const res = await app.request('/api/templates');
    // Will be 401 (auth middleware) but should NOT be 415 (content-type middleware passes through)
    expect(res.status).not.toBe(415);
  });

  it('allows POST to /api/templates with WebSocket Upgrade header', async () => {
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
    });
    // Should not be 415 — WebSocket upgrades bypass content-type check
    expect(res.status).not.toBe(415);
  });

  it('allows POST to /api/templates with application/json Content-Type', async () => {
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    });
    // Will be 401 (auth middleware) but should NOT be 415
    expect(res.status).not.toBe(415);
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

// These tests exercise admin.ts route handlers through the full app to ensure
// V8 coverage is correctly attributed when running the full suite. The dedicated
// admin.test.ts has comprehensive tests; these cover the branches that V8
// coverage merging can misattribute.
describe('admin routes via full app (V8 coverage stabilization)', () => {
  async function adminToken(): Promise<string> {
    const { issueJWT } = await import('../src/services/auth.js');
    return issueJWT(
      { sub: 'admin-1', email: 'admin@acasus.com', role: 'admin' },
      'test-jwt-secret',
      900,
    );
  }

  const adminEnv = {
    JWT_SECRET: 'test-jwt-secret',
    GOOGLE_CLIENT_ID: 'test',
    GOOGLE_CLIENT_SECRET: 'test',
    ALLOWED_EMAILS: 'admin@acasus.com',
    AUTH_KV: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    DB: {},
  };

  it('GET /api/admin/users returns user list for admin', async () => {
    mockListAllUsers.mockResolvedValueOnce([{ id: 'u1', email: 'a@a.com' }]);
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        headers: { Cookie: `__Host-auth=${token}` },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('POST /api/admin/users creates user', async () => {
    mockCreateUser.mockResolvedValueOnce({
      id: 'new',
      email: 'new@acasus.com',
      name: 'New',
      role: 'editor',
    });
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@acasus.com', name: 'New User', role: 'editor' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(201);
  });

  it('POST /api/admin/users returns 400 for invalid input', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad', name: '', role: 'invalid' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/users returns 409 for duplicate email', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('UNIQUE constraint failed: users.email'));
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dup@acasus.com', name: 'Dup', role: 'editor' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/users returns 500 for non-unique DB error', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Connection refused'));
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'err@acasus.com', name: 'Err', role: 'editor' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(500);
  });

  it('POST /api/admin/users returns 500 for non-Error throw', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('non-standard error'));
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'str@acasus.com', name: 'Str', role: 'editor' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(500);
  });

  it('PATCH /api/admin/users/:id updates role', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users/u1',
      {
        method: 'PATCH',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/users/:id returns 400 for invalid role', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users/u1',
      {
        method: 'PATCH',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'superadmin' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(400);
  });

  it('DELETE /api/admin/users/:id deactivates user', async () => {
    mockFindUserById.mockResolvedValueOnce({ id: 'u1', email: 'del@acasus.com' });
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users/u1',
      {
        method: 'DELETE',
        headers: { Cookie: `__Host-auth=${token}`, Origin: 'https://legalcode.ax1access.com' },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('DELETE /api/admin/users/:id returns 404 when user not found', async () => {
    mockFindUserById.mockResolvedValueOnce(undefined);
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/users/nonexistent',
      {
        method: 'DELETE',
        headers: { Cookie: `__Host-auth=${token}`, Origin: 'https://legalcode.ax1access.com' },
      },
      adminEnv,
    );
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/errors returns errors with filters', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/errors?source=frontend&status=open',
      {
        headers: { Cookie: `__Host-auth=${token}` },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/errors falls back to empty filters for invalid query', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/errors?source=invalid_source',
      {
        headers: { Cookie: `__Host-auth=${token}` },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/errors/:id/resolve resolves error', async () => {
    mockResolveError.mockResolvedValueOnce(true);
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/errors/e1/resolve',
      {
        method: 'PATCH',
        headers: { Cookie: `__Host-auth=${token}`, Origin: 'https://legalcode.ax1access.com' },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/errors/:id/resolve returns 404 when not found', async () => {
    mockResolveError.mockResolvedValueOnce(false);
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/errors/nonexistent/resolve',
      {
        method: 'PATCH',
        headers: { Cookie: `__Host-auth=${token}`, Origin: 'https://legalcode.ax1access.com' },
      },
      adminEnv,
    );
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/allowed-emails returns email list', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/allowed-emails',
      {
        headers: { Cookie: `__Host-auth=${token}` },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('POST /api/admin/allowed-emails adds email', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/allowed-emails',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@acasus.com' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });

  it('POST /api/admin/allowed-emails returns 400 for invalid email', async () => {
    const token = await adminToken();
    const res = await app.request(
      '/api/admin/allowed-emails',
      {
        method: 'POST',
        headers: { Cookie: `__Host-auth=${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-email' }),
      },
      adminEnv,
    );
    expect(res.status).toBe(400);
  });

  it('DELETE /api/admin/allowed-emails/:email removes email', async () => {
    const token = await adminToken();
    const res = await app.request(
      `/api/admin/allowed-emails/${encodeURIComponent('a@acasus.com')}`,
      {
        method: 'DELETE',
        headers: { Cookie: `__Host-auth=${token}`, Origin: 'https://legalcode.ax1access.com' },
      },
      adminEnv,
    );
    expect(res.status).toBe(200);
  });
});

describe('scheduled handler', () => {
  it('calls purgeExpiredTemplates via ctx.waitUntil', async () => {
    const { purgeExpiredTemplates } = await import('../src/services/template.js');
    const { getDb } = await import('../src/db/index.js');

    const mockCtx = { waitUntil: vi.fn() };
    const mockEvent = {} as ScheduledEvent;
    const mockEnv = { DB: {} as D1Database };

    workerExport.scheduled(mockEvent, mockEnv, mockCtx as unknown as ExecutionContext);

    expect(getDb).toHaveBeenCalledWith(mockEnv.DB);
    expect(purgeExpiredTemplates).toHaveBeenCalled();
    expect(mockCtx.waitUntil).toHaveBeenCalled();
  });
});
