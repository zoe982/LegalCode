import { describe, it, expect } from 'vitest';

describe('API index exports', () => {
  it('exports TemplateSession Durable Object', async () => {
    const mod = await import('../src/index.js');
    expect(mod.TemplateSession).toBeDefined();
  });
});
