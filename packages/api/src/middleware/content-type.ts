import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env.js';

export const requireJsonContentType = createMiddleware<AppEnv>(async (c, next): Promise<void> => {
  const method = c.req.method;

  // Only enforce on methods that typically have a body
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
    await next();
    return;
  }

  // Skip if there's no body (e.g., PATCH /resolve with empty body)
  // Cloudflare Workers may represent bodyless requests as empty ReadableStream instead of null,
  // so also check Content-Length header as a fallback
  const contentLength = c.req.header('Content-Length');
  if (c.req.raw.body === null || !contentLength || contentLength === '0') {
    await next();
    return;
  }

  // Skip WebSocket upgrades
  if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
    await next();
    return;
  }

  const contentType = c.req.header('Content-Type');
  if (!contentType?.includes('application/json')) {
    c.res = c.json({ error: 'Content-Type must be application/json' }, 415);
    return;
  }

  await next();
});
