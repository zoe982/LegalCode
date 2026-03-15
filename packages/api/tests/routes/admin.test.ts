import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';
import { allowedEmailsResponseSchema } from '@legalcode/shared';
import { errorHandler } from '../../src/middleware/error.js';

const mockLimit = vi.fn().mockResolvedValue([]);
const mockDbChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: mockLimit,
};

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(mockDbChain),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'err-1' }]),
        }),
      }),
    }),
  }),
}));

const mockListErrors = vi.fn().mockResolvedValue([]);
const mockResolveError = vi.fn().mockResolvedValue(true);
const mockLogError = vi.fn().mockResolvedValue({ errorId: 'test-err-id' });

vi.mock('../../src/services/error-log.js', () => ({
  listErrors: (...args: unknown[]) => mockListErrors(...args) as unknown,
  resolveError: (...args: unknown[]) => mockResolveError(...args) as unknown,
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

vi.mock('../../src/db/schema.js', () => ({
  auditLog: { action: 'action', createdAt: 'created_at' },
  errorLog: {
    source: 'source',
    status: 'status',
    severity: 'severity',
    lastSeenAt: 'last_seen_at',
    id: 'id',
    fingerprint: 'fingerprint',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  and: vi.fn((...args: unknown[]) => args),
}));

const mockListAllUsers = vi.fn().mockResolvedValue([]);
const mockCreateUser = vi.fn();
const mockUpdateUserRole = vi.fn().mockResolvedValue(undefined);
const mockDeactivateUser = vi.fn().mockResolvedValue(undefined);
const mockFindUserById = vi.fn().mockResolvedValue({
  id: 'user-456',
  email: 'delete-me@acasus.com',
  name: 'Delete Me',
  role: 'editor',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

vi.mock('../../src/services/user.js', () => ({
  listAllUsers: (...args: unknown[]) => mockListAllUsers(...args) as unknown,
  createUser: (...args: unknown[]) => mockCreateUser(...args) as unknown,
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args) as unknown,
  deactivateUser: (...args: unknown[]) => mockDeactivateUser(...args) as unknown,
  findUserById: (...args: unknown[]) => mockFindUserById(...args) as unknown,
}));

const mockGetAllowedEmails = vi.fn().mockResolvedValue(['alice@acasus.com', 'bob@acasus.com']);
const mockAddAllowedEmail = vi
  .fn()
  .mockResolvedValue(['alice@acasus.com', 'bob@acasus.com', 'new@acasus.com']);
const mockRemoveAllowedEmail = vi.fn().mockResolvedValue(['bob@acasus.com']);

vi.mock('../../src/services/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.js')>();
  return {
    ...actual,
    getAllowedEmails: (...args: unknown[]) => mockGetAllowedEmails(...args) as unknown,
    addAllowedEmail: (...args: unknown[]) => mockAddAllowedEmail(...args) as unknown,
    removeAllowedEmail: (...args: unknown[]) => mockRemoveAllowedEmail(...args) as unknown,
  };
});

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
    env.AUTH_KV = {};
    env.ALLOWED_EMAILS = 'alice@acasus.com,bob@acasus.com';
    await next();
  });
  app.route('/admin', adminRoutes);
  app.onError(errorHandler);
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
  beforeEach(() => {
    mockAddAllowedEmail.mockClear();
    mockCreateUser.mockReset();
    mockDeactivateUser.mockClear();
    mockLogError.mockClear();
  });

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
    expect(mockAddAllowedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'new@acasus.com',
    );
  });

  it('also adds email to allowed list on user creation', async () => {
    mockCreateUser.mockResolvedValueOnce({
      id: 'another-id',
      email: 'added@acasus.com',
      name: 'Added User',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'added@acasus.com', name: 'Added User', role: 'editor' }),
    });
    expect(mockAddAllowedEmail).toHaveBeenCalledTimes(1);
    expect(mockAddAllowedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'added@acasus.com',
    );
  });

  it('returns 409 when email already exists', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('UNIQUE constraint failed: users.email'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'exists@acasus.com', name: 'Exists', role: 'editor' }),
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('A user with this email already exists');
  });

  it('returns 500 for non-unique-constraint DB errors', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Connection refused'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'fail@acasus.com', name: 'Fail User', role: 'editor' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    consoleSpy.mockRestore();
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('non-standard error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'fail2@acasus.com', name: 'Fail User 2', role: 'editor' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    consoleSpy.mockRestore();
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

  it('rolls back created user when addAllowedEmail fails', async () => {
    const createdUser = {
      id: 'rollback-id',
      email: 'rollback@acasus.com',
      name: 'Rollback User',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    mockCreateUser.mockResolvedValueOnce(createdUser);
    mockAddAllowedEmail.mockRejectedValueOnce(new Error('KV write failed'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'rollback@acasus.com', name: 'Rollback User', role: 'editor' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    // Verify rollback: deactivateUser should have been called with the created user's ID
    expect(mockDeactivateUser).toHaveBeenCalledWith(expect.anything(), 'rollback-id');
    consoleSpy.mockRestore();
  });

  it('returns 500 even when logError rejects', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'fail@acasus.com', name: 'Fail', role: 'editor' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('logs error to error_log on 500', async () => {
    mockLogError.mockClear();
    mockCreateUser.mockRejectedValueOnce(new Error('Connection refused'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'log@acasus.com', name: 'Log User', role: 'editor' }),
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'Connection refused',
      }),
    );
    consoleSpy.mockRestore();
  });
});

describe('PATCH /admin/users/:id', () => {
  beforeEach(() => {
    mockUpdateUserRole.mockClear();
    mockLogError.mockClear();
  });

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

  it('returns 500 and logs error for unexpected DB errors on role update', async () => {
    mockUpdateUserRole.mockRejectedValueOnce(new Error('DB connection lost'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-123', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'viewer' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'DB connection lost',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('returns 500 even when logError rejects', async () => {
    mockUpdateUserRole.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-123', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'viewer' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('returns 500 when error is not an Error instance on role update', async () => {
    mockUpdateUserRole.mockRejectedValueOnce(new Error('non-standard error'));
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-123', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'viewer' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    consoleSpy.mockRestore();
  });
});

describe('DELETE /admin/users/:id', () => {
  beforeEach(() => {
    mockFindUserById.mockReset();
    mockFindUserById.mockResolvedValue({
      id: 'user-456',
      email: 'delete-me@acasus.com',
      name: 'Delete Me',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    mockRemoveAllowedEmail.mockClear();
    mockDeactivateUser.mockClear();
    mockLogError.mockClear();
  });

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
    expect(mockRemoveAllowedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'delete-me@acasus.com',
    );
  });

  it('returns 404 when user not found', async () => {
    mockFindUserById.mockResolvedValueOnce(undefined);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('User not found');
    expect(mockDeactivateUser).not.toHaveBeenCalled();
    expect(mockRemoveAllowedEmail).not.toHaveBeenCalled();
  });

  it('also removes email from allowed list on user deletion', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(mockDeactivateUser).toHaveBeenCalledWith(expect.anything(), 'user-456');
    expect(mockRemoveAllowedEmail).toHaveBeenCalledTimes(1);
    expect(mockRemoveAllowedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'delete-me@acasus.com',
    );
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

  it('returns 500 and logs error when deactivateUser fails', async () => {
    mockDeactivateUser.mockRejectedValueOnce(new Error('DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'DB error',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('returns 500 and logs error when removeAllowedEmail fails after user deletion', async () => {
    mockRemoveAllowedEmail.mockRejectedValueOnce(new Error('KV write failed'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(mockDeactivateUser).toHaveBeenCalledWith(expect.anything(), 'user-456');
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'KV write failed',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('returns 500 even when logError rejects', async () => {
    mockDeactivateUser.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('returns 500 when error is not an Error instance on delete', async () => {
    mockDeactivateUser.mockRejectedValueOnce(new Error('non-standard error'));
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/admin/users/user-456', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    consoleSpy.mockRestore();
  });
});

describe('GET /admin/errors', () => {
  it('returns 200 with error list for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/errors', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { errors: unknown[] } = await res.json();
    expect(body).toHaveProperty('errors');
    expect(Array.isArray(body.errors)).toBe(true);
    expect(mockListErrors).toHaveBeenCalled();
  });

  it('passes query filters to listErrors', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    await app.request('/admin/errors?source=frontend&status=open', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(mockListErrors).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'frontend',
        status: 'open',
      }),
    );
  });

  it('falls back to empty filters when query params are invalid', async () => {
    mockListErrors.mockClear();
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/errors?source=invalid_source', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    expect(mockListErrors).toHaveBeenCalledWith(expect.anything(), {});
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/errors');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /admin/errors/:id/resolve', () => {
  it('returns 200 when error is resolved', async () => {
    mockResolveError.mockResolvedValueOnce(true);
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/errors/err-1/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 when error is not found', async () => {
    mockResolveError.mockResolvedValueOnce(false);
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/errors/nonexistent/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-admin', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/errors/err-1/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/errors/err-1/resolve', {
      method: 'PATCH',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /admin/allowed-emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllowedEmails.mockResolvedValue(['alice@acasus.com', 'bob@acasus.com']);
  });

  it('returns 200 with email list for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/allowed-emails', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = allowedEmailsResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.emails).toEqual(['alice@acasus.com', 'bob@acasus.com']);
    }
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/allowed-emails');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/allowed-emails', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /admin/allowed-emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddAllowedEmail.mockResolvedValue(['alice@acasus.com', 'bob@acasus.com', 'new@acasus.com']);
  });

  it('returns 200 and adds email for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/allowed-emails', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'new@acasus.com' }),
    });
    expect(res.status).toBe(200);
    const body: { emails: string[] } = await res.json();
    expect(body.emails).toContain('new@acasus.com');
    expect(mockAddAllowedEmail).toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/allowed-emails', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing email field', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/allowed-emails', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/allowed-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@acasus.com' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/allowed-emails', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'new@acasus.com' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /admin/allowed-emails/:email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveAllowedEmail.mockResolvedValue(['bob@acasus.com']);
  });

  it('returns 200 and removes email for admin', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/admin/allowed-emails/alice@acasus.com', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { emails: string[] } = await res.json();
    expect(body.emails).toEqual(['bob@acasus.com']);
    expect(mockRemoveAllowedEmail).toHaveBeenCalled();
  });

  it('handles URL-encoded email addresses', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const encodedEmail = encodeURIComponent('alice+tag@acasus.com');
    const res = await app.request(`/admin/allowed-emails/${encodedEmail}`, {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    expect(mockRemoveAllowedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'alice+tag@acasus.com',
    );
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/admin/allowed-emails/alice@acasus.com', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/admin/allowed-emails/alice@acasus.com', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });
});
