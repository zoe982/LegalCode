import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { countries } from '../db/schema.js';
import { createCountrySchema, updateCountrySchema } from '@legalcode/shared';

export const countryRoutes = new Hono<AppEnv>();

countryRoutes.use('*', authMiddleware);

countryRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const result = await db.select().from(countries).orderBy(asc(countries.name));
  return c.json({ countries: result });
});

countryRoutes.post('/', requireRole('admin'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = createCountrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [country] = await db
      .insert(countries)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        code: parsed.data.code,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return c.json({ country }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Country already exists' }, 409);
    }
    throw err;
  }
});

countryRoutes.put('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const parsed = updateCountrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const updateData: Record<string, string> = {};
  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
  }
  if (parsed.data.code !== undefined) {
    updateData.code = parsed.data.code;
  }
  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [country] = await db
      .update(countries)
      .set(updateData)
      .where(eq(countries.id, id))
      .returning();
    if (!country) {
      return c.json({ error: 'Country not found' }, 404);
    }
    return c.json({ country });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Country name or code already exists' }, 409);
    }
    throw err;
  }
});

countryRoutes.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  const [deleted] = await db.delete(countries).where(eq(countries.id, id)).returning();
  if (!deleted) {
    return c.json({ error: 'Country not found' }, 404);
  }
  return c.json({ ok: true });
});
