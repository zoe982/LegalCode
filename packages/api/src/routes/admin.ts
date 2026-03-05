import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { UserService } from '../services/user.js';
import { createUserSchema, updateUserRoleSchema } from '@legalcode/shared';

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', requireRole('admin'));

adminRoutes.get('/users', async (c) => {
  const userService = new UserService(c.env.DB);
  const users = await userService.listAll();
  return c.json({ users });
});

adminRoutes.post('/users', async (c) => {
  const body: unknown = await c.req.json();
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const userService = new UserService(c.env.DB);
  const user = await userService.create(result.data);
  return c.json({ user }, 201);
});

adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const result = updateUserRoleSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const userService = new UserService(c.env.DB);
  await userService.updateRole(id, result.data.role);
  return c.json({ ok: true });
});

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const userService = new UserService(c.env.DB);
  await userService.deactivate(id);
  return c.json({ ok: true });
});
