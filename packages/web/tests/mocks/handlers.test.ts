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
});
