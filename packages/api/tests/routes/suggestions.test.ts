import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';
import { suggestionSchema, suggestionsResponseSchema } from '@legalcode/shared';
import { requireJsonContentType } from '../../src/middleware/content-type.js';

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

const mockGetSuggestions = vi.fn();
const mockCreateSuggestion = vi.fn();
const mockAcceptSuggestion = vi.fn();
const mockRejectSuggestion = vi.fn();
const mockDeleteSuggestion = vi.fn();

vi.mock('../../src/services/suggestion.js', () => ({
  getSuggestions: (...args: unknown[]) => mockGetSuggestions(...args) as unknown,
  createSuggestion: (...args: unknown[]) => mockCreateSuggestion(...args) as unknown,
  acceptSuggestion: (...args: unknown[]) => mockAcceptSuggestion(...args) as unknown,
  rejectSuggestion: (...args: unknown[]) => mockRejectSuggestion(...args) as unknown,
  deleteSuggestion: (...args: unknown[]) => mockDeleteSuggestion(...args) as unknown,
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
  deleteTemplate: vi.fn(),
  restoreTemplate: vi.fn(),
  hardDeleteTemplate: vi.fn(),
  listDeletedTemplates: vi.fn(),
}));

// Mock comment service (needed because templates.ts imports it)
vi.mock('../../src/services/comment.js', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('../../src/services/audit-log.js', () => ({
  logAudit: vi.fn(),
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
  app.use('/templates/*', requireJsonContentType);
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

const mockSuggestion = {
  id: 's-1',
  templateId: 't-1',
  authorId: 'admin-1',
  authorName: 'admin@acasus.com',
  authorEmail: 'admin@acasus.com',
  type: 'insert' as const,
  anchorFrom: '0',
  anchorTo: '10',
  originalText: 'hello',
  replacementText: 'hello world',
  status: 'pending' as const,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-03-07T00:00:00Z',
  updatedAt: '2026-03-07T00:00:00Z',
};

// ── GET /templates/:id/suggestions ──

describe('GET /templates/:id/suggestions', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/suggestions');
    expect(res.status).toBe(401);
  });

  it('returns 200 with suggestions list for authenticated user', async () => {
    mockGetSuggestions.mockResolvedValueOnce([mockSuggestion]);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/suggestions', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    // Contract test: validate response matches shared schema
    const parsed = suggestionsResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 200 with empty array when no suggestions', async () => {
    mockGetSuggestions.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/suggestions', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown[] = await res.json();
    expect(body).toEqual([]);
  });
});

// ── POST /templates/:id/suggestions ──

describe('POST /templates/:id/suggestions', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'insert',
        anchorFrom: '0',
        anchorTo: '10',
        originalText: 'hello',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 on success with contract test', async () => {
    mockCreateSuggestion.mockResolvedValueOnce(mockSuggestion);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'insert',
        anchorFrom: '0',
        anchorTo: '10',
        originalText: 'hello',
        replacementText: 'hello world',
      }),
    });
    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    // Contract test: validate response matches shared schema
    const parsed = suggestionSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 400 for invalid input (parse error)', async () => {
    mockCreateSuggestion.mockImplementationOnce(() => {
      const err = new Error('Validation error');
      err.message = 'parse error';
      throw err;
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'invalid' }),
    });
    expect(res.status).toBe(400);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('re-throws non-parse errors', async () => {
    mockCreateSuggestion.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'insert',
        anchorFrom: '0',
        anchorTo: '10',
        originalText: 'test',
      }),
    });
    expect(res.status).toBe(500);
  });

  it('notifies DO on successful create when TEMPLATE_SESSION is available', async () => {
    mockCreateSuggestion.mockResolvedValueOnce(mockSuggestion);

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'insert',
        anchorFrom: '0',
        anchorTo: '10',
        originalText: 'hello',
      }),
    });
    expect(res.status).toBe(201);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
    expect(mockTemplateSession.get).toHaveBeenCalled();
  });
});

// ── PATCH /templates/:id/suggestions/:sid/accept ──

describe('PATCH /templates/:id/suggestions/:sid/accept', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/suggestions/s-1/accept', {
      method: 'PATCH',
    });
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful accept', async () => {
    mockAcceptSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/accept', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('returns 404 when suggestion not found', async () => {
    mockAcceptSuggestion.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-bad/accept', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Suggestion not found');
  });

  it('returns 409 for invalid state', async () => {
    mockAcceptSuggestion.mockResolvedValueOnce({ error: 'invalid_state' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/accept', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Suggestion is not pending');
  });

  it('notifies DO on successful accept when TEMPLATE_SESSION is available', async () => {
    mockAcceptSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/accept', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
  });
});

// ── PATCH /templates/:id/suggestions/:sid/reject ──

describe('PATCH /templates/:id/suggestions/:sid/reject', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/suggestions/s-1/reject', {
      method: 'PATCH',
    });
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful reject', async () => {
    mockRejectSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/reject', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('returns 404 when suggestion not found', async () => {
    mockRejectSuggestion.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-bad/reject', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Suggestion not found');
  });

  it('returns 409 for invalid state', async () => {
    mockRejectSuggestion.mockResolvedValueOnce({ error: 'invalid_state' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/reject', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Suggestion is not pending');
  });

  it('notifies DO on successful reject when TEMPLATE_SESSION is available', async () => {
    mockRejectSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1/reject', {
      method: 'PATCH',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
  });
});

// ── DELETE /templates/:id/suggestions/:sid ──

describe('DELETE /templates/:id/suggestions/:sid', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/suggestions/s-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful delete', async () => {
    mockDeleteSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('returns 404 when suggestion not found', async () => {
    mockDeleteSuggestion.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-bad', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Suggestion not found');
  });

  it('returns 403 when forbidden', async () => {
    mockDeleteSuggestion.mockResolvedValueOnce({ error: 'forbidden' });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/suggestions/s-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('notifies DO on successful delete when TEMPLATE_SESSION is available', async () => {
    mockDeleteSuggestion.mockResolvedValueOnce({ ok: true });

    const app = await importAndCreateApp({ withDO: true });
    const token = await adminToken();
    const res = await app.request('/templates/t-1/suggestions/s-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(204);
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
  });
});
