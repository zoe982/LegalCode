import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

vi.mock('../../src/services/audit-log.js', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/error-log.js', () => ({
  logError: vi.fn().mockResolvedValue(undefined),
}));

const mockCreateTemplate = vi.fn();
const mockListTemplates = vi.fn();
const mockGetTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockGetTemplateVersions = vi.fn();
const mockGetTemplateVersion = vi.fn();
const mockDownloadTemplate = vi.fn();
const mockSaveContent = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockRestoreTemplate = vi.fn();
const mockHardDeleteTemplate = vi.fn();
const mockListDeletedTemplates = vi.fn();

vi.mock('../../src/services/template.js', () => ({
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args) as unknown,
  listTemplates: (...args: unknown[]) => mockListTemplates(...args) as unknown,
  getTemplate: (...args: unknown[]) => mockGetTemplate(...args) as unknown,
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args) as unknown,
  getTemplateVersions: (...args: unknown[]) => mockGetTemplateVersions(...args) as unknown,
  getTemplateVersion: (...args: unknown[]) => mockGetTemplateVersion(...args) as unknown,
  downloadTemplate: (...args: unknown[]) => mockDownloadTemplate(...args) as unknown,
  saveContent: (...args: unknown[]) => mockSaveContent(...args) as unknown,
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args) as unknown,
  restoreTemplate: (...args: unknown[]) => mockRestoreTemplate(...args) as unknown,
  hardDeleteTemplate: (...args: unknown[]) => mockHardDeleteTemplate(...args) as unknown,
  listDeletedTemplates: (...args: unknown[]) => mockListDeletedTemplates(...args) as unknown,
}));

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
  const { templateRoutes } = await import('../../src/routes/templates.js');
  const { errorHandler } = await import('../../src/middleware/error.js');
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
    // Mock executionCtx for fire-and-forget audit logging
    Object.defineProperty(c, 'executionCtx', {
      value: { waitUntil: vi.fn() },
      writable: true,
    });
    await next();
  });
  app.onError(errorHandler);
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

// ── GET /templates ────────────────────────────────────────────────────

