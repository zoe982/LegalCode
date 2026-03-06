import type {
  Template,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateStatus,
} from '@legalcode/shared';

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

    const response = await fetch(`/templates?${searchParams.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    return (await response.json()) as TemplateListResponse;
  },

  async get(id: string): Promise<Template> {
    const response = await fetch(`/templates/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    return (await response.json()) as Template;
  },

  async create(data: CreateTemplateInput): Promise<Template> {
    const response = await fetch('/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    return (await response.json()) as Template;
  },

  async update(id: string, data: UpdateTemplateInput): Promise<Template> {
    const response = await fetch(`/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to update template');
    }
    return (await response.json()) as Template;
  },

  async publish(id: string): Promise<Template> {
    const response = await fetch(`/templates/${id}/publish`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to publish template');
    }
    return (await response.json()) as Template;
  },

  async archive(id: string): Promise<Template> {
    const response = await fetch(`/templates/${id}/archive`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to archive template');
    }
    return (await response.json()) as Template;
  },

  async getVersions(id: string): Promise<TemplateVersion[]> {
    const response = await fetch(`/templates/${id}/versions`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch template versions');
    }
    return (await response.json()) as TemplateVersion[];
  },

  async getVersion(id: string, version: number): Promise<TemplateVersion> {
    const response = await fetch(`/templates/${id}/versions/${String(version)}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch template version');
    }
    return (await response.json()) as TemplateVersion;
  },

  async download(id: string): Promise<void> {
    const response = await fetch(`/templates/${id}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download template');
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
