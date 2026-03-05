import { http, HttpResponse } from 'msw';
import type { Template, TemplateVersion } from '@legalcode/shared';

const mockTemplates: Template[] = [
  {
    id: 't1',
    title: 'Employment Agreement',
    slug: 'employment-agreement-abc123',
    category: 'Employment',
    country: 'US',
    status: 'active',
    currentVersion: 2,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 't2',
    title: 'Mutual NDA',
    slug: 'mutual-nda-def456',
    category: 'NDA',
    country: null,
    status: 'active',
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 't3',
    title: 'Offer Letter',
    slug: 'offer-letter-ghi789',
    category: 'Employment',
    country: 'UK',
    status: 'draft',
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

const mockVersions: TemplateVersion[] = [
  {
    id: 'v1',
    templateId: 't1',
    version: 1,
    content: '# v1',
    changeSummary: 'Initial',
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v2',
    templateId: 't1',
    version: 2,
    content: '# v2',
    changeSummary: 'Updated clause 3',
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

export const handlers = [
  http.get('/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('/auth/me', () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  http.post('/auth/logout', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post('/auth/refresh', () => {
    return HttpResponse.json({ ok: true });
  }),

  // Template handlers
  http.get('/templates', () => {
    return HttpResponse.json({
      templates: mockTemplates,
      total: 3,
      page: 1,
      limit: 20,
    });
  }),

  http.get('/templates/:id/versions/:version', ({ params }) => {
    const version = mockVersions.find(
      (v) => v.templateId === params.id && v.version === Number(params.version),
    );
    if (!version) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ version });
  }),

  http.get('/templates/:id/versions', ({ params }) => {
    const versions = mockVersions.filter((v) => v.templateId === params.id);
    return HttpResponse.json({ versions });
  }),

  http.get('/templates/:id/download', () => {
    return new HttpResponse('# Employment Agreement\n\nThis agreement...', {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="employment-agreement.md"',
      },
    });
  }),

  http.get('/templates/:id', ({ params }) => {
    const template = mockTemplates.find((t) => t.id === params.id);
    if (!template) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      template,
      content: '# Employment Agreement\n\nThis agreement...',
      changeSummary: null,
      tags: ['employment', 'us'],
    });
  }),

  http.post('/templates', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created: Template = {
      id: 'new-1',
      title: (body.title as string) || 'New Template',
      slug: 'new-template-xyz',
      category: (body.category as string) || 'General',
      country: (body.country as string | null) ?? null,
      status: 'draft',
      currentVersion: 1,
      createdBy: 'u1',
      createdAt: '2026-03-06T00:00:00Z',
      updatedAt: '2026-03-06T00:00:00Z',
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('/templates/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const template = mockTemplates.find((t) => t.id === params.id);
    if (!template) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...template,
      ...body,
      updatedAt: '2026-03-06T00:00:00Z',
    });
  }),

  http.post('/templates/:id/publish', ({ params }) => {
    const template = mockTemplates.find((t) => t.id === params.id);
    if (!template) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...template,
      status: 'active',
      updatedAt: '2026-03-06T00:00:00Z',
    });
  }),

  http.post('/templates/:id/archive', ({ params }) => {
    const template = mockTemplates.find((t) => t.id === params.id);
    if (!template) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...template,
      status: 'archived',
      updatedAt: '2026-03-06T00:00:00Z',
    });
  }),
];
