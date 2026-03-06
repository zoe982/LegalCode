import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { auditLog } from '../db/schema.js';
import { listAllUsers, createUser, updateUserRole, deactivateUser } from '../services/user.js';
import { logAudit } from '../services/audit.js';
import { createUserSchema, updateUserRoleSchema } from '@legalcode/shared';

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', requireRole('admin'));

adminRoutes.get('/users', async (c) => {
  const db = getDb(c.env.DB);
  const users = await listAllUsers(db);
  return c.json({ users });
});

adminRoutes.post('/users', async (c) => {
  const body: unknown = await c.req.json();
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  const user = await createUser(db, result.data);
  return c.json({ user }, 201);
});

adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const result = updateUserRoleSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const db = getDb(c.env.DB);
  await updateUserRole(db, id, result.data.role);
  return c.json({ ok: true });
});

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  await deactivateUser(db, id);
  return c.json({ ok: true });
});

adminRoutes.post('/errors', async (c) => {
  const body: unknown = await c.req.json();
  const db = getDb(c.env.DB);
  await logAudit(db, {
    userId: c.get('user').id,
    action: 'client_error',
    entityType: 'app',
    entityId: 'frontend',
    metadata: body as Record<string, unknown>,
  });
  return c.json({ ok: true });
});

adminRoutes.get('/errors', async (c) => {
  const db = getDb(c.env.DB);
  const errors = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, 'client_error'))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);
  return c.json({ errors });
});
