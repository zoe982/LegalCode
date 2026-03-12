import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { companySchema } from '@legalcode/shared';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const mockLogError = vi.fn().mockResolvedValue({ errorId: 'test-err-id' });

vi.mock('../../src/services/error-log.js', () => ({
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

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
  companies: { id: 'id', name: 'name', createdAt: 'created_at' },
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
  const { companyRoutes } = await import('../../src/routes/companies.js');
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
  app.route('/companies', companyRoutes);
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

describe('GET /companies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.from.mockReturnThis();
  });

  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/companies');
    expect(res.status).toBe(401);
  });

  it('returns 200 with companies list matching shared schema', async () => {
    const mockCompanies = [
      { id: 'com-1', name: 'Acme Corp', createdAt: '2026-01-01' },
      { id: 'com-2', name: 'Global Industries', createdAt: '2026-01-02' },
    ];
    mockDbChain.from.mockResolvedValueOnce(mockCompanies);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/companies', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { companies: unknown[] } = await res.json();
    expect(body).toHaveProperty('companies');
    // Contract: validate response items against shared Zod schema
    for (const company of body.companies) {
      expect(companySchema.safeParse(company).success).toBe(true);
    }
  });
});

describe('POST /companies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Company' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Company' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Company' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
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
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates company for admin', async () => {
    const newCompany = { id: 'com-new', name: 'Acme Corp', createdAt: '2026-01-01' };
    mockInsertReturning.mockResolvedValueOnce([newCompany]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Acme Corp' }),
    });
    expect(res.status).toBe(201);
    const body: { company: { name: string } } = await res.json();
    expect(body.company.name).toBe('Acme Corp');
  });

  it('returns 409 when company already exists', async () => {
    mockInsertReturning.mockRejectedValueOnce(
      new Error('UNIQUE constraint failed: companies.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Duplicate' }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 500 and logs error for unexpected DB errors', async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error('Some other DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'Some other DB error',
        url: '/api/companies',
        userId: 'admin-1',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockInsertReturning.mockRejectedValueOnce('string error');
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('PUT /companies/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/companies/com-1', {
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
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 and updates company for admin', async () => {
    const updated = { id: 'com-1', name: 'Updated Corp', createdAt: '2026-01-01' };
    mockUpdateReturning.mockResolvedValueOnce([updated]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Corp' }),
    });
    expect(res.status).toBe(200);
    const body: { company: { name: string } } = await res.json();
    expect(body.company.name).toBe('Updated Corp');
  });

  it('returns 404 when company not found', async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/nonexistent', {
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
      new Error('UNIQUE constraint failed: companies.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Duplicate' }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 500 and logs error for unexpected DB errors', async () => {
    mockUpdateReturning.mockRejectedValueOnce(new Error('Some other DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'Some other DB error',
        url: '/api/companies/com-1',
        userId: 'admin-1',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockUpdateReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockUpdateReturning.mockRejectedValueOnce('string error');
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Valid' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('DELETE /companies/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/companies/com-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/companies/com-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 and deletes company for admin', async () => {
    mockDeleteReturning.mockResolvedValueOnce([
      { id: 'com-1', name: 'Deleted Corp', createdAt: '2026-01-01' },
    ]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 when company not found', async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 500 and logs error for unexpected DB errors', async () => {
    mockDeleteReturning.mockRejectedValueOnce(new Error('DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
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
        url: '/api/companies/com-1',
        userId: 'admin-1',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockDeleteReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockDeleteReturning.mockRejectedValueOnce('string error');
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/companies/com-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
