import { describe, it, expect, vi } from 'vitest';
import app from '../src/index.js';

describe('app', () => {
  it('responds to /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as { status: string }).status).toBe('ok');
  });

  it('mounts auth routes at /auth', async () => {
    const res = await app.request('/auth/google', undefined, {
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@test.com',
      AUTH_KV: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(),
        }),
      },
    });
    // Should return Google OAuth URL
    expect(res.status).toBe(200);
  });

  it('mounts admin routes at /admin', async () => {
    const res = await app.request('/admin/users');
    expect(res.status).toBe(401);
  });
});
