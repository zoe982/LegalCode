import { describe, it, expect } from 'vitest';
import {
  commentSchema,
  createCommentSchema,
  commentsResponseSchema,
} from '../../src/schemas/comments.js';
import type { CommentResponse, CreateCommentInput } from '../../src/schemas/comments.js';

describe('commentSchema', () => {
  const validComment: CommentResponse = {
    id: 'c-1',
    templateId: 't-1',
    parentId: null,
    authorId: 'u-1',
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    content: 'This looks good.',
    anchorText: null,
    anchorFrom: null,
    anchorTo: null,
    resolved: false,
    resolvedBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('accepts a valid comment', () => {
    const result = commentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  it('accepts a comment with non-null optional fields', () => {
    const result = commentSchema.safeParse({
      ...validComment,
      parentId: 'c-0',
      anchorText: 'selected text',
      anchorFrom: '10',
      anchorTo: '20',
      resolved: true,
      resolvedBy: 'u-2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a comment missing required fields', () => {
    const result = commentSchema.safeParse({
      id: 'c-1',
      templateId: 't-1',
      // missing authorId, authorName, authorEmail, content, etc.
    });
    expect(result.success).toBe(false);
  });

  it('rejects a comment with invalid types', () => {
    const result = commentSchema.safeParse({
      ...validComment,
      resolved: 'not-a-boolean',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a comment with missing id', () => {
    const noId = { ...validComment };

    delete (noId as Record<string, unknown>).id;
    const result = commentSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('rejects a comment with missing content', () => {
    const noContent = { ...validComment };

    delete (noContent as Record<string, unknown>).content;
    const result = commentSchema.safeParse(noContent);
    expect(result.success).toBe(false);
  });
});

describe('createCommentSchema', () => {
  it('accepts valid input with content only', () => {
    const input: CreateCommentInput = { content: 'A comment' };
    const result = createCommentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const result = createCommentSchema.safeParse({
      content: 'Inline note',
      parentId: 'c-0',
      anchorText: 'some text',
      anchorFrom: '5',
      anchorTo: '15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = createCommentSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 5000 characters', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 5000 characters', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5000) });
    expect(result.success).toBe(true);
  });

  it('accepts content at exactly 1 character', () => {
    const result = createCommentSchema.safeParse({ content: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects anchorText exceeding 500 characters', () => {
    const result = createCommentSchema.safeParse({
      content: 'note',
      anchorText: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = createCommentSchema.safeParse({ content: 'Just a comment' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBeUndefined();
      expect(result.data.anchorText).toBeUndefined();
      expect(result.data.anchorFrom).toBeUndefined();
      expect(result.data.anchorTo).toBeUndefined();
    }
  });
});

describe('commentsResponseSchema', () => {
  it('validates an array of comments', () => {
    const comments = [
      {
        id: 'c-1',
        templateId: 't-1',
        parentId: null,
        authorId: 'u-1',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        content: 'Good',
        anchorText: null,
        anchorFrom: null,
        anchorTo: null,
        resolved: false,
        resolvedBy: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'c-2',
        templateId: 't-1',
        parentId: 'c-1',
        authorId: 'u-2',
        authorName: 'Bob',
        authorEmail: 'bob@example.com',
        content: 'Agreed',
        anchorText: null,
        anchorFrom: null,
        anchorTo: null,
        resolved: false,
        resolvedBy: null,
        createdAt: '2026-01-01T00:01:00Z',
        updatedAt: '2026-01-01T00:01:00Z',
      },
    ];
    const result = commentsResponseSchema.safeParse(comments);
    expect(result.success).toBe(true);
  });

  it('validates an empty array', () => {
    const result = commentsResponseSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects an array with invalid items', () => {
    const result = commentsResponseSchema.safeParse([{ id: 'c-1' }]);
    expect(result.success).toBe(false);
  });

  it('rejects non-array input', () => {
    const result = commentsResponseSchema.safeParse({ id: 'c-1' });
    expect(result.success).toBe(false);
  });
});

describe('contract test — mock API response matches schema', () => {
  it('validates a mock API response for GET /templates/:id/comments', () => {
    const mockApiResponse = [
      {
        id: 'comment-uuid-1',
        templateId: 'tmpl-uuid-1',
        parentId: null,
        authorId: 'user-uuid-1',
        authorName: 'Joseph Marsico',
        authorEmail: 'joseph.marsico@acasus.com',
        content: 'Please review section 3.',
        anchorText: 'Section 3: Liability',
        anchorFrom: '42',
        anchorTo: '65',
        resolved: false,
        resolvedBy: null,
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    ];
    const result = commentsResponseSchema.safeParse(mockApiResponse);
    expect(result.success).toBe(true);
  });

  it('validates a mock API response for POST /templates/:id/comments', () => {
    const mockApiResponse = {
      id: 'comment-uuid-2',
      templateId: 'tmpl-uuid-1',
      parentId: null,
      authorId: 'user-uuid-1',
      authorName: 'joseph.marsico@acasus.com',
      authorEmail: 'joseph.marsico@acasus.com',
      content: 'New comment.',
      anchorText: null,
      anchorFrom: null,
      anchorTo: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-07T10:01:00.000Z',
      updatedAt: '2026-03-07T10:01:00.000Z',
    };
    const result = commentSchema.safeParse(mockApiResponse);
    expect(result.success).toBe(true);
  });
});
