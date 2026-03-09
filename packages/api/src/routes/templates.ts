import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
  saveContent,
  deleteTemplate,
  restoreTemplate,
  hardDeleteTemplate,
  listDeletedTemplates,
} from '../services/template.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
  autosaveSchema,
} from '@legalcode/shared';
import { commentRoutes } from './comments.js';
import { logAudit } from '../services/audit-log.js';

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

// GET /trash must be registered BEFORE GET /:id to avoid /:id matching "trash"
templateRoutes.get('/trash', requireRole('admin'), async (c) => {
  const db = getDb(c.env.DB);
  const result = await listDeletedTemplates(db);
  return c.json({ data: result });
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
  if ('error' in result) {
    throw new HTTPException(500, { message: `createTemplate failed: ${result.message}` });
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.create',
      resourceType: 'template',
      resourceId: result.template.id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
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
    return c.json({ error: 'Cannot update deleted template' }, 409);
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.update',
      resourceType: 'template',
      resourceId: id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
  return c.json(result);
});

templateRoutes.patch('/:id/autosave', requireRole('admin', 'editor'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = autosaveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await saveContent(db, id, parsed.data.content, parsed.data.title);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    return c.json({ error: 'Template is deleted' }, 409);
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.autosave',
      resourceType: 'template',
      resourceId: id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
  return c.json({ updatedAt: result.updatedAt });
});

// ── Delete routes ─────────────────────────────────────────────────────

templateRoutes.delete('/:id', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await deleteTemplate(db, id, user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    return c.json({ error: 'Template is already deleted' }, 409);
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.delete',
      resourceType: 'template',
      resourceId: id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
  return c.json({ success: true });
});

templateRoutes.post('/:id/restore', requireRole('admin'), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await restoreTemplate(db, id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    return c.json({ error: 'Template is not deleted' }, 409);
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.restore',
      resourceType: 'template',
      resourceId: id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
  return c.json({ success: true });
});

templateRoutes.delete('/:id/permanent', requireRole('admin'), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const result = await hardDeleteTemplate(db, id);
  if ('error' in result) {
    return c.json({ error: 'Template not found' }, 404);
  }
  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'template.hard_delete',
      resourceType: 'template',
      resourceId: id,
      userId: user.id,
      userEmail: user.email,
    }),
  );
  return c.json({ success: true });
});

// ── Comment sub-routes ────────────────────────────────────────────────
templateRoutes.route('/:id/comments', commentRoutes);
