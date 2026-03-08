import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const mockReturning = vi.fn().mockResolvedValue([]);
const mockDbChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockInsertReturning = vi.fn().mockResolvedValue([]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockUpdateReturning = vi.fn().mockResolvedValue([]);
const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockDeleteReturning = vi.fn().mockResolvedValue([]);
const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(mockDbChain),
    insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
    update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
    delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
  }),
}));

vi.mock('../../src/db/schema.js', () => ({
  categories: { id: 'id', name: 'name', createdAt: 'created_at' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock('../../src/services/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.js')>();
  return { ...actual };
});

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
  const { categoryRoutes } = await import('../../src/routes/categories.js');
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
    env.ALLOWED_EMAILS = 'admin@acasus.com';
    await next();
  });
  app.route('/categories', categoryRoutes);
  return app;
}

async function adminToken(): Promise<string> {
  return issueJWT({ sub: 'admin-1', email: 'admin@acasus.com', role: 'admin' }, JWT_SECRET, 900);
}

async function editorToken(): Promise<string> {
  return issueJWT({ sub: 'editor-1', email: 'editor@acasus.com', role: 'editor' }, JWT_SECRET, 900);
}

async function viewerToken(): Promise<string> {
  return issueJWT({ sub: 'viewer-1', email: 'viewer@acasus.com', role: 'viewer' }, JWT_SECRET, 900);
}

describe('GET /categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.from.mockReturnThis();
  });

  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/categories');
    expect(res.status).toBe(401);
  });

  it('returns 200 with categories list for authenticated user', async () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Employment', createdAt: '2026-01-01' },
      { id: 'cat-2', name: 'Compliance', createdAt: '2026-01-02' },
    ];
    mockDbChain.from.mockResolvedValueOnce(mockCategories);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/categories', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { categories: unknown[] } = await res.json();
    expect(body).toHaveProperty('categories');
  });
});

describe('POST /categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Category' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Category' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Category' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name field', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates category for admin', async () => {
    const newCategory = { id: 'cat-new', name: 'Employment', createdAt: '2026-01-01' };
    mockInsertReturning.mockResolvedValueOnce([newCategory]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Employment' }),
    });
    expect(res.status).toBe(201);
    const body: { category: { name: string } } = await res.json();
    expect(body.category.name).toBe('Employment');
  });

  it('returns 409 when category already exists', async () => {
    mockInsertReturning.mockRejectedValueOnce(
      new Error('UNIQUE constraint failed: categories.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Duplicate' }),
    });
    expect(res.status).toBe(409);
  });

  it('re-throws non-unique constraint errors', async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error('Some other DB error'));

    const app = await importAndCreateApp();
    app.onError((_err, c) => c.json({ error: 'Internal error' }, 500));
    const token = await adminToken();
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
  });
});

describe('PUT /categories/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 and updates category for admin', async () => {
    const updated = { id: 'cat-1', name: 'Updated', createdAt: '2026-01-01' };
    mockUpdateReturning.mockResolvedValueOnce([updated]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body: { category: { name: string } } = await res.json();
    expect(body.category.name).toBe('Updated');
  });

  it('returns 404 when category not found', async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/nonexistent', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when updated name already exists', async () => {
    mockUpdateReturning.mockRejectedValueOnce(
      new Error('UNIQUE constraint failed: categories.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Duplicate' }),
    });
    expect(res.status).toBe(409);
  });

  it('re-throws non-unique constraint errors', async () => {
    mockUpdateReturning.mockRejectedValueOnce(new Error('Some other DB error'));

    const app = await importAndCreateApp();
    app.onError((_err, c) => c.json({ error: 'Internal error' }, 500));
    const token = await adminToken();
    const res = await app.request('/categories/cat-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /categories/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/categories/cat-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/categories/cat-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 and deletes category for admin', async () => {
    mockDeleteReturning.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Deleted', createdAt: '2026-01-01' },
    ]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/cat-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 when category not found', async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/categories/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });
});
