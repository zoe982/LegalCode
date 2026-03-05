import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types/env.js';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException && err.status < 500) {
    return c.json({ error: err.message }, err.status);
  }

  const status = err instanceof HTTPException ? err.status : 500;

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      message: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    }),
  );

  return c.json({ error: 'Internal server error' }, status);
};
