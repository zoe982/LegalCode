import { describe, it, expectTypeOf } from 'vitest';
import type { AppEnv, AuthUser } from '../src/types/env.js';

describe('AppEnv types', () => {
  it('has required bindings', () => {
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('DB');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('AUTH_KV');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('JWT_SECRET');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('GOOGLE_CLIENT_ID');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('GOOGLE_CLIENT_SECRET');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('ALLOWED_EMAILS');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('TEMPLATE_SESSION');
  });

  it('has user variable', () => {
    expectTypeOf<AppEnv['Variables']>().toHaveProperty('user');
  });

  it('AuthUser has required fields', () => {
    expectTypeOf<AuthUser>().toHaveProperty('id');
    expectTypeOf<AuthUser>().toHaveProperty('email');
    expectTypeOf<AuthUser>().toHaveProperty('role');
  });
});
