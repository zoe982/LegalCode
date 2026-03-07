import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { listAllUsers, createUser, updateUserRole, deactivateUser } from '../services/user.js';
import { listErrors, resolveError } from '../services/error-log.js';
import {
  createUserSchema,
  updateUserRoleSchema,
  errorQuerySchema,
  addAllowedEmailSchema,
} from '@legalcode/shared';
import { getAllowedEmails, addAllowedEmail, removeAllowedEmail } from '../services/auth.js';

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

adminRoutes.get('/errors', async (c) => {
  const queryResult = errorQuerySchema.safeParse({
    source: c.req.query('source'),
    status: c.req.query('status'),
    severity: c.req.query('severity'),
  });
  // Strip undefined values — only pass defined filters
  const filters = queryResult.success ? queryResult.data : {};
  const db = getDb(c.env.DB);
  const errors = await listErrors(db, filters);
  return c.json({ errors });
});

adminRoutes.patch('/errors/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  const found = await resolveError(db, id, c.get('user').id);
  if (!found) {
    return c.json({ error: 'Error not found' }, 404);
  }
  return c.json({ ok: true });
});

adminRoutes.get('/allowed-emails', async (c) => {
  const emails = await getAllowedEmails(c.env.AUTH_KV, c.env.ALLOWED_EMAILS);
  return c.json({ emails });
});

adminRoutes.post('/allowed-emails', async (c) => {
  const body: unknown = await c.req.json();
  const result = addAllowedEmailSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const emails = await addAllowedEmail(c.env.AUTH_KV, c.env.ALLOWED_EMAILS, result.data.email);
  return c.json({ emails });
});

adminRoutes.delete('/allowed-emails/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email'));
  const emails = await removeAllowedEmail(c.env.AUTH_KV, c.env.ALLOWED_EMAILS, email);
  return c.json({ emails });
});
