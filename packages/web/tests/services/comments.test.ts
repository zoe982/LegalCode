import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { commentService } from '../../src/services/comments.js';
import type { Comment } from '../../src/types/comments.js';

const mockComment: Comment = {
  id: 'c1',
  templateId: 'tpl-1',
  parentId: null,
  authorId: 'u1',
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  content: 'Please review this clause.',
  anchorFrom: '10',
  anchorTo: '27',
  anchorText: 'the parties agree',
  resolved: false,
  resolvedBy: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

describe('commentService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getComments', () => {
    it('calls GET /templates/:id/comments with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify([mockComment]), { status: 200 }),
      );

      const result = await commentService.getComments('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/templates/tpl-1/comments', {
        credentials: 'include',
      });
      expect(result).toEqual([mockComment]);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(commentService.getComments('tpl-1')).rejects.toThrow('Failed to fetch comments');
    });
  });

  describe('createComment', () => {
    it('calls POST /templates/:id/comments with JSON body and credentials', async () => {
      const input = {
        templateId: 'tpl-1',
        content: 'New comment',
        anchorFrom: '10',
        anchorTo: '20',
        anchorText: 'some text',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ...mockComment, id: 'c-new', content: 'New comment' }), {
          status: 201,
        }),
      );

      const result = await commentService.createComment(input);

      expect(fetch).toHaveBeenCalledWith('/templates/tpl-1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'New comment',
          anchorFrom: '10',
          anchorTo: '20',
          anchorText: 'some text',
        }),
        credentials: 'include',
      });
      expect(result.content).toBe('New comment');
    });

    it('sends parentId when creating a reply', async () => {
      const input = {
        templateId: 'tpl-1',
        content: 'Reply',
        parentId: 'c1',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ...mockComment, id: 'c-reply', parentId: 'c1' }), {
          status: 201,
        }),
      );

      await commentService.createComment(input);

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.parentId).toBe('c1');
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(
        commentService.createComment({ templateId: 'tpl-1', content: '' }),
      ).rejects.toThrow('Failed to create comment');
    });
  });

  describe('resolveComment', () => {
    it('calls PATCH /templates/:id/comments/:commentId/resolve with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await commentService.resolveComment('tpl-1', 'c1');

      expect(fetch).toHaveBeenCalledWith('/templates/tpl-1/comments/c1/resolve', {
        method: 'PATCH',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(commentService.resolveComment('tpl-1', 'c-bad')).rejects.toThrow(
        'Failed to resolve comment',
      );
    });
  });

  describe('deleteComment', () => {
    it('calls DELETE /templates/:id/comments/:commentId with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await commentService.deleteComment('tpl-1', 'c1');

      expect(fetch).toHaveBeenCalledWith('/templates/tpl-1/comments/c1', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(commentService.deleteComment('tpl-1', 'c1')).rejects.toThrow(
        'Failed to delete comment',
      );
    });
  });
});
