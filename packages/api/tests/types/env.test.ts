import { describe, it, expectTypeOf } from 'vitest';
import type { AppEnv } from '../../src/types/env.js';

describe('AppEnv TEMPLATE_SESSION binding', () => {
  it('has TEMPLATE_SESSION in bindings', () => {
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('TEMPLATE_SESSION');
  });
});
