import { describe, it, expect } from 'vitest';
import type { Comment, CreateCommentInput, CommentThread } from '../../src/types/comments.js';

describe('Comment types', () => {
  it('Comment interface has required fields', () => {
    const comment: Comment = {
      id: 'c1',
      templateId: 'tpl-1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      content: 'Test comment',
      anchorBlockId: null,
      anchorText: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };
    expect(comment.id).toBe('c1');
    expect(comment.parentId).toBeNull();
    expect(comment.resolved).toBe(false);
  });

  it('Comment supports reply with parentId', () => {
    const reply: Comment = {
      id: 'c2',
      templateId: 'tpl-1',
      parentId: 'c1',
      authorId: 'u2',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      content: 'Reply text',
      anchorBlockId: null,
      anchorText: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T01:00:00Z',
      updatedAt: '2026-03-01T01:00:00Z',
    };
    expect(reply.parentId).toBe('c1');
  });

  it('CreateCommentInput requires templateId and content', () => {
    const input: CreateCommentInput = {
      templateId: 'tpl-1',
      content: 'New comment',
    };
    expect(input.templateId).toBe('tpl-1');
    expect(input.content).toBe('New comment');
  });

  it('CreateCommentInput supports optional fields', () => {
    const input: CreateCommentInput = {
      templateId: 'tpl-1',
      content: 'Reply',
      parentId: 'c1',
      anchorBlockId: 'block-1',
      anchorText: 'quoted text',
    };
    expect(input.parentId).toBe('c1');
    expect(input.anchorBlockId).toBe('block-1');
    expect(input.anchorText).toBe('quoted text');
  });

  it('CommentThread groups a comment with its replies', () => {
    const parent: Comment = {
      id: 'c1',
      templateId: 'tpl-1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      content: 'Top-level',
      anchorBlockId: 'block-1',
      anchorText: 'some text',
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };
    const reply: Comment = {
      id: 'c2',
      templateId: 'tpl-1',
      parentId: 'c1',
      authorId: 'u2',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      content: 'Reply',
      anchorBlockId: null,
      anchorText: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T01:00:00Z',
      updatedAt: '2026-03-01T01:00:00Z',
    };

    const thread: CommentThread = {
      comment: parent,
      replies: [reply],
    };
    expect(thread.comment.id).toBe('c1');
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies[0]?.parentId).toBe('c1');
  });
});
