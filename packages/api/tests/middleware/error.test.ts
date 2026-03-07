import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { errorHandler } from '../../src/middleware/error.js';
import type { AppEnv } from '../../src/types/env.js';

const mockLogError = vi.fn().mockResolvedValue({ errorId: 'err-mock' });

vi.mock('../../src/services/error-log.js', () => ({
  logError: (...args: unknown[]) => mockLogError(...args) as unknown,
}));

function createMockD1(): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

function createTestApp(withDb = false) {
  const app = new Hono<AppEnv>();
  if (withDb) {
    app.use('*', async (c, next) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!c.env) {
        // @ts-expect-error -- env is undefined in test context
        c.env = {};
      }
      const env = c.env as Record<string, unknown>;
      env.DB = createMockD1();
      await next();
    });
  }
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

  it('calls logError for 500 errors when DB is available', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/fail', () => {
      throw new Error('server crash');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/fail');

    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'server crash',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('sets severity to critical for status >= 502', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/bad-gateway', () => {
      throw new HTTPException(502, { message: 'Upstream failed' });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/bad-gateway');

    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'critical',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('does not call logError when DB is not available', async () => {
    mockLogError.mockClear();
    const app = createTestApp(false);
    app.get('/fail', () => {
      throw new Error('no db');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/fail');

    expect(mockLogError).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not call logError for 4xx errors', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/bad', () => {
      throw new HTTPException(400, { message: 'Bad request' });
    });

    await app.request('/bad');

    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('calls logError with severity error for HTTPException 500 with DB', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/http-500', () => {
      throw new HTTPException(500, { message: 'DB crashed' });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/http-500');

    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'backend',
        severity: 'error',
        message: 'DB crashed',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('passes stack trace to logError when error has stack', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/with-stack', () => {
      const err = new Error('has stack');
      err.stack = 'Error: has stack\n  at /src/handler.ts:10';
      throw err;
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/with-stack');

    const callArgs = mockLogError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs.stack).toContain('Error: has stack');
    consoleSpy.mockRestore();
  });

  it('passes null stack when error has no stack property', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/no-stack', () => {
      const err = new Error('no stack');

      delete (err as unknown as Record<string, unknown>).stack;
      throw err;
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/no-stack');

    const callArgs = mockLogError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs.stack).toBeNull();
    consoleSpy.mockRestore();
  });

  it('includes method, path, and status in logError metadata', async () => {
    mockLogError.mockClear();
    const app = createTestApp(true);
    app.get('/api/test', () => {
      throw new Error('test error');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.request('/api/test');

    const callArgs = mockLogError.mock.calls[0]?.[1] as Record<string, unknown>;
    const metadata = JSON.parse(callArgs.metadata as string) as Record<string, unknown>;
    expect(metadata).toHaveProperty('method', 'GET');
    expect(metadata).toHaveProperty('path', '/api/test');
    expect(metadata).toHaveProperty('status', 500);
    consoleSpy.mockRestore();
  });
});
