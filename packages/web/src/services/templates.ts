import type {
  Template,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateStatus,
} from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface TemplateListParams {
  search?: string;
  category?: string;
  country?: string;
  status?: TemplateStatus;
  tag?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface TemplateListResponse {
  data: Template[];
  total: number;
  page: number;
  limit: number;
}

function extractFilename(response: Response): string {
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const match = /filename="([^"]+)"/.exec(disposition);
    if (match?.[1]) {
      return match[1];
    }
  }
  return 'template.md';
}

export const templateService = {
  async list(params: TemplateListParams): Promise<TemplateListResponse> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.category) searchParams.set('category', params.category);
    if (params.country) searchParams.set('country', params.country);
    if (params.status) searchParams.set('status', params.status);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.limit != null) searchParams.set('limit', String(params.limit));

    const response = await fetch(`/api/templates?${searchParams.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch templates');
    }
    return (await response.json()) as TemplateListResponse;
  },

  async get(id: string): Promise<Template> {
    const response = await fetch(`/api/templates/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch template');
    }
    return (await response.json()) as Template;
  },

  async create(data: CreateTemplateInput): Promise<{ template: Template; tags: string[] }> {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create template');
    }
    return (await response.json()) as { template: Template; tags: string[] };
  },

  async update(id: string, data: UpdateTemplateInput): Promise<Template> {
    const response = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to update template');
    }
    return (await response.json()) as Template;
  },

  async publish(id: string): Promise<Template> {
    const response = await fetch(`/api/templates/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to publish template');
    }
    return (await response.json()) as Template;
  },

  async archive(id: string): Promise<Template> {
    const response = await fetch(`/api/templates/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to archive template');
    }
    return (await response.json()) as Template;
  },

  async unarchive(id: string): Promise<Template> {
    const response = await fetch(`/api/templates/${id}/unarchive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to unarchive template');
    }
    return (await response.json()) as Template;
  },

  async getVersions(id: string): Promise<TemplateVersion[]> {
    const response = await fetch(`/api/templates/${id}/versions`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch template versions');
    }
    const data = (await response.json()) as { versions: TemplateVersion[] };
    return data.versions;
  },

  async getVersion(id: string, version: number): Promise<TemplateVersion> {
    const response = await fetch(`/api/templates/${id}/versions/${String(version)}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch template version');
    }
    const data = (await response.json()) as { version: TemplateVersion };
    return data.version;
  },

  async autosaveDraft(
    id: string,
    data: { content: string; title?: string },
  ): Promise<{ updatedAt: string }> {
    const response = await fetch(`/api/templates/${id}/autosave`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to autosave draft');
    }
    return (await response.json()) as { updatedAt: string };
  },

  async download(id: string): Promise<void> {
    const response = await fetch(`/api/templates/${id}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to download template');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const filename = extractFilename(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
