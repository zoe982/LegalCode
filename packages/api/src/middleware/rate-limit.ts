import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env.js';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  prefix: string;
}

export function rateLimit(config: RateLimitConfig) {
  return createMiddleware<AppEnv>(async (c, next): Promise<void> => {
    const ip =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
      'unknown';

    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / config.windowSeconds);
    const key = `ratelimit:${config.prefix}:${ip}:${bucket.toString()}`;

    // Get current count from KV
    const stored = await c.env.AUTH_KV.get(key);
    const count = stored ? parseInt(stored, 10) || 0 : 0;

    if (count >= config.maxRequests) {
      const retryAfter = config.windowSeconds - (now % config.windowSeconds);
      c.header('Retry-After', String(retryAfter));
      c.res = c.json({ error: 'Too many requests' }, 429);
      return;
    }

    // Increment counter
    await c.env.AUTH_KV.put(key, String(count + 1), {
      expirationTtl: config.windowSeconds,
    });

    await next();
  });
}
