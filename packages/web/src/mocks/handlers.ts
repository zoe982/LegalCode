import { http, HttpResponse } from 'msw';
import type { Template, TemplateVersion } from '@legalcode/shared';
import type { Comment } from '../types/comments.js';

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

const mockComments: Comment[] = [
  {
    id: 'c1',
    templateId: 't1',
    parentId: null,
    authorId: 'u1',
    authorName: 'Joseph Marsico',
    authorEmail: 'joseph.marsico@acasus.com',
    content: 'Should we add a non-compete clause here?',
    anchorBlockId: 'block-3',
    anchorText: 'the parties agree to the following terms',
    resolved: false,
    resolvedBy: null,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'c2',
    templateId: 't1',
    parentId: 'c1',
    authorId: 'u2',
    authorName: 'Legal Reviewer',
    authorEmail: 'reviewer@acasus.com',
    content: 'Yes, I think that would strengthen this section.',
    anchorBlockId: null,
    anchorText: null,
    resolved: false,
    resolvedBy: null,
    createdAt: '2026-03-01T11:30:00Z',
    updatedAt: '2026-03-01T11:30:00Z',
  },
  {
    id: 'c3',
    templateId: 't1',
    parentId: null,
    authorId: 'u2',
    authorName: 'Legal Reviewer',
    authorEmail: 'reviewer@acasus.com',
    content: 'Typo in the preamble — "agrrement" should be "agreement".',
    anchorBlockId: 'block-1',
    anchorText: 'This agrrement',
    resolved: true,
    resolvedBy: 'u1',
    createdAt: '2026-02-28T09:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
];

let commentIdCounter = 4;

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
  http.get('/admin/errors', () => {
    return HttpResponse.json({ errors: [] });
  }),
  http.post('/admin/errors', () => {
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

  // Comment handlers
  http.get('/api/templates/:id/comments', ({ params }) => {
    const comments = mockComments.filter((c) => c.templateId === params.id);
    return HttpResponse.json(comments);
  }),

  http.post('/api/templates/:id/comments', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newComment: Comment = {
      id: `c${String(commentIdCounter++)}`,
      templateId: params.id as string,
      parentId: (body.parentId as string | null) ?? null,
      authorId: 'u1',
      authorName: 'Joseph Marsico',
      authorEmail: 'joseph.marsico@acasus.com',
      content: (body.content as string) || '',
      anchorBlockId: (body.anchorBlockId as string | null) ?? null,
      anchorText: (body.anchorText as string | null) ?? null,
      resolved: false,
      resolvedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockComments.push(newComment);
    return HttpResponse.json(newComment, { status: 201 });
  }),

  http.patch('/api/templates/:id/comments/:commentId/resolve', ({ params }) => {
    const comment = mockComments.find(
      (c) => c.templateId === params.id && c.id === params.commentId,
    );
    if (!comment) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    comment.resolved = true;
    comment.resolvedBy = 'u1';
    comment.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('/api/templates/:id/comments/:commentId', ({ params }) => {
    const index = mockComments.findIndex(
      (c) => c.templateId === params.id && c.id === params.commentId,
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    mockComments.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
