import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import type { AppEnv } from '../types/env.js';

const requestTimestampsSchema = z.array(z.number());

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

    const key = `ratelimit:${config.prefix}:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - config.windowSeconds;

    // Get current count from KV
    const stored = await c.env.AUTH_KV.get(key);
    let requests: number[] = [];

    if (stored) {
      try {
        requests = requestTimestampsSchema.parse(JSON.parse(stored));
      } catch {
        requests = [];
      }
    }

    // Filter to current window
    requests = requests.filter((t) => t > windowStart);

    if (requests.length >= config.maxRequests) {
      // requests[0] is guaranteed to exist since requests.length >= config.maxRequests
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above guarantees element exists
      const retryAfter = config.windowSeconds - (now - requests[0]!);
      c.header('Retry-After', String(retryAfter));
      c.res = c.json({ error: 'Too many requests' }, 429);
      return;
    }

    // Add current request
    requests.push(now);
    await c.env.AUTH_KV.put(key, JSON.stringify(requests), {
      expirationTtl: config.windowSeconds,
    });

    await next();
  });
}