describe('GET /templates', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates');
    expect(res.status).toBe(401);
  });

  it('returns 200 with template list for authenticated user', async () => {
    mockListTemplates.mockResolvedValueOnce({
      data: [{ id: 't-1', title: 'NDA', slug: 'nda-abc123' }],
      total: 1,
      page: 1,
      limit: 20,
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { data: unknown[]; total: number } = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes query params to listTemplates', async () => {
    mockListTemplates.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    await app.request('/templates?search=nda&page=1&limit=10', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(mockListTemplates).toHaveBeenCalledOnce();
  });

  it('validates response matches list response shape', async () => {
    const { templateSchema } = await import('@legalcode/shared');
    const listResponseSchema = z.object({
      data: z.array(templateSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    });

    mockListTemplates.mockResolvedValueOnce({
      data: [
        {
          id: 't-1',
          title: 'NDA',
          slug: 'nda-abc123',
          displayId: 'TEM-AAA-001',
          category: 'contracts',
          description: null,
          country: null,
          currentVersion: 1,
          createdBy: 'user-1',
          createdAt: '2026-03-06T00:00:00Z',
          updatedAt: '2026-03-06T00:00:00Z',
          deletedAt: null,
          deletedBy: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = listResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── GET /templates/:id ────────────────────────────────────────────────

describe('GET /templates/:id', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    mockGetTemplate.mockResolvedValueOnce(null);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-nonexistent', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with template data', async () => {
    mockGetTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'NDA', slug: 'nda-abc123' },
      content: '# NDA',
      changeSummary: null,
      tags: ['contract'],
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { template: { id: string } } = await res.json();
    expect(body.template.id).toBe('t-1');
  });

  it('validates response matches template detail shape', async () => {
    const { templateSchema } = await import('@legalcode/shared');
    const templateDetailSchema = z.object({
      template: templateSchema,
      content: z.string(),
      changeSummary: z.string().nullable(),
      tags: z.array(z.string()),
    });

    mockGetTemplate.mockResolvedValueOnce({
      template: {
        id: 't-1',
        title: 'NDA',
        slug: 'nda-abc123',
        displayId: 'TEM-AAA-001',
        category: 'contracts',
        description: null,
        country: null,
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
        deletedAt: null,
        deletedBy: null,
      },
      content: '# NDA',
      changeSummary: null,
      tags: ['contract'],
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = templateDetailSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── GET /templates/:id/versions ───────────────────────────────────────

describe('GET /templates/:id/versions', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/versions');
    expect(res.status).toBe(401);
  });

  it('returns 200 with versions list', async () => {
    mockGetTemplateVersions.mockResolvedValueOnce([
      { id: 'v-1', templateId: 't-1', version: 2 },
      { id: 'v-2', templateId: 't-1', version: 1 },
    ]);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/versions', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { versions: unknown[] } = await res.json();
    expect(body.versions).toHaveLength(2);
  });

  it('validates response matches versions list shape', async () => {
    const versionSchema = z.object({
      id: z.string(),
      templateId: z.string(),
      version: z.number(),
      content: z.string(),
      changeSummary: z.string().nullable(),
      createdBy: z.string(),
      createdAt: z.string(),
    });
    const versionsResponseSchema = z.object({
      versions: z.array(versionSchema),
    });

    mockGetTemplateVersions.mockResolvedValueOnce([
      {
        id: 'v-1',
        templateId: 't-1',
        version: 2,
        content: '# V2',
        changeSummary: 'Update',
        createdBy: 'user-1',
        createdAt: '2026-03-07T00:00:00Z',
      },
      {
        id: 'v-2',
        templateId: 't-1',
        version: 1,
        content: '# V1',
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: '2026-03-06T00:00:00Z',
      },
    ]);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/versions', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = versionsResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── GET /templates/:id/versions/:version ──────────────────────────────

describe('GET /templates/:id/versions/:version', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/versions/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when version not found', async () => {
    mockGetTemplateVersion.mockResolvedValueOnce(null);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/versions/99', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with version data', async () => {
    mockGetTemplateVersion.mockResolvedValueOnce({
      id: 'v-1',
      templateId: 't-1',
      version: 1,
      content: '# NDA',
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/versions/1', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { version: { version: number } } = await res.json();
    expect(body.version.version).toBe(1);
  });

  it('validates response matches single version shape', async () => {
    const singleVersionResponseSchema = z.object({
      version: z.object({
        id: z.string(),
        templateId: z.string(),
        version: z.number(),
        content: z.string(),
        changeSummary: z.string().nullable(),
        createdBy: z.string(),
        createdAt: z.string(),
      }),
    });

    mockGetTemplateVersion.mockResolvedValueOnce({
      id: 'v-1',
      templateId: 't-1',
      version: 1,
      content: '# NDA',
      changeSummary: 'Initial version',
      createdBy: 'user-1',
      createdAt: '2026-03-06T00:00:00Z',
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/versions/1', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = singleVersionResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── GET /templates/:id/download ───────────────────────────────────────

describe('GET /templates/:id/download', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/download');
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    mockDownloadTemplate.mockResolvedValueOnce(null);

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/download', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns markdown with correct headers', async () => {
    mockDownloadTemplate.mockResolvedValueOnce({
      filename: 'nda-abc123.md',
      content: '# NDA\n\nThis is a template.',
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/download', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="nda-abc123.md"');
    const text = await res.text();
    expect(text).toBe('# NDA\n\nThis is a template.');
  });
});

// ── POST /templates ───────────────────────────────────────────────────

describe('POST /templates', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', category: 'Legal', content: '# Test' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test', category: 'Legal', content: '# Test' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '', category: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 on success for admin', async () => {
    mockCreateTemplate.mockResolvedValueOnce({
      template: {
        id: 't-new',
        title: 'NDA',
        slug: 'nda-abc123',
        deletedAt: null,
        deletedBy: null,
      },
      tags: ['contract'],
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'NDA',
        category: 'Legal',
        content: '# NDA',
        tags: ['contract'],
      }),
    });
    expect(res.status).toBe(201);
    const body: { template: { id: string }; tags: string[] } = await res.json();
    expect(body.template.id).toBe('t-new');
    expect(body.tags).toEqual(['contract']);
  });

  it('returns 400 with validation details for empty category', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Template',
        category: '',
        content: '# Test',
      }),
    });
    expect(res.status).toBe(400);
    const body: Record<string, unknown> = await res.json();
    expect(body.error).toBe('Invalid input');
    expect(body.details).toBeDefined();
  });

  it('POST success response matches createTemplateResponseSchema', async () => {
    const { createTemplateResponseSchema } = await import('@legalcode/shared');

    mockCreateTemplate.mockResolvedValueOnce({
      template: {
        id: 't-new',
        title: 'Test',
        slug: 'test-abc',
        displayId: 'TEM-AAA-001',
        category: 'Employment',
        description: null,
        country: null,
        currentVersion: 1,
        createdBy: 'editor-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
        deletedAt: null,
        deletedBy: null,
      },
      tags: ['employment'],
    });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test',
        category: 'Employment',
        content: '# Test content',
      }),
    });
    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    const parsed = createTemplateResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it('returns 500 when createTemplate returns db_error', async () => {
    mockCreateTemplate.mockResolvedValueOnce({
      error: 'db_error',
      message: 'D1_ERROR: constraint violation',
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test',
        category: 'Legal',
        content: '# Test',
      }),
    });
    expect(res.status).toBe(500);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when createTemplate throws unexpectedly', async () => {
    mockCreateTemplate.mockRejectedValueOnce(new Error('unexpected'));

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test',
        category: 'Legal',
        content: '# Test',
      }),
    });
    expect(res.status).toBe(500);
  });

  it('returns 201 on success for editor', async () => {
    mockCreateTemplate.mockResolvedValueOnce({
      template: {
        id: 't-new',
        title: 'NDA',
        slug: 'nda-abc123',
        deletedAt: null,
        deletedBy: null,
      },
      tags: [],
    });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'NDA', category: 'Legal', content: '# NDA' }),
    });
    expect(res.status).toBe(201);
  });
});

