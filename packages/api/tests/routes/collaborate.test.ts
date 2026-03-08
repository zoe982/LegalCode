import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import type { AppEnv } from '../../src/types/env.js';

// Mock auth middleware before importing routes
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation(async (c: Context<AppEnv>, next: Next) => {
    const role = c.req.header('X-Test-Role') ?? 'editor';
    const userId = c.req.header('X-Test-User-Id') ?? 'user-1';
    const email = c.req.header('X-Test-Email') ?? 'test@example.com';

    if (c.req.header('X-Test-Auth') === 'fail') {
      return c.json({ error: 'Authentication required' }, 401);
    }

    c.set('user', { id: userId, email, role: role as 'admin' | 'editor' | 'viewer' });
    await next();
    return undefined;
  }),
  requireRole: vi.fn().mockImplementation((...roles: string[]) => {
    return async (c: Context<AppEnv>, next: Next) => {
      const user = c.get('user');
      if (!roles.includes(user.role)) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }
      await next();
      return undefined;
    };
  }),
}));

// Import after mocks
const { collaborateRoutes } = await import('../../src/routes/collaborate.js');

interface MockStub {
  fetch: ReturnType<typeof vi.fn>;
}

function createMockEnv(doStubResponse = new Response(null, { status: 200 })) {
  const mockStub: MockStub = {
    fetch: vi.fn().mockResolvedValue(doStubResponse),
  };
  return {
    env: {
      DB: {} as D1Database,
      AUTH_KV: {} as KVNamespace,
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@example.com',
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      TEMPLATE_SESSION: {
        idFromName: vi.fn().mockReturnValue('do-id'),
        get: vi.fn().mockReturnValue(mockStub),
      } as unknown as DurableObjectNamespace,
    } satisfies AppEnv['Bindings'],
    stub: mockStub,
  };
}

