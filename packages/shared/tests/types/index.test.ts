import { describe, it, expect } from 'vitest';
import type { AuditAction, Role, User, Template, AuditLogEntry } from '../../src/types/index.js';

describe('shared types', () => {
  it('AuditAction includes client_error', () => {
    const action: AuditAction = 'client_error';
    expect(action).toBe('client_error');
  });

  it('AuditAction includes delete', () => {
    const action: AuditAction = 'delete';
    expect(action).toBe('delete');
  });

  it('AuditAction includes restore', () => {
    const action: AuditAction = 'restore';
    expect(action).toBe('restore');
  });

  it('AuditAction includes hard_delete', () => {
    const action: AuditAction = 'hard_delete';
    expect(action).toBe('hard_delete');
  });

  it('Role type includes all roles', () => {
    const roles: Role[] = ['admin', 'editor', 'viewer'];
    expect(roles).toHaveLength(3);
  });

  it('Template interface has deletedAt and deletedBy fields', () => {
    const template: Template = {
      id: '1',
      title: 'Test',
      slug: 'test-abc123',
      category: 'contracts',
      description: null,
      country: null,
      currentVersion: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      deletedAt: null,
      deletedBy: null,
    };
    expect(template.deletedAt).toBeNull();
    expect(template.deletedBy).toBeNull();
  });

  it('Template interface supports non-null deletedAt and deletedBy', () => {
    const template: Template = {
      id: '1',
      title: 'Deleted',
      slug: 'deleted-abc123',
      category: 'contracts',
      description: null,
      country: null,
      currentVersion: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      deletedAt: '2026-02-01T00:00:00.000Z',
      deletedBy: 'user-2',
    };
    expect(template.deletedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(template.deletedBy).toBe('user-2');
  });

  it('User interface has required fields', () => {
    const user: User = {
      id: '1',
      email: 'test@acasus.com',
      name: 'Test',
      role: 'editor',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    expect(user.id).toBe('1');
    expect(user.role).toBe('editor');
  });

  it('AuditLogEntry supports client_error action', () => {
    const entry: AuditLogEntry = {
      id: '1',
      userId: 'u1',
      action: 'client_error',
      entityType: 'app',
      entityId: 'frontend',
      metadata: '{"message":"test"}',
      createdAt: '2026-01-01',
    };
    expect(entry.action).toBe('client_error');
    expect(entry.metadata).not.toBeNull();
  });
});
