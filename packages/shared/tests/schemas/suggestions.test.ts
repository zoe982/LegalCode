import { describe, it, expect } from 'vitest';
import {
  suggestionSchema,
  createSuggestionSchema,
  suggestionsResponseSchema,
} from '../../src/schemas/suggestions.js';
import type { SuggestionResponse, CreateSuggestionInput } from '../../src/schemas/suggestions.js';

describe('suggestionSchema', () => {
  const validSuggestion: SuggestionResponse = {
    id: 's-1',
    templateId: 't-1',
    authorId: 'u-1',
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    type: 'insert',
    anchorFrom: '10',
    anchorTo: '20',
    originalText: 'original',
    replacementText: null,
    status: 'pending',
    resolvedBy: null,
    resolvedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('accepts a valid suggestion', () => {
    const result = suggestionSchema.safeParse(validSuggestion);
    expect(result.success).toBe(true);
  });

  it('accepts a suggestion with non-null optional fields', () => {
    const result = suggestionSchema.safeParse({
      ...validSuggestion,
      type: 'delete',
      replacementText: 'new text',
      status: 'accepted',
      resolvedBy: 'u-2',
      resolvedAt: '2026-01-02T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a suggestion missing required fields', () => {
    const result = suggestionSchema.safeParse({
      id: 's-1',
      templateId: 't-1',
      // missing authorId, authorName, authorEmail, type, etc.
    });
    expect(result.success).toBe(false);
  });

  it('rejects a suggestion with invalid types', () => {
    const result = suggestionSchema.safeParse({
      ...validSuggestion,
      status: 123,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a suggestion with missing id', () => {
    const noId = { ...validSuggestion };

    delete (noId as Record<string, unknown>).id;
    const result = suggestionSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('rejects a suggestion with invalid type enum value', () => {
    const result = suggestionSchema.safeParse({
      ...validSuggestion,
      type: 'modify',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a suggestion with invalid status enum value', () => {
    const result = suggestionSchema.safeParse({
      ...validSuggestion,
      status: 'approved',
    });
    expect(result.success).toBe(false);
  });
});

describe('createSuggestionSchema', () => {
  it('accepts valid input with required fields only', () => {
    const input: CreateSuggestionInput = {
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'original',
    };
    const result = createSuggestionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with replacementText', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'delete',
      anchorFrom: '5',
      anchorTo: '15',
      originalText: 'text to delete',
      replacementText: 'replacement',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty anchorFrom', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '',
      anchorTo: '10',
      originalText: 'original',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty anchorTo', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '',
      originalText: 'original',
    });
    expect(result.success).toBe(false);
  });

  it('rejects originalText exceeding 10000 characters', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'a'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts originalText at exactly 10000 characters', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'a'.repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type enum', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'update',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'original',
    });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'original',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replacementText).toBeUndefined();
    }
  });

  it('rejects replacementText exceeding 10000 characters', () => {
    const result = createSuggestionSchema.safeParse({
      type: 'insert',
      anchorFrom: '0',
      anchorTo: '10',
      originalText: 'original',
      replacementText: 'b'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

describe('suggestionsResponseSchema', () => {
  const validSuggestion = {
    id: 's-1',
    templateId: 't-1',
    authorId: 'u-1',
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    type: 'insert',
    anchorFrom: '10',
    anchorTo: '20',
    originalText: 'original',
    replacementText: null,
    status: 'pending',
    resolvedBy: null,
    resolvedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('validates an array of suggestions', () => {
    const suggestions = [
      validSuggestion,
      {
        ...validSuggestion,
        id: 's-2',
        type: 'delete',
        status: 'accepted',
        resolvedBy: 'u-2',
        resolvedAt: '2026-01-02T00:00:00Z',
      },
    ];
    const result = suggestionsResponseSchema.safeParse(suggestions);
    expect(result.success).toBe(true);
  });

  it('validates an empty array', () => {
    const result = suggestionsResponseSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects an array with invalid items', () => {
    const result = suggestionsResponseSchema.safeParse([{ id: 's-1' }]);
    expect(result.success).toBe(false);
  });

  it('rejects non-array input', () => {
    const result = suggestionsResponseSchema.safeParse({ id: 's-1' });
    expect(result.success).toBe(false);
  });
});

describe('contract test — mock API response matches schema', () => {
  it('validates a mock API response for GET /templates/:id/suggestions', () => {
    const mockApiResponse = [
      {
        id: 'suggestion-uuid-1',
        templateId: 'tmpl-uuid-1',
        authorId: 'user-uuid-1',
        authorName: 'Joseph Marsico',
        authorEmail: 'joseph.marsico@acasus.com',
        type: 'insert',
        anchorFrom: '42',
        anchorTo: '65',
        originalText: 'the original clause text',
        replacementText: 'the suggested replacement text',
        status: 'pending',
        resolvedBy: null,
        resolvedAt: null,
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    ];
    const result = suggestionsResponseSchema.safeParse(mockApiResponse);
    expect(result.success).toBe(true);
  });

  it('validates a mock API response for POST /templates/:id/suggestions', () => {
    const mockApiResponse = {
      id: 'suggestion-uuid-2',
      templateId: 'tmpl-uuid-1',
      authorId: 'user-uuid-1',
      authorName: 'Joseph Marsico',
      authorEmail: 'joseph.marsico@acasus.com',
      type: 'delete',
      anchorFrom: '100',
      anchorTo: '150',
      originalText: 'text to be deleted',
      replacementText: null,
      status: 'pending',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: '2026-03-07T10:01:00.000Z',
      updatedAt: '2026-03-07T10:01:00.000Z',
    };
    const result = suggestionSchema.safeParse(mockApiResponse);
    expect(result.success).toBe(true);
  });
});
