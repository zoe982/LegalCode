import { describe, it, expect } from 'vitest';

describe('tokens.css', () => {
  it('imports without throwing', async () => {
    // Smoke test: importing the CSS module should not throw
    await expect(import('../../src/theme/tokens.css')).resolves.toBeDefined();
  });
});
