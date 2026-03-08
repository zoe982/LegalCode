import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { templateService } from '../../src/services/templates.js';
import type { Template, TemplateVersion, TemplateStatus } from '@legalcode/shared';

describe('templateService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('list', () => {
    it('calls GET /templates with no params', async () => {
      const mockResponse = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await templateService.list({});

      expect(fetch).toHaveBeenCalledWith('/api/templates?', {
        credentials: 'include',
      });
      expect(result).toEqual(mockResponse);
    });

    it('includes query params for search, category, country, status, tag, page, limit', async () => {
      const mockResponse = { data: [], total: 0, page: 2, limit: 10 };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await templateService.list({
        search: 'nda',
        category: 'contracts',
        country: 'US',
        status: 'active' as TemplateStatus,
        tag: 'legal',
        page: 2,
        limit: 10,
      });

      const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('search=nda');
      expect(calledUrl).toContain('category=contracts');
      expect(calledUrl).toContain('country=US');
      expect(calledUrl).toContain('status=active');
      expect(calledUrl).toContain('tag=legal');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=10');
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(templateService.list({})).rejects.toThrow('Failed to fetch templates');
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 }),
      );

      await expect(templateService.list({})).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('get', () => {
    it('calls GET /templates/:id with credentials', async () => {
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'NDA',
        slug: 'nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 200 }),
      );

      const result = await templateService.get('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1', {
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(templateService.get('tpl-999')).rejects.toThrow('Failed to fetch template');
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 }),
      );

      await expect(templateService.get('tpl-1')).rejects.toThrow('Access denied');
    });
  });

  describe('create', () => {
    it('calls POST /templates with JSON body and credentials', async () => {
      const input = { title: 'NDA', category: 'contracts', content: '# NDA' };
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'NDA',
        slug: 'nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 201 }),
      );

      const result = await templateService.create(input);

      expect(fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(
        templateService.create({
          title: '',
          category: 'contracts',
          content: '',
        }),
      ).rejects.toThrow('Failed to create template');
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Title already exists' }), { status: 400 }),
      );

      await expect(
        templateService.create({ title: 'Dup', category: 'contracts', content: '' }),
      ).rejects.toThrow('Title already exists');
    });

    it('includes validation details in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'Invalid input',
            details: { fieldErrors: { title: ['Required'] } },
          }),
          { status: 400 },
        ),
      );

      await expect(
        templateService.create({ title: '', category: 'contracts', content: '' }),
      ).rejects.toThrow('Invalid input');
    });

    it('throws fallback message when response body is not JSON', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(
        templateService.create({ title: 'X', category: 'contracts', content: '' }),
      ).rejects.toThrow('Failed to create template');
    });

    it('throws fallback message when response JSON has no error field', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), { status: 400 }),
      );

      await expect(
        templateService.create({ title: 'X', category: 'contracts', content: '' }),
      ).rejects.toThrow('Failed to create template');
    });
  });

  describe('update', () => {
    it('calls PATCH /templates/:id with JSON body and credentials', async () => {
      const input = { title: 'Updated NDA' };
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'Updated NDA',
        slug: 'updated-nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 2,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 200 }),
      );

      const result = await templateService.update('tpl-1', input);

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(templateService.update('tpl-999', { title: 'X' })).rejects.toThrow(
        'Failed to update template',
      );
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 }),
      );

      await expect(templateService.update('tpl-999', { title: 'X' })).rejects.toThrow(
        'Template not found',
      );
    });
  });

  describe('publish', () => {
    it('calls POST /templates/:id/publish with credentials', async () => {
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'NDA',
        slug: 'nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'active',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 200 }),
      );

      const result = await templateService.publish('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/publish', {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(templateService.publish('tpl-1')).rejects.toThrow('Failed to publish template');
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Cannot publish draft' }), { status: 400 }),
      );

      await expect(templateService.publish('tpl-1')).rejects.toThrow('Cannot publish draft');
    });
  });

  describe('archive', () => {
    it('calls POST /templates/:id/archive with credentials', async () => {
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'NDA',
        slug: 'nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'archived',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 200 }),
      );

      const result = await templateService.archive('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/archive', {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(templateService.archive('tpl-1')).rejects.toThrow('Failed to archive template');
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Already archived' }), { status: 400 }),
      );

      await expect(templateService.archive('tpl-1')).rejects.toThrow('Already archived');
    });
  });

  describe('unarchive', () => {
    it('calls POST /templates/:id/unarchive with credentials', async () => {
      const mockTemplate: Template = {
        id: 'tpl-1',
        title: 'NDA',
        slug: 'nda',
        category: 'contracts',
        description: null,
        country: null,
        status: 'draft',
        currentVersion: 1,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTemplate), { status: 200 }),
      );

      const result = await templateService.unarchive('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/unarchive', {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockTemplate);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(templateService.unarchive('tpl-1')).rejects.toThrow(
        'Failed to unarchive template',
      );
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not archived' }), { status: 400 }),
      );

      await expect(templateService.unarchive('tpl-1')).rejects.toThrow('Not archived');
    });
  });

  describe('getVersions', () => {
    it('calls GET /templates/:id/versions with credentials', async () => {
      const mockVersions: TemplateVersion[] = [
        {
          id: 'ver-1',
          templateId: 'tpl-1',
          version: 1,
          content: '# NDA v1',
          changeSummary: null,
          createdBy: 'user-1',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];
      // API returns { versions: [...] } wrapper
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ versions: mockVersions }), { status: 200 }),
      );

      const result = await templateService.getVersions('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/versions', {
        credentials: 'include',
      });
      // Service unwraps and returns the array directly
      expect(result).toEqual(mockVersions);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(templateService.getVersions('tpl-999')).rejects.toThrow(
        'Failed to fetch template versions',
      );
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 }),
      );

      await expect(templateService.getVersions('tpl-1')).rejects.toThrow('Template not found');
    });
  });

  describe('getVersion', () => {
    it('calls GET /templates/:id/versions/:version with credentials', async () => {
      const mockVersion: TemplateVersion = {
        id: 'ver-1',
        templateId: 'tpl-1',
        version: 1,
        content: '# NDA v1',
        changeSummary: null,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
      };
      // API returns { version: {...} } wrapper
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ version: mockVersion }), { status: 200 }),
      );

      const result = await templateService.getVersion('tpl-1', 1);

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/versions/1', {
        credentials: 'include',
      });
      // Service unwraps and returns the version directly
      expect(result).toEqual(mockVersion);
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(templateService.getVersion('tpl-1', 99)).rejects.toThrow(
        'Failed to fetch template version',
      );
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Version not found' }), { status: 404 }),
      );

      await expect(templateService.getVersion('tpl-1', 99)).rejects.toThrow('Version not found');
    });
  });

  describe('autosaveDraft', () => {
    it('sends PATCH request to /templates/:id/autosave with content', async () => {
      const mockResponse = { updatedAt: '2026-03-08T00:00:00Z' };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await templateService.autosaveDraft('tpl-1', { content: '# Draft content' });

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/autosave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '# Draft content' }),
        credentials: 'include',
      });
      expect(result).toEqual(mockResponse);
    });

    it('sends title when provided', async () => {
      const mockResponse = { updatedAt: '2026-03-08T00:00:00Z' };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await templateService.autosaveDraft('tpl-1', {
        content: '# Draft',
        title: 'New Title',
      });

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/autosave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '# Draft', title: 'New Title' }),
        credentials: 'include',
      });
    });

    it('throws error on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(templateService.autosaveDraft('tpl-1', { content: '# Draft' })).rejects.toThrow(
        'Failed to autosave draft',
      );
    });

    it('extracts error message from response body', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Template is locked' }), { status: 409 }),
      );

      await expect(templateService.autosaveDraft('tpl-1', { content: '# Draft' })).rejects.toThrow(
        'Template is locked',
      );
    });
  });

  describe('download', () => {
    it('creates a download link for the template', async () => {
      const blob = new Blob(['# NDA'], { type: 'text/markdown' });
      vi.mocked(fetch).mockResolvedValue(
        new Response(blob, {
          status: 200,
          headers: {
            'Content-Disposition': 'attachment; filename="nda.md"',
          },
        }),
      );

      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      const revokeUrl = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: revokeUrl,
      });

      await templateService.download('tpl-1');

      expect(fetch).toHaveBeenCalledWith('/api/templates/tpl-1/download', {
        credentials: 'include',
      });
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toBe('nda.md');
      expect(mockClick).toHaveBeenCalled();
      expect(revokeUrl).toHaveBeenCalledWith('blob:mock-url');
    });

    it('uses default filename when Content-Disposition is absent', async () => {
      const blob = new Blob(['# NDA'], { type: 'text/markdown' });
      vi.mocked(fetch).mockResolvedValue(new Response(blob, { status: 200 }));

      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn(),
      });

      await templateService.download('tpl-1');

      expect(mockAnchor.download).toBe('template.md');
    });

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }));

      await expect(templateService.download('tpl-1')).rejects.toThrow(
        'Failed to download template',
      );
    });

    it('includes API error message in thrown error', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Download not available' }), { status: 403 }),
      );

      await expect(templateService.download('tpl-1')).rejects.toThrow('Download not available');
    });
  });
});
