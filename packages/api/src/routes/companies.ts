import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { companies } from '../db/schema.js';
import { createCompanySchema, updateCompanySchema } from '@legalcode/shared';
import { logError } from '../services/error-log.js';

export const companyRoutes = new Hono<AppEnv>();

companyRoutes.use('*', authMiddleware);

companyRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const result = await db.select().from(companies);
  return c.json({ companies: result });
});

companyRoutes.post('/', requireRole('admin'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [company] = await db
      .insert(companies)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return c.json({ company }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Company already exists' }, 409);
    }
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 500,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        path: '/api/companies',
        method: 'POST',
      }),
    );
    void logError(c.env.DB, {
      source: 'backend',
      severity: 'error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
      url: '/api/companies',
      userId: c.get('user').id,
    }).catch(console.error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

companyRoutes.put('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [company] = await db
      .update(companies)
      .set({ name: parsed.data.name })
      .where(eq(companies.id, id))
      .returning();
    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }
    return c.json({ company });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Company name already exists' }, 409);
    }
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 500,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        path: `/api/companies/${id}`,
        method: 'PUT',
      }),
    );
    void logError(c.env.DB, {
      source: 'backend',
      severity: 'error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
      url: `/api/companies/${id}`,
      userId: c.get('user').id,
    }).catch(console.error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

companyRoutes.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  try {
    const [deleted] = await db.delete(companies).where(eq(companies.id, id)).returning();
    if (!deleted) {
      return c.json({ error: 'Company not found' }, 404);
    }
    return c.json({ ok: true });
  } catch (err: unknown) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 500,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        path: `/api/companies/${id}`,
        method: 'DELETE',
      }),
    );
    void logError(c.env.DB, {
      source: 'backend',
      severity: 'error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
      url: `/api/companies/${id}`,
      userId: c.get('user').id,
    }).catch(console.error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