// ── PATCH /templates/:id ──────────────────────────────────────────────

describe('PATCH /templates/:id', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid input', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when template not found', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-nonexistent', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when template is deleted', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({ error: 'deleted' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Cannot update deleted template');
  });

  it('returns 200 on success', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'Updated', slug: 'nda-abc123' },
      tags: ['contract'],
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body: { template: { title: string } } = await res.json();
    expect(body.template.title).toBe('Updated');
  });

  it('PATCH success response includes template and tags', async () => {
    const { templateSchema } = await import('@legalcode/shared');

    mockUpdateTemplate.mockResolvedValueOnce({
      template: {
        id: 't-1',
        title: 'Updated',
        slug: 'updated-abc',
        displayId: 'TEM-AAA-001',
        category: 'NDA',
        description: null,
        country: null,
        currentVersion: 1,
        createdBy: 'editor-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
        deletedAt: null,
        deletedBy: null,
      },
      tags: ['nda'],
    });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body: { template: unknown; tags: unknown } = await res.json();
    expect(body.tags).toBeDefined();
    const parsed = templateSchema.safeParse(body.template);
    expect(parsed.success).toBe(true);
  });

  it('calls DO /invalidate after successful update when TEMPLATE_SESSION is available', async () => {
    const mockStubFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const mockDoStub = { fetch: mockStubFetch };
    const mockTemplateSession = {
      idFromName: vi.fn().mockReturnValue('do-id-t-1'),
      get: vi.fn().mockReturnValue(mockDoStub),
    };

    mockUpdateTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'Updated', slug: 'updated-abc' },
      tags: [],
    });

    const { templateRoutes } = await import('../../src/routes/templates.js');
    const { errorHandler } = await import('../../src/middleware/error.js');
    const app = new Hono<AppEnv>();

    const waitUntilMock = vi.fn();

    app.use('*', async (c, next) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!c.env) {
        // @ts-expect-error -- env is undefined in test context
        c.env = {};
      }
      const env = c.env as Record<string, unknown>;
      env.JWT_SECRET = JWT_SECRET;
      env.DB = {};
      env.TEMPLATE_SESSION = mockTemplateSession;
      Object.defineProperty(c, 'executionCtx', {
        value: { waitUntil: waitUntilMock },
        writable: true,
      });
      await next();
    });
    app.onError(errorHandler);
    app.route('/templates', templateRoutes);

    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });

    expect(res.status).toBe(200);

    // waitUntil should have been called (at least for audit log and DO invalidate)
    expect(waitUntilMock).toHaveBeenCalled();

    // The DO stub should have been retrieved for template t-1
    expect(mockTemplateSession.idFromName).toHaveBeenCalledWith('t-1');
    expect(mockTemplateSession.get).toHaveBeenCalled();
  });

  it('succeeds without calling DO invalidate when TEMPLATE_SESSION is not in env', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'Updated', slug: 'updated-abc' },
      tags: [],
    });

    // importAndCreateApp does NOT set TEMPLATE_SESSION in env
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    });

    // Should succeed normally even without TEMPLATE_SESSION
    expect(res.status).toBe(200);
  });
});

