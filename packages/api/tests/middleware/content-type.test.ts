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
    const jsonBody = JSON.stringify({ data: 'test' });
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(jsonBody.length) },
      body: jsonBody,
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 415 for POST without Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Length': '9' },
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
      headers: { 'Content-Type': 'text/plain', 'Content-Length': '9' },
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
        'Content-Length': '15',
      },
      body: 'upgrade-payload',
    });
    // WebSocket upgrade won't actually complete in test, but should pass through middleware
    expect(res.status).not.toBe(415);
  });

  it('allows PATCH with application/json; charset=utf-8', async () => {
    const app = createTestApp();
    const jsonBody = JSON.stringify({ data: 'test' });
    const res = await app.request('/test', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': String(jsonBody.length),
      },
      body: jsonBody,
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 415 for PUT with wrong Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PUT',
      headers: { 'Content-Type': 'multipart/form-data', 'Content-Length': '9' },
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

  it('allows PATCH with non-null empty body and no Content-Length (Cloudflare Workers edge case)', async () => {
    const app = createTestApp();
    // Simulate Cloudflare Workers: body is an empty ReadableStream, not null
    const req = new Request('http://localhost/test', {
      method: 'PATCH',
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      // Explicitly set duplex for streaming body
      // @ts-expect-error -- duplex is required by undici/Node but not in TS lib types
      duplex: 'half',
    });
    // Remove Content-Length header to simulate the edge case
    // (Request constructor with ReadableStream body won't set Content-Length)
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });

  it('still rejects PATCH with Content-Length > 0 but no Content-Type', async () => {
    const app = createTestApp();
    const req = new Request('http://localhost/test', {
      method: 'PATCH',
      body: 'some body',
      headers: { 'Content-Length': '9' },
    });
    const res = await app.request(req);
    expect(res.status).toBe(415);
  });

  it('still rejects PATCH with body but no Content-Type', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      method: 'PATCH',
      headers: { 'Content-Length': '9' },
      body: 'some body',
    });
    expect(res.status).toBe(415);
  });
});
