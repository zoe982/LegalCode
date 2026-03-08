import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));

vi.mock('../../src/services/audit-log.js', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockCreateTemplate = vi.fn();
const mockListTemplates = vi.fn();
const mockGetTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockPublishTemplate = vi.fn();
const mockArchiveTemplate = vi.fn();
const mockUnarchiveTemplate = vi.fn();
const mockGetTemplateVersions = vi.fn();
const mockGetTemplateVersion = vi.fn();
const mockDownloadTemplate = vi.fn();
const mockSaveDraftContent = vi.fn();

vi.mock('../../src/services/template.js', () => ({
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args) as unknown,
  listTemplates: (...args: unknown[]) => mockListTemplates(...args) as unknown,
  getTemplate: (...args: unknown[]) => mockGetTemplate(...args) as unknown,
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args) as unknown,
  publishTemplate: (...args: unknown[]) => mockPublishTemplate(...args) as unknown,
  archiveTemplate: (...args: unknown[]) => mockArchiveTemplate(...args) as unknown,
  unarchiveTemplate: (...args: unknown[]) => mockUnarchiveTemplate(...args) as unknown,
  getTemplateVersions: (...args: unknown[]) => mockGetTemplateVersions(...args) as unknown,
  getTemplateVersion: (...args: unknown[]) => mockGetTemplateVersion(...args) as unknown,
  downloadTemplate: (...args: unknown[]) => mockDownloadTemplate(...args) as unknown,
  saveDraftContent: (...args: unknown[]) => mockSaveDraftContent(...args) as unknown,
}));

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

async function importAndCreateApp() {
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
    // Mock executionCtx for fire-and-forget audit logging
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

// ── GET /templates ────────────────────────────────────────────────────

describe('GET /templates', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates');
    expect(res.status).toBe(401);
  });

  it('returns 200 with template list for authenticated user', async () => {
    mockListTemplates.mockResolvedValueOnce({
      templates: [{ id: 't-1', title: 'NDA', slug: 'nda-abc123', status: 'draft' }],
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
    const body: { templates: unknown[]; total: number } = await res.json();
    expect(body.templates).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes query params to listTemplates', async () => {
    mockListTemplates.mockResolvedValueOnce({
      templates: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const app = await importAndCreateApp();
    const token = await viewerToken();
    await app.request('/templates?search=nda&status=draft&page=1&limit=10', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(mockListTemplates).toHaveBeenCalledOnce();
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
      template: { id: 't-1', title: 'NDA', slug: 'nda-abc123', status: 'draft' },
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
      template: { id: 't-new', title: 'NDA', slug: 'nda-abc123', status: 'draft' },
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
        category: 'Employment',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'editor-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
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

  it('returns 201 on success for editor', async () => {
    mockCreateTemplate.mockResolvedValueOnce({
      template: { id: 't-new', title: 'NDA', slug: 'nda-abc123', status: 'draft' },
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

  it('returns 409 when template is archived', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({ error: 'archived' });

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
  });

  it('returns 200 on success', async () => {
    mockUpdateTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'Updated', slug: 'nda-abc123', status: 'draft' },
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
        category: 'NDA',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'editor-1',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-06T00:00:00Z',
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
});

// ── POST /templates/:id/publish ───────────────────────────────────────

describe('POST /templates/:id/publish', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/publish', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/publish', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockPublishTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/publish', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when already active', async () => {
    mockPublishTemplate.mockResolvedValueOnce({ error: 'already_active' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/publish', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is already active');
  });

  it('returns 409 when archived', async () => {
    mockPublishTemplate.mockResolvedValueOnce({ error: 'archived' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/publish', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Cannot publish archived template');
  });

  it('returns 200 on success', async () => {
    mockPublishTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'NDA', status: 'active' },
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/publish', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { template: { status: string } } = await res.json();
    expect(body.template.status).toBe('active');
  });
});

// ── POST /templates/:id/archive ───────────────────────────────────────

describe('POST /templates/:id/archive', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/archive', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/archive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockArchiveTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/archive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when already archived', async () => {
    mockArchiveTemplate.mockResolvedValueOnce({ error: 'already_archived' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/archive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is already archived');
  });

  it('returns 200 on success', async () => {
    mockArchiveTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'NDA', status: 'archived' },
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/archive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { template: { status: string } } = await res.json();
    expect(body.template.status).toBe('archived');
  });
});

// ── POST /templates/:id/unarchive ─────────────────────────────────────

describe('POST /templates/:id/unarchive', () => {
  it('returns 401 without auth cookie', async () => {
    const app = await importAndCreateApp();
    const res = await app.request('/templates/t-1/unarchive', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const app = await importAndCreateApp();
    const token = await viewerToken();
    const res = await app.request('/templates/t-1/unarchive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockUnarchiveTemplate.mockResolvedValueOnce({ error: 'not_found' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/unarchive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when template is not archived', async () => {
    mockUnarchiveTemplate.mockResolvedValueOnce({ error: 'not_archived' });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/unarchive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(409);
    const body: { error: string } = await res.json();
    expect(body.error).toBe('Template is not archived');
  });

  it('returns 200 on success', async () => {
    mockUnarchiveTemplate.mockResolvedValueOnce({
      template: { id: 't-1', title: 'NDA', status: 'draft' },
    });

    const app = await importAndCreateApp();
    const token = await adminToken();
    const res = await app.request('/templates/t-1/unarchive', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body: { template: { status: string } } = await res.json();
    expect(body.template.status).toBe('draft');
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
    mockSaveDraftContent.mockResolvedValueOnce({
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
    mockSaveDraftContent.mockResolvedValueOnce({
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
    mockSaveDraftContent.mockResolvedValueOnce({ error: 'not_found' });

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

  it('returns 409 when template is not draft', async () => {
    mockSaveDraftContent.mockResolvedValueOnce({ error: 'not_draft' });

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
    expect(body.error).toBe('Template is not a draft');
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

  it('validates response matches autosaveDraftResponseSchema', async () => {
    const { autosaveDraftResponseSchema } = await import('@legalcode/shared');

    mockSaveDraftContent.mockResolvedValueOnce({
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
    const parsed = autosaveDraftResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