// ── PATCH /templates/:id/autosave ─────────────────────────────────────

describe('PATCH /templates/:id/autosave', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin with valid body', async () => {
    mockSaveContent.mockResolvedValueOnce({
      updatedAt: '2026-03-08T00:00:00.000Z',
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(200);
    const body: { updatedAt: string } = await res.json();
    expect(body.updatedAt).toBe('2026-03-08T00:00:00.000Z');
  });

  it('returns 200 for editor with valid body', async () => {
    mockSaveContent.mockResolvedValueOnce({
      updatedAt: '2026-03-08T00:00:00.000Z',
    });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 when template not found', async () => {
    mockSaveContent.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template not found');
  });

  it('returns 409 when template is deleted', async () => {
    mockSaveContent.mockResolvedValueOnce({ error: 'deleted' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Draft content' }),
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is deleted');
  });

  it('returns 400 for invalid body (empty content)', async () => {
    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
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

  it('validates response matches autosaveResponseSchema', async () => {
    const { autosaveResponseSchema } = await import('@legalcode/shared');

    mockSaveContent.mockResolvedValueOnce({
      updatedAt: '2026-03-08T12:00:00.000Z',
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/autosave', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '# Autosaved content' }),
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = autosaveResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── DELETE /templates/:id (soft delete) ───────────────────────────────

describe('DELETE /templates/:id', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockDeleteTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template not found');
  });

  it('returns 409 when already deleted', async () => {
    mockDeleteTemplate.mockResolvedValueOnce({ error: 'already_deleted' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is already deleted');
  });

  it('returns 200 on success for admin', async () => {
    mockDeleteTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { success: boolean } = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 200 on success for editor', async () => {
    mockDeleteTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('validates delete response matches success shape', async () => {
    const successResponseSchema = z.object({ success: z.literal(true) });

    mockDeleteTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = successResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── POST /templates/:id/restore ───────────────────────────────────────

describe('POST /templates/:id/restore', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/restore', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockRestoreTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template not found');
  });

  it('returns 409 when template is not deleted', async () => {
    mockRestoreTemplate.mockResolvedValueOnce({ error: 'not_deleted' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is not deleted');
  });

  it('returns 200 on success', async () => {
    mockRestoreTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { success: boolean } = await res.json();
    expect(body.success).toBe(true);
  });

  it('validates restore response matches success shape', async () => {
    const successResponseSchema = z.object({ success: z.literal(true) });

    mockRestoreTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/restore', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = successResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── DELETE /templates/:id/permanent ───────────────────────────────────

describe('DELETE /templates/:id/permanent', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/permanent', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/t-1/permanent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/permanent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockHardDeleteTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/permanent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template not found');
  });

  it('returns 200 on success', async () => {
    mockHardDeleteTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/permanent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { success: boolean } = await res.json();
    expect(body.success).toBe(true);
  });

  it('validates hard delete response matches success shape', async () => {
    const successResponseSchema = z.object({ success: z.literal(true) });

    mockHardDeleteTemplate.mockResolvedValueOnce({ success: true });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/permanent', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = successResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});

// ── GET /templates/trash ──────────────────────────────────────────────

describe('GET /templates/trash', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/trash');
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role', async () => {
    const app = await importAndCreateApp();
    const token = await editorToken();
    const res = await app.request('/templates/trash', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/trash', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 with deleted templates for admin', async () => {
    mockListDeletedTemplates.mockResolvedValueOnce([
      { id: 't-1', title: 'Deleted NDA', deletedAt: '2026-02-01T00:00:00.000Z' },
    ]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/trash', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { data: unknown[] } = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns empty list when no deleted templates', async () => {
    mockListDeletedTemplates.mockResolvedValueOnce([]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/trash', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { data: unknown[] } = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('validates trash response matches list shape', async () => {
    const { templateSchema } = await import('@legalcode/shared');
    const trashResponseSchema = z.object({
      data: z.array(templateSchema),
    });

    mockListDeletedTemplates.mockResolvedValueOnce([
      {
        id: 't-1',
        title: 'Deleted NDA',
        slug: 'nda-abc123',
        displayId: 'TEM-AAA-001',
        category: 'contracts',
        description: null,
        country: null,
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
        deletedAt: '2026-03-08T00:00:00Z',
        deletedBy: 'admin-1',
      },
    ]);

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/trash', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = trashResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
