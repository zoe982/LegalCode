import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware } from '../middleware/auth.js';
import { logError } from '../services/error-log.js';
import { reportErrorSchema } from '@legalcode/shared';

export const errorRoutes = new Hono<AppEnv>();

errorRoutes.use('*', authMiddleware);

errorRoutes.post('/report', async (c) => {
  const body: unknown = await c.req.json();
  const result = reportErrorSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400);
  }
  const { errorId } = await logError(c.env.DB, {
    ...result.data,
    userId: c.get('user').id,
  });
  return c.json({ ok: true, errorId });
});
