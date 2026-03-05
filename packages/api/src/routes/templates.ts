import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
} from '../services/template.js';
import { createTemplateSchema, updateTemplateSchema, templateQuerySchema } from '@legalcode/shared';

export const templateRoutes = new Hono<AppEnv>();

// All routes require authentication
templateRoutes.use('*', authMiddleware);

// ── Read routes (all authenticated users) ─────────────────────────────

templateRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const query = templateQuerySchema.parse(c.req.query());
  const result = await listTemplates(db, query);
  return c.json(result);
});

templateRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const result = await getTemplate(db, id);
  if (!result) {
    return c.json({ error: 'Template not found' }, 404);
  }
  return c.json(result);
});

templateRoutes.get('/:id/versions', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const versions = await getTemplateVersions(db, id);
  return c.json({ versions });
});

templateRoutes.get('/:id/versions/:version', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const version = Number(c.req.param('version'));
  const result = await getTemplateVersion(db, id, version);
  if (!result) {
    return c.json({ error: 'Version not found' }, 404);
  }
  return c.json({ version: result });
});

templateRoutes.get('/:id/download', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const result = await downloadTemplate(db, id);
  if (!result) {
    return c.json({ error: 'Template not found' }, 404);
  }
  return new Response(result.content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
});

// ── Write routes (admin + editor only) ────────────────────────────────

templateRoutes.post('/', requireRole('admin', 'editor'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  const user = c.get('user');
  const result = await createTemplate(db, parsed.data, user.id);
  return c.json(result, 201);
});

templateRoutes.patch('/:id', requireRole('admin', 'editor'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await updateTemplate(db, id, parsed.data, user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    return c.json({ error: 'Cannot update archived template' }, 409);
  }
  return c.json(result);
});

templateRoutes.post('/:id/publish', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await publishTemplate(db, id, user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    if (result.error === 'already_active')
      return c.json({ error: 'Template is already active' }, 409);
    return c.json({ error: 'Cannot publish archived template' }, 409);
  }
  return c.json(result);
});

templateRoutes.post('/:id/archive', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await archiveTemplate(db, id, user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    return c.json({ error: 'Template is already archived' }, 409);
  }
  return c.json(result);
});
