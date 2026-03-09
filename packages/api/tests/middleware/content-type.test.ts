import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requireJsonContentType } from '../../src/middleware/content-type.js';
import type { AppEnv } from '../../src/types/env.js';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.use('*', requireJsonContentType);
  app.post('/test', (c) => c.json({ ok: true }));
  app.get('/test', (c) => c.json({ ok: true }));
  app.delete('/test', (c) => c.json({ ok: true }));
  app.patch('/test', (c) => c.json({ ok: true }));
  app.put('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('requireJsonContentType', () => {
  it('allows POST with application/json', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 415 for POST without Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'POST',
      body: 'some body',
    });
    expect(res.status).toBe(415);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Content-Type must be application/json' });
  });

  it('returns 415 for POST with text/plain', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'some body',
    });
    expect(res.status).toBe(415);
    const body: unknown = await res.json();
    expect(body).toEqual({ error: 'Content-Type must be application/json' });
  });

  it('allows GET requests regardless of Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'GET',
    });
    expect(res.status).toBe(200);
  });

  it('allows DELETE requests regardless of Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
  });

  it('allows WebSocket upgrade requests', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
      },
      body: 'upgrade-payload',
    });
    // WebSocket upgrade won't actually complete in test, but should pass through middleware
    expect(res.status).not.toBe(415);
  });

  it('allows PATCH with application/json; charset=utf-8', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ data: 'test' }),
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 415 for PUT with wrong Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PUT',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'some body',
    });
    expect(res.status).toBe(415);
  });

  it('allows PATCH with no body and no Content-Type header', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PATCH',
    });
    expect(res.status).toBe(200);
  });

  it('still rejects PATCH with body but no Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PATCH',
      body: 'some body',
    });
    expect(res.status).toBe(415);
  });
});
