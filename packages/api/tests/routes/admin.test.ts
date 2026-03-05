import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

const mockListAllUsers = vi.fn().mockResolvedValue([]);
const mockCreateUser = vi.fn();
const mockUpdateUserRole = vi.fn().mockResolvedValue(undefined);
const mockDeactivateUser = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/services/user.js', () => ({
  listAllUsers: (...args: unknown[]) => mockListAllUsers(...args) as unknown,
  createUser: (...args: unknown[]) => mockCreateUser(...args) as unknown,
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args) as unknown,
  deactivateUser: (...args: unknown[]) => mockDeactivateUser(...args) as unknown,
}));

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
  const { adminRoutes } = await import('../../src/routes/admin.js');
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!c.env) {
      // @ts-expect-error -- env is undefined in test context
      c.env = {};
    }
    const env = c.env as Record<string, unknown>;
    env.JWT_SECRET = JWT_SECRET;
    env.DB = {};
    await next();
  });
  app.route('/admin', adminRoutes);
  return app;
}

async function adminToken(): Promise<string> {
  return issueJWT({ sub: 'admin-1', email: 'admin@acasus.com', role: 'admin' }, JWT_SECRET, 900);
}

async function viewerToken(): Promise<string> {
  return issueJWT({ sub: 'viewer-1', email: 'viewer@acasus.com', role: 'viewer' }, JWT_SECRET, 900);
}

describe('GET /admin/users', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 with user list for admin', async () => {
    const mockUsers = [
      {
        id: 'u-1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];
    mockListAllUsers.mockResolvedValueOnce(mockUsers);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { users: unknown[] } = await res.json();
    expect(body.users).toHaveLength(1);
  });
});

describe('POST /admin/users', () => {
  it('returns 201 and creates user for admin', async () => {
    mockCreateUser.mockResolvedValueOnce({
      id: 'new-id',
      email: 'new@acasus.com',
      name: 'New User',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'new@acasus.com', name: 'New User', role: 'editor' }),
    });
    expect(res.status).toBe(201);
    const body: { user: { email: string } } = await res.json();
    expect(body.user.email).toBe('new@acasus.com');
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'not-an-email', name: '', role: 'invalid-role' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@acasus.com', name: 'New', role: 'editor' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /admin/users/:id', () => {
  it('returns 200 and updates role for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/user-123', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'viewer' }),
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 400 for invalid role', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/user-123', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'superadmin' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /admin/users/:id', () => {
  it('returns 200 and deactivates user for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 403 for non-admin', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });
});
