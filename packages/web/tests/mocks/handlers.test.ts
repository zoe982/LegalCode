import { describe, it, expect } from 'vitest';
import { handlers } from '../../src/mocks/handlers.js';

describe('MSW handlers', () => {
  it('exports an array of handlers', () => {
    expect(Array.isArray(handlers)).toBe(true);
    expect(handlers.length).toBeGreaterThan(0);
  });

  it('includes auth handlers', () => {
    const handlerInfo = handlers.map((h) => h.info);
    const paths = handlerInfo.map((i) => i.path);
    expect(paths).toContain('/auth/me');
    expect(paths).toContain('/auth/logout');
    expect(paths).toContain('/auth/refresh');
  });

  it('includes admin error handlers', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/admin/errors');
  });

  it('includes template handlers', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/templates');
    expect(paths).toContain('/templates/:id');
  });

  it('includes health check handler', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/health');
  });

  it('includes comment handlers', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/templates/:id/comments');
    expect(paths).toContain('/templates/:id/comments/:commentId/resolve');
    expect(paths).toContain('/templates/:id/comments/:commentId');
  });

  it('includes admin user handlers', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/admin/users');
    expect(paths).toContain('/admin/users/:id');
  });

  it('includes admin user handlers for all methods', () => {
    const handlerInfo = handlers.map((h) => ({
      path: h.info.path,
      method: h.info.method,
    }));
    expect(handlerInfo).toContainEqual({ path: '/admin/users', method: 'GET' });
    expect(handlerInfo).toContainEqual({
      path: '/admin/users',
      method: 'POST',
    });
    expect(handlerInfo).toContainEqual({
      path: '/admin/users/:id',
      method: 'PATCH',
    });
    expect(handlerInfo).toContainEqual({
      path: '/admin/users/:id',
      method: 'DELETE',
    });
  });

  it('includes allowed-emails handlers', () => {
    const paths = handlers.map((h) => h.info.path);
    expect(paths).toContain('/admin/allowed-emails');
    expect(paths).toContain('/admin/allowed-emails/:email');
  });

  it('includes allowed-emails handlers for all methods', () => {
    const handlerInfo = handlers.map((h) => ({
      path: h.info.path,
      method: h.info.method,
    }));
    expect(handlerInfo).toContainEqual({
      path: '/admin/allowed-emails',
      method: 'GET',
    });
    expect(handlerInfo).toContainEqual({
      path: '/admin/allowed-emails',
      method: 'POST',
    });
    expect(handlerInfo).toContainEqual({
      path: '/admin/allowed-emails/:email',
      method: 'DELETE',
    });
  });
});