describe('collaborate routes', () => {
  let app: Hono<AppEnv>;
  let mock: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono<AppEnv>();
    app.route('/collaborate', collaborateRoutes);
    mock = createMockEnv();
  });

  // Helper: cast env for app.request's 3rd arg
  function envArg() {
    return mock.env as unknown as Record<string, unknown>;
  }

  // Helper: get the TEMPLATE_SESSION mock for assertions
  function doNamespace() {
    return mock.env.TEMPLATE_SESSION as unknown as {
      idFromName: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
    };
  }

  describe('GET /collaborate/:templateId', () => {
    it('returns 426 when Upgrade header is missing', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { 'X-Test-Role': 'editor' } },
        envArg(),
      );

      expect(res.status).toBe(426);
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.error).toBe('Expected WebSocket upgrade');
    });

    it('returns 426 when Upgrade header is not websocket', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'h2c', 'X-Test-Role': 'editor' } },
        envArg(),
      );

      expect(res.status).toBe(426);
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.error).toBe('Expected WebSocket upgrade');
    });

    it('forwards to DO stub with Upgrade: websocket header', async () => {
      await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket', 'X-Test-Role': 'editor' } },
        envArg(),
      );

      expect(doNamespace().idFromName).toHaveBeenCalledWith('tmpl-1');
      expect(doNamespace().get).toHaveBeenCalledWith('do-id');
      expect(mock.stub.fetch).toHaveBeenCalledOnce();
    });

    it('sets correct user headers on forwarded request', async () => {
      await app.request(
        '/collaborate/tmpl-42',
        {
          method: 'GET',
          headers: {
            Upgrade: 'websocket',
            'X-Test-Role': 'admin',
            'X-Test-User-Id': 'user-99',
            'X-Test-Email': 'admin@example.com',
          },
        },
        envArg(),
      );

      expect(mock.stub.fetch).toHaveBeenCalledOnce();
      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      expect(forwardedRequest.headers.get('X-User-Id')).toBe('user-99');
      expect(forwardedRequest.headers.get('X-User-Email')).toBe('admin@example.com');
      expect(forwardedRequest.headers.get('X-User-Role')).toBe('admin');
      expect(forwardedRequest.headers.get('X-Template-Id')).toBe('tmpl-42');
    });

    it('uses default user values when test headers are not set', async () => {
      await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket' } },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      expect(forwardedRequest.headers.get('X-User-Id')).toBe('user-1');
      expect(forwardedRequest.headers.get('X-User-Email')).toBe('test@example.com');
      expect(forwardedRequest.headers.get('X-User-Role')).toBe('editor');
    });

    it('forwards the request method as GET', async () => {
      await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket' } },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      expect(forwardedRequest.method).toBe('GET');
    });
  });

  describe('POST /collaborate/:templateId/save-version', () => {
    it('forwards save-version to DO stub with userId and changeSummary', async () => {
      const doResponse = new Response(JSON.stringify({ id: 'ver-1', versionNumber: 2 }), {
        headers: { 'Content-Type': 'application/json' },
      });
      mock = createMockEnv(doResponse);

      const res = await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Role': 'editor',
            'X-Test-User-Id': 'user-5',
          },
          body: JSON.stringify({ changeSummary: 'Updated intro paragraph' }),
        },
        envArg(),
      );

      expect(res.status).toBe(200);
      expect(mock.stub.fetch).toHaveBeenCalledOnce();

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      expect(forwardedRequest.method).toBe('POST');
      expect(forwardedRequest.headers.get('X-User-Id')).toBe('user-5');
      expect(forwardedRequest.headers.get('Content-Type')).toBe('application/json');

      const forwardedBody: { changeSummary: string } = await forwardedRequest.json();
      expect(forwardedBody.changeSummary).toBe('Updated intro paragraph');
    });

    it('uses "Manual save" default when changeSummary is empty string', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'editor' },
          body: JSON.stringify({ changeSummary: '' }),
        },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      const forwardedBody: { changeSummary: string } = await forwardedRequest.json();
      expect(forwardedBody.changeSummary).toBe('Manual save');
    });

    it('uses "Manual save" default when changeSummary is missing', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'editor' },
          body: JSON.stringify({}),
        },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      const forwardedBody: { changeSummary: string } = await forwardedRequest.json();
      expect(forwardedBody.changeSummary).toBe('Manual save');
    });

    it('uses "Manual save" default when changeSummary is not a string', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'editor' },
          body: JSON.stringify({ changeSummary: 123 }),
        },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      const forwardedBody: { changeSummary: string } = await forwardedRequest.json();
      expect(forwardedBody.changeSummary).toBe('Manual save');
    });

    it('uses "Manual save" when body is not an object', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'editor' },
          body: JSON.stringify('just a string'),
        },
        envArg(),
      );

      const forwardedRequest = (mock.stub.fetch.mock.calls[0] as unknown[])[0] as Request;
      const forwardedBody: { changeSummary: string } = await forwardedRequest.json();
      expect(forwardedBody.changeSummary).toBe('Manual save');
    });

    it('forwards to the correct template DO', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await app.request(
        '/collaborate/tmpl-77/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'admin' },
          body: JSON.stringify({ changeSummary: 'Save' }),
        },
        envArg(),
      );

      expect(doNamespace().idFromName).toHaveBeenCalledWith('tmpl-77');
      expect(doNamespace().get).toHaveBeenCalledWith('do-id');
    });

    it('forwards the DO response back to the client with valid Schema', async () => {
      mock = createMockEnv(
        new Response(JSON.stringify({ id: 'ver-1', versionNumber: 3 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const res = await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'editor' },
          body: JSON.stringify({ changeSummary: 'Test save' }),
        },
        envArg(),
      );

      expect(res.status).toBe(200);
      // Contract: validate save-version response shape
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.id).toBe('ver-1');
      expect(body.versionNumber).toBe(3);
    });
  });

  describe('authentication and authorization', () => {
    it('returns 401 for unauthenticated request', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { 'X-Test-Auth': 'fail' } },
        envArg(),
      );

      expect(res.status).toBe(401);
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 for viewer role on GET', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket', 'X-Test-Role': 'viewer' } },
        envArg(),
      );

      expect(res.status).toBe(403);
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('returns 403 for viewer role on POST save-version', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Role': 'viewer' },
          body: JSON.stringify({ changeSummary: 'test' }),
        },
        envArg(),
      );

      expect(res.status).toBe(403);
      const body: { error?: string; id?: string; versionNumber?: number } = await res.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('allows admin role on GET', async () => {
      await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket', 'X-Test-Role': 'admin' } },
        envArg(),
      );

      expect(mock.stub.fetch).toHaveBeenCalledOnce();
    });

    it('allows editor role on GET', async () => {
      await app.request(
        '/collaborate/tmpl-1',
        { method: 'GET', headers: { Upgrade: 'websocket', 'X-Test-Role': 'editor' } },
        envArg(),
      );

      expect(mock.stub.fetch).toHaveBeenCalledOnce();
    });

    it('returns 401 for unauthenticated POST save-version', async () => {
      const res = await app.request(
        '/collaborate/tmpl-1/save-version',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Test-Auth': 'fail' },
          body: JSON.stringify({ changeSummary: 'test' }),
        },
        envArg(),
      );

      expect(res.status).toBe(401);
    });
  });
});
