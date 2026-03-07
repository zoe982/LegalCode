import { describe, it, expect } from 'vitest';
import {
  users,
  templates,
  templateVersions,
  tags,
  templateTags,
  auditLog,
  errorLog,
} from '../../src/db/schema.js';

describe('database schema', () => {
  describe('users table', () => {
    it('exports users table', () => {
      expect(users).toBeDefined();
    });
  });

  describe('templates table', () => {
    it('exports templates table', () => {
      expect(templates).toBeDefined();
    });
  });

  describe('templateVersions table', () => {
    it('exports templateVersions table', () => {
      expect(templateVersions).toBeDefined();
    });
  });

  describe('tags table', () => {
    it('exports tags table', () => {
      expect(tags).toBeDefined();
    });
  });

  describe('templateTags table', () => {
    it('exports templateTags table', () => {
      expect(templateTags).toBeDefined();
    });
  });

  describe('auditLog table', () => {
    it('exports auditLog table', () => {
      expect(auditLog).toBeDefined();
    });
  });

  describe('errorLog table', () => {
    it('exports errorLog table', () => {
      expect(errorLog).toBeDefined();
    });

    it('has all required columns', () => {
      expect(errorLog.id).toBeDefined();
      expect(errorLog.timestamp).toBeDefined();
      expect(errorLog.source).toBeDefined();
      expect(errorLog.severity).toBeDefined();
      expect(errorLog.message).toBeDefined();
      expect(errorLog.stack).toBeDefined();
      expect(errorLog.metadata).toBeDefined();
      expect(errorLog.url).toBeDefined();
      expect(errorLog.userId).toBeDefined();
      expect(errorLog.status).toBeDefined();
      expect(errorLog.resolvedAt).toBeDefined();
      expect(errorLog.resolvedBy).toBeDefined();
      expect(errorLog.fingerprint).toBeDefined();
      expect(errorLog.occurrenceCount).toBeDefined();
      expect(errorLog.lastSeenAt).toBeDefined();
    });

    it('has id column mapped to correct SQL name', () => {
      expect(errorLog.id.name).toBe('id');
    });

    it('uses text type for id column', () => {
      expect(errorLog.id.dataType).toBe('string');
    });

    it('uses text type for source column', () => {
      expect(errorLog.source.dataType).toBe('string');
    });

    it('uses integer type for occurrenceCount column', () => {
      expect(errorLog.occurrenceCount.dataType).toBe('number');
    });

    it('has source enum values', () => {
      expect(errorLog.source.enumValues).toEqual([
        'frontend',
        'backend',
        'websocket',
        'functional',
      ]);
    });

    it('has severity enum values', () => {
      expect(errorLog.severity.enumValues).toEqual(['error', 'warning', 'critical']);
    });

    it('has status enum values', () => {
      expect(errorLog.status.enumValues).toEqual(['open', 'resolved']);
    });
  });
});
