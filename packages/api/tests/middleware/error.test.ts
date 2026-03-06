import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { errorHandler } from '../../src/middleware/error.js';
import type { AppEnv } from '../../src/types/env.js';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns 500 with generic message for unexpected errors', async () => {
    const app = createTestApp();
    app.get('/fail', () => {
      throw new Error('database connection string: postgres://secret');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/fail');

    expect(res.status).toBe(500);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('never exposes stack traces in response body', async () => {
    const app = createTestApp();
    app.get('/fail', () => {
      throw new Error('secret DB error at /src/db/connection.ts:42');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/fail');
    const text = await res.text();

    expect(text).not.toContain('stack');
    expect(text).not.toContain('/src/');
    expect(text).not.toContain('.ts:');
    consoleSpy.mockRestore();
  });

  it('returns 4xx with error message for HTTPException', async () => {
    const app = createTestApp();
    app.get('/bad', () => {
      throw new HTTPException(400, { message: 'Invalid input' });
    });

    const res = await app.request('/bad');
    expect(res.status).toBe(400);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Invalid input' });
  });

  it('returns 404 with error message for HTTPException', async () => {
    const app = createTestApp();
    app.get('/missing', () => {
      throw new HTTPException(404, { message: 'Not found' });
    });

    const res = await app.request('/missing');
    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Not found' });
  });

  it('logs structured error for 500 errors', async () => {
    const app = createTestApp();
    app.get('/fail', () => {
      throw new Error('something broke');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/fail');

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logArg: unknown = consoleSpy.mock.calls[0]?.[0];
    const parsed: Record<string, unknown> = JSON.parse(logArg as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('status', 500);
    expect(parsed).toHaveProperty('message', 'something broke');
    expect(parsed).toHaveProperty('stack');
    expect(parsed).toHaveProperty('path');
    expect(parsed).toHaveProperty('method');
    consoleSpy.mockRestore();
  });

  it('returns generic message for HTTPException with status 500', async () => {
    const app = createTestApp();
    app.get('/server-error', () => {
      throw new HTTPException(500, { message: 'Database crashed' });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/server-error');

    expect(res.status).toBe(500);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
    // Should log structured error for 500 HTTPException
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it('returns generic message for HTTPException with status 502', async () => {
    const app = createTestApp();
    app.get('/bad-gateway', () => {
      throw new HTTPException(502, { message: 'Upstream failed' });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await app.request('/bad-gateway');

    expect(res.status).toBe(502);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('does not log structured error for 4xx errors', async () => {
    const app = createTestApp();
    app.get('/bad', () => {
      throw new HTTPException(422, { message: 'Unprocessable' });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/bad');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
