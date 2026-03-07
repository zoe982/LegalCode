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
      anchorFrom: null,
      anchorTo: null,
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
      anchorFrom: null,
      anchorTo: null,
      anchorText: null,
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T01:00:00Z',
      updatedAt: '2026-03-01T01:00:00Z',
    };
    expect(reply.parentId).toBe('c1');
  });

  it('Comment supports anchorFrom and anchorTo fields', () => {
    const comment: Comment = {
      id: 'c3',
      templateId: 'tpl-1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      content: 'Anchored comment',
      anchorFrom: '10',
      anchorTo: '25',
      anchorText: 'selected text',
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };
    expect(comment.anchorFrom).toBe('10');
    expect(comment.anchorTo).toBe('25');
    expect(comment.anchorText).toBe('selected text');
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
      anchorFrom: '10',
      anchorTo: '25',
      anchorText: 'quoted text',
    };
    expect(input.parentId).toBe('c1');
    expect(input.anchorFrom).toBe('10');
    expect(input.anchorTo).toBe('25');
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
      anchorFrom: '5',
      anchorTo: '20',
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
      anchorFrom: null,
      anchorTo: null,
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
