import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';
import { commentSchema, commentsResponseSchema } from '@legalcode/shared';

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

const mockGetComments = vi.fn();
const mockCreateComment = vi.fn();
const mockResolveComment = vi.fn();
const mockDeleteComment = vi.fn();

vi.mock('../../src/services/comment.js', () => ({
  getComments: (...args: unknown[]) => mockGetComments(...args) as unknown,
  createComment: (...args: unknown[]) => mockCreateComment(...args) as unknown,
  resolveComment: (...args: unknown[]) => mockResolveComment(...args) as unknown,
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args) as unknown,
}));

// Mock template service (needed because templates.ts imports it)
vi.mock('../../src/services/template.js', () => ({
  createTemplate: vi.fn(),
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  getTemplateVersions: vi.fn(),
  getTemplateVersion: vi.fn(),
  downloadTemplate: vi.fn(),
  saveContent: vi.fn(),
  saveDraftContent: vi.fn(),
  deleteTemplate: vi.fn(),
  restoreTemplate: vi.fn(),
  hardDeleteTemplate: vi.fn(),
  listDeletedTemplates: vi.fn(),
}));

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

const mockStubFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
const mockDoStub = { fetch: mockStubFetch };
const mockTemplateSession = {
  idFromName: vi.fn().mockReturnValue('do-id-1'),
  get: vi.fn().mockReturnValue(mockDoStub),
};

async function importAndCreateApp(opts?: { withDO?: boolean }) {
  const { templateRoutes } = await import('../../src/routes/templates.js');
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
    if (opts?.withDO) {
      env.TEMPLATE_SESSION = mockTemplateSession;
    }
    // Mock executionCtx for fire-and-forget
    Object.defineProperty(c, 'executionCtx', {
      value: { waitUntil: vi.fn() },
      writable: true,
    });
    await next();
  });
  app.route('/templates', templateRoutes);
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /templates/:id/comments ──

describe('GET /templates/:id/comments', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/comments');
    expect(res.status).toBe(401);
  });

  it('returns 200 with comments list for authenticated user', async () => {
    const mockData = [
      {
        id: 'c-1',
        templateId: 't-1',
        parentId: null,
        authorId: 'u-1',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        content: 'Good',
        anchorText: null,
        anchorFrom: null,
        anchorTo: null,
        resolved: false,
        resolvedBy: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetComments.mockResolvedValueOnce(mockData);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/comments', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    // Contract test: validate response matches shared schema
    const parsed = commentsResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 200 with empty array when no comments', async () => {
    mockGetComments.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/comments', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown[] = await res.json();
    expect(body).toEqual([]);
  });
});

// ── POST /templates/:id/comments ──

describe('POST /templates/:id/comments', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hello' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 on success', async () => {
    const mockComment = {
      id: 'c-new',
      templateId: 't-1',
      parentId: null,
      authorId: 'admin-1',
      authorName: 'admin@acasus.com',
      authorEmail: 'admin@acasus.com',
      content: 'A comment',
      anchorText: null,
      anchorFrom: null,
      anchorTo: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-07T00:00:00Z',
      updatedAt: '2026-03-07T00:00:00Z',
    };
    mockCreateComment.mockResolvedValueOnce(mockComment);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'A comment' }),
    });
    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    // Contract test: validate response matches shared schema
    const parsed = commentSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 400 for invalid input (Zod parse error)', async () => {
    mockCreateComment.mockImplementationOnce(() => {
      const err = new Error('Validation error');
      err.message = 'parse error';
      throw err;
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('re-throws non-parse errors', async () => {
    mockCreateComment.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'test' }),
    });
    expect(res.status).toBe(500);
  });

  it('returns 400 when non-Error with parse message is thrown', async () => {
    mockCreateComment.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'parse failed';
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'test' }),
    });
    expect(res.status).toBe(400);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('notifies DO on successful create when TEMPLATE_SESSION is available', async () => {
    const mockComment = {
      id: 'c-do',
      templateId: 't-1',
      parentId: null,
      authorId: 'admin-1',
      authorName: 'admin@acasus.com',
      authorEmail: 'admin@acasus.com',
      content: 'DO notify test',
      anchorText: null,
      anchorFrom: null,
      anchorTo: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-07T00:00:00Z',
      updatedAt: '2026-03-07T00:00:00Z',
    };
    mockCreateComment.mockResolvedValueOnce(mockComment);

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'DO notify test' }),
    });
    expect(res.status).toBe(201);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
    expect(mockTemplateSession.get).toHaveBeenCalled();
  });

  it('allows viewer to post comments', async () => {
    const mockComment = {
      id: 'c-new',
      templateId: 't-1',
      parentId: null,
      authorId: 'viewer-1',
      authorName: 'viewer@acasus.com',
      authorEmail: 'viewer@acasus.com',
      content: 'Viewer comment',
      anchorText: null,
      anchorFrom: null,
      anchorTo: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-07T00:00:00Z',
      updatedAt: '2026-03-07T00:00:00Z',
    };
    mockCreateComment.mockResolvedValueOnce(mockComment);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/comments', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'Viewer comment' }),
    });
    expect(res.status).toBe(201);
  });
});

// ── PATCH /templates/:id/comments/:commentId/resolve ──

describe('PATCH /templates/:id/comments/:commentId/resolve', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/comments/c-1/resolve', {
      method: 'PATCH',
    });
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful resolve', async () => {
    mockResolveComment.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-1/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('returns 404 when comment not found', async () => {
    mockResolveComment.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-bad/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Comment not found');
  });

  it('returns 403 when forbidden', async () => {
    mockResolveComment.mockResolvedValueOnce({ error: 'forbidden' });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/comments/c-1/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('notifies DO on successful resolve when TEMPLATE_SESSION is available', async () => {
    mockResolveComment.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-1/resolve', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
  });
});

// ── DELETE /templates/:id/comments/:commentId ──

describe('DELETE /templates/:id/comments/:commentId', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/comments/c-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful delete', async () => {
    mockDeleteComment.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('returns 404 when comment not found', async () => {
    mockDeleteComment.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-bad', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Comment not found');
  });

  it('returns 403 when forbidden', async () => {
    mockDeleteComment.mockResolvedValueOnce({ error: 'forbidden' });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/comments/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('notifies DO on successful delete when TEMPLATE_SESSION is available', async () => {
    mockDeleteComment.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/comments/c-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
  });
});
