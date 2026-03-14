import { describe, it, expect } from 'vitest';
import type { Suggestion, CreateSuggestionInput } from '../../src/types/suggestions.js';

describe('Suggestion types', () => {
  it('Suggestion interface has required fields', () => {
    const suggestion: Suggestion = {
      id: 's1',
      templateId: 'tpl-1',
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      type: 'insert',
      anchorFrom: '10',
      anchorTo: '10',
      originalText: '',
      replacementText: 'new text',
      status: 'pending',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: '2026-03-14T00:00:00Z',
      updatedAt: '2026-03-14T00:00:00Z',
    };
    expect(suggestion.id).toBe('s1');
    expect(suggestion.type).toBe('insert');
    expect(suggestion.status).toBe('pending');
    expect(suggestion.resolvedBy).toBeNull();
  });

  it('Suggestion supports delete type with null replacementText', () => {
    const suggestion: Suggestion = {
      id: 's2',
      templateId: 'tpl-1',
      authorId: 'u1',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      type: 'delete',
      anchorFrom: '5',
      anchorTo: '15',
      originalText: 'removed text',
      replacementText: null,
      status: 'accepted',
      resolvedBy: 'u2',
      resolvedAt: '2026-03-14T01:00:00Z',
      createdAt: '2026-03-14T00:00:00Z',
      updatedAt: '2026-03-14T01:00:00Z',
    };
    expect(suggestion.type).toBe('delete');
    expect(suggestion.replacementText).toBeNull();
    expect(suggestion.status).toBe('accepted');
    expect(suggestion.resolvedBy).toBe('u2');
  });

  it('Suggestion supports rejected status', () => {
    const suggestion: Suggestion = {
      id: 's3',
      templateId: 'tpl-1',
      authorId: 'u1',
      authorName: 'Carol',
      authorEmail: 'carol@example.com',
      type: 'insert',
      anchorFrom: '20',
      anchorTo: '20',
      originalText: '',
      replacementText: 'addition',
      status: 'rejected',
      resolvedBy: 'u3',
      resolvedAt: '2026-03-14T02:00:00Z',
      createdAt: '2026-03-14T00:00:00Z',
      updatedAt: '2026-03-14T02:00:00Z',
    };
    expect(suggestion.status).toBe('rejected');
    expect(suggestion.resolvedAt).toBe('2026-03-14T02:00:00Z');
  });

  it('CreateSuggestionInput requires templateId, type, anchors, and originalText', () => {
    const input: CreateSuggestionInput = {
      templateId: 'tpl-1',
      type: 'insert',
      anchorFrom: '10',
      anchorTo: '10',
      originalText: '',
    };
    expect(input.templateId).toBe('tpl-1');
    expect(input.type).toBe('insert');
    expect(input.originalText).toBe('');
  });

  it('CreateSuggestionInput supports optional replacementText', () => {
    const input: CreateSuggestionInput = {
      templateId: 'tpl-1',
      type: 'insert',
      anchorFrom: '5',
      anchorTo: '5',
      originalText: '',
      replacementText: 'new content',
    };
    expect(input.replacementText).toBe('new content');
  });
});
