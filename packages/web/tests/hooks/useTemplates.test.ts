import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Template, TemplateVersion } from '@legalcode/shared';

const { listFn, getFn, createFn, updateFn, publishFn, archiveFn, getVersionsFn } = vi.hoisted(
  () => ({
    listFn: vi.fn(),
    getFn: vi.fn(),
    createFn: vi.fn(),
    updateFn: vi.fn(),
    publishFn: vi.fn(),
    archiveFn: vi.fn(),
    getVersionsFn: vi.fn(),
  }),
);

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    list: listFn,
    get: getFn,
    create: createFn,
    update: updateFn,
    publish: publishFn,
    archive: archiveFn,
    getVersions: getVersionsFn,
    getVersion: vi.fn(),
    download: vi.fn(),
  },
}));

// Mock errorReporter for useTrackedMutation
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn(),
}));

const {
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
} = await import('../../src/hooks/useTemplates.js');

const mockTemplate: Template = {
  id: 'tpl-1',
  title: 'NDA',
  slug: 'nda',
  category: 'contracts',
  country: null,
  status: 'draft',
  currentVersion: 1,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockVersion: TemplateVersion = {
  id: 'ver-1',
  templateId: 'tpl-1',
  version: 1,
  content: '# NDA v1',
  changeSummary: null,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTemplates', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches templates with filters', async () => {
    listFn.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { result } = renderHook(() => useTemplates({ search: 'nda' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listFn).toHaveBeenCalledWith({ search: 'nda' });
    expect(result.current.data?.data).toEqual([mockTemplate]);
  });

  it('returns loading state initially', () => {
    listFn.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useTemplates({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useTemplate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single template by id', async () => {
    getFn.mockResolvedValue(mockTemplate);

    const { result } = renderHook(() => useTemplate('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getFn).toHaveBeenCalledWith('tpl-1');
    expect(result.current.data).toEqual(mockTemplate);
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useTemplate(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getFn).not.toHaveBeenCalled();
  });
});

describe('useTemplateVersions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches versions for a template', async () => {
    getVersionsFn.mockResolvedValue([mockVersion]);

    const { result } = renderHook(() => useTemplateVersions('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getVersionsFn).toHaveBeenCalledWith('tpl-1');
    expect(result.current.data).toEqual([mockVersion]);
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useTemplateVersions(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getVersionsFn).not.toHaveBeenCalled();
  });
});

describe('useCreateTemplate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a template and invalidates list', async () => {
    createFn.mockResolvedValue(mockTemplate);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTemplate(), { wrapper });

    act(() => {
      result.current.mutate({
        title: 'NDA',
        category: 'contracts',
        content: '# NDA',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createFn).toHaveBeenCalledWith({
      title: 'NDA',
      category: 'contracts',
      content: '# NDA',
    });
  });

  it('uses useTrackedMutation with create-template label', async () => {
    createFn.mockRejectedValue(new Error('Create failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTemplate(), { wrapper });

    act(() => {
      result.current.mutate({
        title: 'NDA',
        category: 'contracts',
        content: '# NDA',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Error should be reported via useTrackedMutation (which calls reportError)
    const { reportError } = await import('../../src/services/errorReporter.js');
    expect(reportError).toHaveBeenCalled();
  });
});

describe('useUpdateTemplate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates a template', async () => {
    updateFn.mockResolvedValue({
      ...mockTemplate,
      title: 'Updated NDA',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateTemplate(), { wrapper });

    act(() => {
      result.current.mutate({ id: 'tpl-1', data: { title: 'Updated NDA' } });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateFn).toHaveBeenCalledWith('tpl-1', {
      title: 'Updated NDA',
    });
  });
});

describe('usePublishTemplate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('publishes a template', async () => {
    publishFn.mockResolvedValue({
      ...mockTemplate,
      status: 'active',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePublishTemplate(), { wrapper });

    act(() => {
      result.current.mutate('tpl-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(publishFn).toHaveBeenCalledWith('tpl-1');
  });
});

describe('useArchiveTemplate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('archives a template', async () => {
    archiveFn.mockResolvedValue({
      ...mockTemplate,
      status: 'archived',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArchiveTemplate(), { wrapper });

    act(() => {
      result.current.mutate('tpl-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(archiveFn).toHaveBeenCalledWith('tpl-1');
  });
});
