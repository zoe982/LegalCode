import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { reportErrorSchema } from '@legalcode/shared';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const mockLogError = vi.fn().mockResolvedValue({ errorId: 'err-123' });

vi.mock('../../src/services/error-log.js', () => ({
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

vi.mock('../../src/db/schema.js', () => ({
  errorLog: {
    source: 'source',
    status: 'status',
    severity: 'severity',
    lastSeenAt: 'last_seen_at',
    id: 'id',
    fingerprint: 'fingerprint',
  },
}));

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
  const { errorRoutes } = await import('../../src/routes/errors.js');
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
  app.route('/errors', errorRoutes);
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

describe('POST /errors/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogError.mockResolvedValue({ errorId: 'err-123' });
  });

  it('returns 200 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend', message: 'Editor error' }),
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean; errorId: string } = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errorId).toBe('err-123');
  });

  it('returns 200 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend', message: 'Viewer error' }),
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean; errorId: string } = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errorId).toBe('err-123');
  });

  it('returns 200 for admin role', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend', message: 'Admin error' }),
    });
    expect(res.status).toBe(200);
    const body: { ok: boolean; errorId: string } = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errorId).toBe('err-123');
  });

  it('returns 401 without auth', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'frontend', message: 'No auth error' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid payload (missing source)', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'error without source' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid payload (missing message)', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend' }),
    });
    expect(res.status).toBe(400);
  });

  it('validates request payload against shared reportErrorSchema', () => {
    const validPayload = { source: 'frontend', message: 'Test error' };
    const result = reportErrorSchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    const invalidPayload = { message: 'missing source' };
    const invalid = reportErrorSchema.safeParse(invalidPayload);
    expect(invalid.success).toBe(false);
  });

  it('passes userId from JWT to logError', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend', message: 'Test error', stack: 'Error at line 1' }),
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'frontend',
        message: 'Test error',
        userId: 'editor-1',
      }),
    );
  });

  it('accepts source value: frontend', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'frontend', message: 'test' }),
    });
    expect(res.status).toBe(200);
  });

  it('accepts source value: backend', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'backend', message: 'test' }),
    });
    expect(res.status).toBe(200);
  });

  it('accepts source value: websocket', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'websocket', message: 'test' }),
    });
    expect(res.status).toBe(200);
  });

  it('accepts source value: functional', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/errors/report', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'functional', message: 'test' }),
    });
    expect(res.status).toBe(200);
  });
});
