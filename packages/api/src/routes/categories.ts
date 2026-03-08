import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { categories } from '../db/schema.js';
import { createCategorySchema, updateCategorySchema } from '@legalcode/shared';

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.use('*', authMiddleware);

categoryRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const result = await db.select().from(categories);
  return c.json({ categories: result });
});

categoryRoutes.post('/', requireRole('admin'), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [category] = await db
      .insert(categories)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return c.json({ category }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Category already exists' }, 409);
    }
    throw err;
  }
});

categoryRoutes.put('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  try {
    const [category] = await db
      .update(categories)
      .set({ name: parsed.data.name })
      .where(eq(categories.id, id))
      .returning();
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }
    return c.json({ category });
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Category name already exists' }, 409);
    }
    throw err;
  }
});

categoryRoutes.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (!deleted) {
    return c.json({ error: 'Category not found' }, 404);
  }
  return c.json({ ok: true });
});
