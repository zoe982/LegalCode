import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env.js';
import { verifyJWT } from '../services/auth.js';
import type { Role } from '@legalcode/shared';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next): Promise<void> => {
  const token = getCookie(c, '__Host-auth');
  if (!token) {
    c.res = c.json({ error: 'Authentication required' }, 401);
    return;
  }
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    await next();
  } catch {
    c.res = c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next): Promise<void> => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      c.res = c.json({ error: 'Insufficient permissions' }, 403);
      return;
    }
    await next();
  });
}
