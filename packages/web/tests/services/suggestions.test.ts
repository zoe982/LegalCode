import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { suggestionService } from '../../src/services/suggestions.js';
import type { Suggestion } from '../../src/types/suggestions.js';

const mockSuggestion: Suggestion = {
  id: 's1',
  templateId: 'tpl-1',
  authorId: 'u1',
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  type: 'insert',
  anchorFrom: '10',
  anchorTo: '10',
  originalText: '',
  replacementText: 'proposed new text',
  status: 'pending',
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-03-14T10:00:00Z',
  updatedAt: '2026-03-14T10:00:00Z',
};

describe('suggestionService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getSuggestions', () => {
    it('calls GET /templates/:id/suggestions with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify([mockSuggestion]), { status: 200 }),
      );

      const result = await suggestionService.getSuggestions('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/suggestions', {
        credentials: 'include',
      });
      expect(result).toEqual([mockSuggestion]);
    });

    it('returns empty array when no suggestions', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      const result = await suggestionService.getSuggestions('tpl-1');
      expect(result).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(suggestionService.getSuggestions('tpl-1')).rejects.toThrow(
        'Failed to fetch suggestions',
      );
    });
  });

  describe('createSuggestion', () => {
    it('calls POST /templates/:id/suggestions with JSON body and credentials', async () => {
      const input = {
        templateId: 'tpl-1',
        type: 'insert' as const,
        anchorFrom: '10',
        anchorTo: '10',
        originalText: '',
        replacementText: 'proposed new text',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ...mockSuggestion, id: 's-new' }), { status: 201 }),
      );

      const result = await suggestionService.createSuggestion(input);

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'insert',
          anchorFrom: '10',
          anchorTo: '10',
          originalText: '',
          replacementText: 'proposed new text',
        }),
        credentials: 'include',
      });
      expect(result.id).toBe('s-new');
    });

    it('creates a delete suggestion without replacementText', async () => {
      const input = {
        templateId: 'tpl-1',
        type: 'delete' as const,
        anchorFrom: '20',
        anchorTo: '30',
        originalText: 'text to delete',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            ...mockSuggestion,
            id: 's-del',
            type: 'delete',
            replacementText: null,
          }),
          { status: 201 },
        ),
      );

      const result = await suggestionService.createSuggestion(input);

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.replacementText).toBeUndefined();
      expect(result.type).toBe('delete');
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(
        suggestionService.createSuggestion({
          templateId: 'tpl-1',
          type: 'insert',
          anchorFrom: '0',
          anchorTo: '0',
          originalText: '',
        }),
      ).rejects.toThrow('Failed to create suggestion');
    });
  });

  describe('acceptSuggestion', () => {
    it('calls PATCH /templates/:id/suggestions/:sid/accept with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await suggestionService.acceptSuggestion('tpl-1', 's1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/suggestions/s1/accept', {
        method: 'PATCH',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(suggestionService.acceptSuggestion('tpl-1', 's-bad')).rejects.toThrow(
        'Failed to accept suggestion',
      );
    });
  });

  describe('rejectSuggestion', () => {
    it('calls PATCH /templates/:id/suggestions/:sid/reject with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await suggestionService.rejectSuggestion('tpl-1', 's1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/suggestions/s1/reject', {
        method: 'PATCH',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(suggestionService.rejectSuggestion('tpl-1', 's1')).rejects.toThrow(
        'Failed to reject suggestion',
      );
    });
  });

  describe('deleteSuggestion', () => {
    it('calls DELETE /templates/:id/suggestions/:sid with credentials', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await suggestionService.deleteSuggestion('tpl-1', 's1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/suggestions/s1', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(suggestionService.deleteSuggestion('tpl-1', 's1')).rejects.toThrow(
        'Failed to delete suggestion',
      );
    });
  });
});
