import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserRoleSchema,
  loginResponseSchema,
  allowedEmailsResponseSchema,
  addAllowedEmailSchema,
} from '../../src/schemas/auth.js';

describe('createUserSchema', () => {
  it('validates a valid user creation input', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: 'Alice Smith',
      role: 'editor',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      name: 'Alice',
      role: 'editor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: '',
      role: 'editor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'editor', 'viewer']) {
      const result = createUserSchema.safeParse({
        email: `user@acasus.com`,
        name: 'User',
        role,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateUserRoleSchema', () => {
  it('validates a valid role update', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'admin' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'superadmin' });
    expect(result.success).toBe(false);
  });
});

describe('loginResponseSchema', () => {
  it('validates a successful login response', () => {
    const result = loginResponseSchema.safeParse({
      user: {
        id: 'abc-123',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing user fields', () => {
    const result = loginResponseSchema.safeParse({
      user: { id: 'abc-123', email: 'alice@acasus.com' },
    });
    expect(result.success).toBe(false);
  });

  it('validates with optional createdAt', () => {
    const result = loginResponseSchema.safeParse({
      user: {
        id: 'abc-123',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        createdAt: '2026-01-01',
      },
    });
    expect(result.success).toBe(true);
  });

  it('validates without createdAt', () => {
    const result = loginResponseSchema.safeParse({
      user: {
        id: 'abc-123',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('allowedEmailsResponseSchema', () => {
  it('validates a valid email list', () => {
    const result = allowedEmailsResponseSchema.safeParse({
      emails: ['alice@acasus.com', 'bob@acasus.com'],
    });
    expect(result.success).toBe(true);
  });

  it('validates empty email list', () => {
    const result = allowedEmailsResponseSchema.safeParse({ emails: [] });
    expect(result.success).toBe(true);
  });

  it('rejects invalid emails in list', () => {
    const result = allowedEmailsResponseSchema.safeParse({
      emails: ['not-an-email'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing emails field', () => {
    const result = allowedEmailsResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('addAllowedEmailSchema', () => {
  it('validates a valid email', () => {
    const result = addAllowedEmailSchema.safeParse({ email: 'new@acasus.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = addAllowedEmailSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = addAllowedEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
