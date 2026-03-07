import { describe, it, expect } from 'vitest';
import type { AuthUser, LoginResponse } from '../../src/types/auth.js';

describe('AuthUser type', () => {
  it('accepts all required fields', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
    };
    expect(user.id).toBe('u1');
    expect(user.email).toBe('alice@acasus.com');
    expect(user.name).toBe('Alice');
    expect(user.role).toBe('editor');
  });

  it('accepts optional createdAt', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
      createdAt: '2026-01-01',
    };
    expect(user.createdAt).toBe('2026-01-01');
  });

  it('accepts undefined createdAt', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'admin',
    };
    expect(user.createdAt).toBeUndefined();
  });

  it('supports all roles', () => {
    const roles = ['admin', 'editor', 'viewer'] as const;
    for (const role of roles) {
      const user: AuthUser = {
        id: 'u1',
        email: 'test@acasus.com',
        name: 'Test',
        role,
      };
      expect(user.role).toBe(role);
    }
  });
});

describe('LoginResponse type', () => {
  it('wraps AuthUser in user field', () => {
    const response: LoginResponse = {
      user: {
        id: 'u1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
      },
    };
    expect(response.user.id).toBe('u1');
  });

  it('supports createdAt in login response', () => {
    const response: LoginResponse = {
      user: {
        id: 'u1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        createdAt: '2026-01-01',
      },
    };
    expect(response.user.createdAt).toBe('2026-01-01');
  });
});
