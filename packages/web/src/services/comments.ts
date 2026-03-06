import type { Comment, CreateCommentInput } from '../types/comments.js';

export const commentService = {
  async getComments(templateId: string): Promise<Comment[]> {
    const response = await fetch(`/api/templates/${templateId}/comments`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return (await response.json()) as Comment[];
  },

  async createComment(input: CreateCommentInput): Promise<Comment> {
    const { templateId, ...body } = input;
    const response = await fetch(`/api/templates/${templateId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to create comment');
    }
    return (await response.json()) as Comment;
  },

  async resolveComment(templateId: string, commentId: string): Promise<void> {
    const response = await fetch(`/api/templates/${templateId}/comments/${commentId}/resolve`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to resolve comment');
    }
  },

  async deleteComment(templateId: string, commentId: string): Promise<void> {
    const response = await fetch(`/api/templates/${templateId}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
  },
};
