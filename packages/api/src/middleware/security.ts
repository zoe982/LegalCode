import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env.js';

export const securityHeaders = createMiddleware<AppEnv>(async (c, next): Promise<void> => {
  await next();

  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cache-Control', 'no-store');
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
});
