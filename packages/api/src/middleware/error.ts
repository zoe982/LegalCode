import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types/env.js';
import { logError } from '../services/error-log.js';

function http4xxDefault(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 415:
      return 'Unsupported media type';
    case 429:
      return 'Too many requests';
    default:
      return 'Request error';
  }
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException && err.status < 500) {
    return c.json({ error: err.message || http4xxDefault(err.status) }, err.status);
  }

  const status = err instanceof HTTPException ? err.status : 500;

  // SECURITY: Do not log request headers — they contain auth tokens and PII
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
