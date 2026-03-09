import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { countrySchema } from '@legalcode/shared';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const mockLogError = vi.fn().mockResolvedValue({ errorId: 'test-err-id' });

vi.mock('../../src/services/error-log.js', () => ({
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

const mockDbChain = {
  from: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
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
  countries: { id: 'id', name: 'name', code: 'code', createdAt: 'created_at' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  asc: vi.fn((...args: unknown[]) => args),
}));

vi.mock('../../src/services/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.js')>();
  return { ...actual };
});

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
  const { countryRoutes } = await import('../../src/routes/countries.js');
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
  app.route('/countries', countryRoutes);
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

describe('GET /countries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.from.mockReturnThis();
  });

  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/countries');
    expect(res.status).toBe(401);
  });

  it('returns countries sorted alphabetically by name', async () => {
    const unsortedCountries = [
      { id: 'c-3', name: 'Zambia', code: 'ZM', createdAt: '2026-01-01' },
      { id: 'c-1', name: 'Argentina', code: 'AR', createdAt: '2026-01-01' },
      { id: 'c-2', name: 'Belgium', code: 'BE', createdAt: '2026-01-01' },
    ];
    mockDbChain.orderBy.mockResolvedValueOnce(unsortedCountries);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/countries', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);

    // Verify asc was called with countries.name
    const { asc: ascFn } = await import('drizzle-orm');
    expect(ascFn).toHaveBeenCalledWith('name');
  });

  it('returns 200 with countries list matching shared schema', async () => {
    const mockCountries = [{ id: 'c-1', name: 'Germany', code: 'DE', createdAt: '2026-01-01' }];
    mockDbChain.orderBy.mockResolvedValueOnce(mockCountries);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/countries', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { countries: unknown[] } = await res.json();
    expect(body).toHaveProperty('countries');
    // Contract: validate response items against shared Zod schema
    for (const c of body.countries) {
      expect(countrySchema.safeParse(c).success).toBe(true);
    }
  });
});

describe('POST /countries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input - empty name', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '', code: 'DE' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid input - missing code', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid input - code too short', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'D' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates country for admin', async () => {
    const newCountry = { id: 'c-new', name: 'Germany', code: 'DE', createdAt: '2026-01-01' };
    mockInsertReturning.mockResolvedValueOnce([newCountry]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(201);
    const body: { country: { name: string; code: string } } = await res.json();
    expect(body.country.name).toBe('Germany');
    expect(body.country.code).toBe('DE');
  });

  it('returns 409 when country already exists', async () => {
    mockInsertReturning.mockRejectedValueOnce(
      new Error('UNIQUE constraint failed: countries.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 500 and logs error for unexpected DB errors', async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error('Some other DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
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
        url: '/api/countries',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockInsertReturning.mockRejectedValueOnce('string error');
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Germany', code: 'DE' }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('PUT /countries/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for completely empty input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid name (empty string)', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid code (too short)', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'X' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 and updates country name only', async () => {
    const updated = { id: 'c-1', name: 'Updated', code: 'DE', createdAt: '2026-01-01' };
    mockUpdateReturning.mockResolvedValueOnce([updated]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body: { country: { name: string } } = await res.json();
    expect(body.country.name).toBe('Updated');
  });

  it('returns 200 and updates country code only', async () => {
    const updated = { id: 'c-1', name: 'Germany', code: 'GER', createdAt: '2026-01-01' };
    mockUpdateReturning.mockResolvedValueOnce([updated]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'GER' }),
    });
    expect(res.status).toBe(200);
    const body: { country: { code: string } } = await res.json();
    expect(body.country.code).toBe('GER');
  });

  it('returns 200 and updates both name and code', async () => {
    const updated = { id: 'c-1', name: 'Deutschland', code: 'DEU', createdAt: '2026-01-01' };
    mockUpdateReturning.mockResolvedValueOnce([updated]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Deutschland', code: 'DEU' }),
    });
    expect(res.status).toBe(200);
    const body: { country: { name: string; code: string } } = await res.json();
    expect(body.country.name).toBe('Deutschland');
    expect(body.country.code).toBe('DEU');
  });

  it('returns 404 when country not found', async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/nonexistent', {
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
      new Error('UNIQUE constraint failed: countries.name'),
    );

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
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
    const res = await app.request('/countries/c-1', {
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
        url: '/api/countries/c-1',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockUpdateReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'PUT',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when error is not an Error instance', async () => {
    mockUpdateReturning.mockRejectedValueOnce('string error');
    mockLogError.mockClear();

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
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

describe('DELETE /countries/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/countries/c-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/countries/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 and deletes country for admin', async () => {
    mockDeleteReturning.mockResolvedValueOnce([
      { id: 'c-1', name: 'Germany', code: 'DE', createdAt: '2026-01-01' },
    ]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 when country not found', async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 500 and logs error for unexpected DB errors', async () => {
    mockDeleteReturning.mockRejectedValueOnce(new Error('DB error'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
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
        url: '/api/countries/c-1',
      }),
    );
  });

  it('returns 500 even when logError rejects', async () => {
    mockDeleteReturning.mockRejectedValueOnce(new Error('DB error'));
    mockLogError.mockRejectedValueOnce(new Error('D1 unavailable'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/countries/c-1', {
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
    const res = await app.request('/countries/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
