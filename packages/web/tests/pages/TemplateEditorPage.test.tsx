/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TemplateEditorPage } from '../../src/pages/TemplateEditorPage.js';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { Template } from '@legalcode/shared';

// ── Mocks ────────────────────────────────────────────────────────────

const mockUseParams = vi.fn<() => Record<string, string | undefined>>();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => mockUseParams() as ReturnType<typeof actual.useParams>,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth() as unknown,
}));

const mockUseTemplate = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockArchiveMutateAsync = vi.fn();

const mockUseCreateTemplate = vi.fn();
const mockUseUpdateTemplate = vi.fn();
const mockUsePublishTemplate = vi.fn();
const mockUseArchiveTemplate = vi.fn();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplate: (...args: unknown[]) => mockUseTemplate(...args) as unknown,
  useCreateTemplate: () => mockUseCreateTemplate() as unknown,
  useUpdateTemplate: () => mockUseUpdateTemplate() as unknown,
  usePublishTemplate: () => mockUsePublishTemplate() as unknown,
  useArchiveTemplate: () => mockUseArchiveTemplate() as unknown,
}));

vi.mock('../../src/components/MarkdownEditor.js', () => ({
  MarkdownEditor: ({
    defaultValue,
    onChange,
    readOnly,
  }: {
    defaultValue?: string;
    onChange?: (md: string) => void;
    readOnly?: boolean;
  }) => (
    <textarea
      data-testid="markdown-editor"
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
    />
  ),
}));

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    download: vi.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────

interface TemplateDetail {
  template: Template;
  content: string;
  tags: string[];
}

function createTemplateQueryResult(
  overrides: Partial<UseQueryResult<TemplateDetail>>,
): UseQueryResult<TemplateDetail> {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    promise: Promise.resolve({
      template: draftTemplate,
      content: '# Draft',
      tags: [],
    }),
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
  } as UseQueryResult<TemplateDetail>;
}

function createMutationResult(mutateAsyncFn: ReturnType<typeof vi.fn>): Partial<UseMutationResult> {
  return {
    mutate: vi.fn(),
    mutateAsync: mutateAsyncFn,
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
    reset: vi.fn(),
    data: undefined,
    error: null,
    variables: undefined,
    failureCount: 0,
    failureReason: null,
    status: 'idle',
    submittedAt: 0,
    context: undefined,
  };
}

const editorAuth = {
  user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' as const },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  isLoggingOut: false,
};

const viewerAuth = {
  user: { id: '2', email: 'bob@acasus.com', name: 'Bob', role: 'viewer' as const },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  isLoggingOut: false,
};

const draftTemplate: Template = {
  id: 't1',
  title: 'Employment Agreement',
  slug: 'employment-agreement-abc123',
  category: 'Employment',
  country: 'US',
  status: 'draft',
  currentVersion: 1,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const activeTemplate: Template = {
  ...draftTemplate,
  id: 't2',
  status: 'active',
};

const archivedTemplate: Template = {
  ...draftTemplate,
  id: 't3',
  status: 'archived',
};

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function setupMutationMocks() {
  mockUseCreateTemplate.mockReturnValue(createMutationResult(mockCreateMutateAsync));
  mockUseUpdateTemplate.mockReturnValue(createMutationResult(mockUpdateMutateAsync));
  mockUsePublishTemplate.mockReturnValue(createMutationResult(mockPublishMutateAsync));
  mockUseArchiveTemplate.mockReturnValue(createMutationResult(mockArchiveMutateAsync));
}

// ── Tests ────────────────────────────────────────────────────────────

describe('TemplateEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(editorAuth);
    setupMutationMocks();
  });

  describe('Create mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({});
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
          isPending: true,
          isSuccess: false,
          status: 'pending',
        }),
      );
    });

    it('renders empty form fields and Save Draft button', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });

    it('shows "New Template" in the top bar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByText('New Template')).toBeInTheDocument();
    });

    it('does not show Versions tab', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('tab', { name: /versions/i })).not.toBeInTheDocument();
    });

    it('does not show Export button', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit mode - draft', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
            tags: ['employment', 'legal'],
          },
        }),
      );
    });

    it('loads template data into form and shows Save Draft and Publish buttons', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByLabelText(/title/i)).toHaveValue('Employment Agreement');
      expect(screen.getByLabelText(/category/i)).toHaveValue('Employment');
      expect(screen.getByLabelText(/country/i)).toHaveValue('US');
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    });

    it('shows template title in the top bar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByText('Employment Agreement')).toBeInTheDocument();
    });

    it('shows Edit and Versions tabs', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('tab', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /versions/i })).toBeInTheDocument();
    });
  });

  describe('Edit mode - active', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: activeTemplate,
            content: '# Active content',
            tags: [],
          },
        }),
      );
    });

    it('shows Save and Archive buttons', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    });

    it('does not show Publish or Save Draft buttons', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit mode - archived', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: archivedTemplate,
            content: '# Archived content',
            tags: [],
          },
        }),
      );
    });

    it('does not show action buttons', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    });
  });

  describe('Viewer role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(viewerAuth);
    });

    it('does not show action buttons in create mode', () => {
      mockUseParams.mockReturnValue({});
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
          isPending: true,
          isSuccess: false,
          status: 'pending',
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    });

    it('does not show action buttons in edit mode (draft)', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
            tags: [],
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders back button', () => {
      mockUseParams.mockReturnValue({});
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
          isPending: true,
          isSuccess: false,
          status: 'pending',
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Export button', () => {
    it('is present in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
            tags: [],
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('is not present in create mode', () => {
      mockUseParams.mockReturnValue({});
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
          isPending: true,
          isSuccess: false,
          status: 'pending',
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });
  });
});
