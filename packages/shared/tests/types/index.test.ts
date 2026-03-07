import { describe, it, expect } from 'vitest';
import type {
  AuditAction,
  Role,
  TemplateStatus,
  User,
  AuditLogEntry,
} from '../../src/types/index.js';

describe('shared types', () => {
  it('AuditAction includes client_error', () => {
    const action: AuditAction = 'client_error';
    expect(action).toBe('client_error');
  });

  it('AuditAction includes unarchive', () => {
    const action: AuditAction = 'unarchive';
    expect(action).toBe('unarchive');
  });

  it('Role type includes all roles', () => {
    const roles: Role[] = ['admin', 'editor', 'viewer'];
    expect(roles).toHaveLength(3);
  });

  it('TemplateStatus type includes all statuses', () => {
    const statuses: TemplateStatus[] = ['draft', 'active', 'archived'];
    expect(statuses).toHaveLength(3);
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
