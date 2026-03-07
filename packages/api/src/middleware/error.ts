import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types/env.js';
import { logError } from '../services/error-log.js';

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

  // Fire-and-forget error logging to D1
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env?.DB) {
    void logError(c.env.DB, {
      source: 'backend',
      severity: status >= 502 ? 'critical' : 'error',
      message: err.message,
      stack: err.stack ?? null,
      metadata: JSON.stringify({ method: c.req.method, path: c.req.path, status }),
      url: c.req.path,
    });
  }

  return c.json({ error: 'Internal server error' }, status);
};
