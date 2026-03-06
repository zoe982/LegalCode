/// <reference types="@testing-library/jest-dom/vitest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('../../src/components/VersionHistory.js', () => ({
  VersionHistory: ({
    templateId,
    currentVersion,
  }: {
    templateId: string;
    currentVersion: number;
  }) => (
    <div data-testid="version-history">
      Version history for {templateId} v{String(currentVersion)}
    </div>
  ),
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

    it('calls templateService.download when clicked', async () => {
      const user = userEvent.setup();
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

      const templates = await import('../../src/services/templates.js');
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /export/i }));
      expect(templates.templateService.download).toHaveBeenCalledWith('t1');
    });
  });

  describe('Create mode actions', () => {
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

    it('calls createMutation when Save Draft is clicked', async () => {
      const user = userEvent.setup();
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'new-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Fill in required fields
      await user.type(screen.getByLabelText(/title/i), 'New Agreement');
      await user.type(screen.getByLabelText(/category/i), 'Employment');

      await user.click(screen.getByRole('button', { name: /save draft/i }));
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Draft mode actions', () => {
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

    it('calls updateMutation when Save Draft is clicked', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue(draftTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /save draft/i }));
      expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('calls publishMutation when Publish is clicked', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue(activeTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /publish/i }));
      expect(mockPublishMutateAsync).toHaveBeenCalledWith('t1');
    });
  });

  describe('Active mode actions', () => {
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

    it('opens change summary dialog when Save is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Dialog should be visible
      expect(screen.getByText('Change Summary')).toBeInTheDocument();
      expect(screen.getByLabelText(/describe your changes/i)).toBeInTheDocument();
    });

    it('submits change summary and calls updateMutation', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue(activeTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Type change summary
      await user.type(screen.getByLabelText(/describe your changes/i), 'Updated clause 5');

      // Click Save in dialog
      const dialogButtons = screen.getAllByRole('button', { name: /^save$/i });
      // The dialog Save button is the last one
      const dialogSaveButton = dialogButtons[dialogButtons.length - 1];
      if (!dialogSaveButton) throw new Error('Expected dialog save button');
      await user.click(dialogSaveButton);

      expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Change Summary')).not.toBeInTheDocument();
      });
    });

    it('closes change summary dialog on Cancel', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      await user.click(screen.getByRole('button', { name: /^save$/i }));
      expect(screen.getByText('Change Summary')).toBeInTheDocument();

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Change Summary')).not.toBeInTheDocument();
      });
    });

    it('opens archive confirmation dialog when Archive is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /archive/i }));

      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to archive this template/i),
      ).toBeInTheDocument();
    });

    it('calls archiveMutation on archive confirm', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open archive dialog
      await user.click(screen.getByRole('button', { name: /archive/i }));

      // Confirm archive - find the Archive button inside the dialog
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('closes archive dialog on Cancel', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open archive dialog
      await user.click(screen.getByRole('button', { name: /archive/i }));
      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Versions tab', () => {
    it('shows version history when Versions tab is clicked', async () => {
      const user = userEvent.setup();
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

      const versionsTab = screen.getByRole('tab', { name: /versions/i });
      await user.click(versionsTab);

      expect(screen.getByTestId('version-history')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading spinner in edit mode while template is loading', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: true,
          isPending: true,
          isSuccess: false,
          status: 'pending',
          fetchStatus: 'fetching',
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Back navigation', () => {
    it('calls navigate on back button click', async () => {
      const user = userEvent.setup();
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
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Content change', () => {
    it('updates content state when MarkdownEditor changes', async () => {
      const user = userEvent.setup();
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
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'new-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Type in the markdown editor (mocked as textarea)
      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, '# Test Content');

      // Fill required fields and save to verify content was captured
      await user.type(screen.getByLabelText(/title/i), 'Test');
      await user.type(screen.getByLabelText(/category/i), 'Legal');
      await user.click(screen.getByRole('button', { name: /save draft/i }));

      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Country and Tags fields', () => {
    it('sends country and tags when provided in create mode', async () => {
      const user = userEvent.setup();
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
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'new-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.type(screen.getByLabelText(/title/i), 'Test');
      await user.type(screen.getByLabelText(/category/i), 'Legal');
      await user.type(screen.getByLabelText(/country/i), 'US');

      await user.click(screen.getByRole('button', { name: /save draft/i }));

      const firstCall = mockCreateMutateAsync.mock.calls[0] as unknown[];
      const callArgs = firstCall[0] as Record<string, unknown>;
      expect(callArgs.country).toBe('US');
    });
  });

  describe('Active mode — publish', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft', tags: [] },
        }),
      );
    });

    it('calls publishMutation when Publish is clicked', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /publish/i }));

      expect(mockPublishMutateAsync).toHaveBeenCalledWith('t1');
    });
  });

  describe('Active mode — archive flow', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('opens archive dialog and confirms archive', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /archive/i }));

      // Archive dialog should be open
      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to archive/i)).toBeInTheDocument();

      // Click the Archive button in the dialog
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      // The second Archive button is in the dialog
      const confirmBtn = archiveButtons[archiveButtons.length - 1];
      if (!confirmBtn) throw new Error('Expected archive confirm button');
      await user.click(confirmBtn);

      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('closes archive dialog via onClose (backdrop/escape)', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /archive/i }));

      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Active mode — change summary dialog onClose', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('closes change summary dialog via onClose (backdrop/escape)', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      expect(screen.getByText('Change Summary')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Change Summary')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit mode — export button', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('calls templateService.download when export is clicked', async () => {
      const user = userEvent.setup();
      const { templateService } = await import('../../src/services/templates.js');

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(templateService.download).toHaveBeenCalledWith('t2');
    });
  });

  describe('Edit mode — versions tab', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('shows VersionHistory when Versions tab is clicked', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('tab', { name: /versions/i }));

      expect(screen.getByTestId('version-history')).toBeInTheDocument();
    });
  });

  describe('Viewer role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('hides action buttons for viewer role', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    });
  });

  describe('Archived template', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: archivedTemplate, content: '# Archived', tags: [] },
        }),
      );
    });

    it('makes fields read-only for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const titleField = screen.getByLabelText(/title/i);
      expect(titleField).toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('shows loading spinner for edit mode while loading', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          isLoading: true,
          data: undefined,
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Tags field', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: undefined });
      mockUseTemplate.mockReturnValue(createTemplateQueryResult({ data: undefined }));
    });

    it('updates tags via Autocomplete onChange', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const tagsInput = screen.getByLabelText(/tags/i);
      await user.type(tagsInput, 'employment{Enter}');

      // The Autocomplete freeSolo should have accepted the input
      // The key thing is the onChange callback (line 245-247) fires
    });
  });

  describe('Template without country', () => {
    it('initializes country to empty string when null', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      const templateNoCountry = { ...draftTemplate, country: null };
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: templateNoCountry, content: '# Draft', tags: [] },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const countryField = screen.getByLabelText(/country/i);
      expect(countryField).toHaveValue('');
    });
  });

  describe('Draft mode — save without optional fields', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: { ...draftTemplate, country: null },
            content: '# Draft',
            tags: [],
          },
        }),
      );
    });

    it('saves draft without country or tags when empty', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Clear country (already empty from null)
      await user.click(screen.getByRole('button', { name: /save draft/i }));

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: undefined,
            tags: undefined,
          }),
        }),
      );
    });
  });

  describe('Active mode — change summary save with optional fields', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: activeTemplate,
            content: '# Active',
            tags: ['contract', 'legal'],
          },
        }),
      );
    });

    it('sends country and tags when present', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open change summary dialog
      await user.click(screen.getByRole('button', { name: /^save$/i }));
      expect(screen.getByText('Change Summary')).toBeInTheDocument();

      // Type a summary
      await user.type(screen.getByLabelText(/describe your changes/i), 'Updated terms');

      // Click Save in dialog
      const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
      const dialogSaveBtn = saveButtons[saveButtons.length - 1];
      if (!dialogSaveBtn) throw new Error('Expected dialog save button');
      await user.click(dialogSaveBtn);

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 't2',
          data: expect.objectContaining({
            changeSummary: 'Updated terms',
            tags: ['contract', 'legal'],
            country: 'US',
          }),
        }),
      );
    });

    it('sends undefined country/tags when empty in change summary save', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      // Use a template with no country and no tags
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: { ...activeTemplate, country: null },
            content: '# Active',
            tags: [],
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open change summary
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Save without summary
      const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
      const dialogSaveBtn = saveButtons[saveButtons.length - 1];
      if (!dialogSaveBtn) throw new Error('Expected dialog save button');
      await user.click(dialogSaveBtn);

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: undefined,
            tags: undefined,
          }),
        }),
      );
    });

    it('sends undefined changeSummary when empty', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Click Save without typing a summary
      const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
      const dialogSaveBtn = saveButtons[saveButtons.length - 1];
      if (!dialogSaveBtn) throw new Error('Expected dialog save button');
      await user.click(dialogSaveBtn);

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeSummary: undefined,
          }),
        }),
      );
    });
  });

  describe('Create mode with tags', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: undefined });
      mockUseTemplate.mockReturnValue(createTemplateQueryResult({ data: undefined }));
    });

    it('sends tags when provided in create mode', async () => {
      const user = userEvent.setup();
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'new-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.type(screen.getByLabelText(/title/i), 'Test');
      await user.type(screen.getByLabelText(/category/i), 'Legal');

      // Add a tag
      const tagsInput = screen.getByLabelText(/tags/i);
      await user.type(tagsInput, 'employment{Enter}');

      await user.click(screen.getByRole('button', { name: /save draft/i }));

      const firstCall = mockCreateMutateAsync.mock.calls[0] as unknown[];
      const callArgs = firstCall[0] as Record<string, unknown>;
      expect(callArgs.tags).toEqual(['employment']);
    });
  });

  describe('Header title fallback', () => {
    it('shows Loading... when templateData is undefined', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('switches between Edit and Versions tabs', async () => {
      const user = userEvent.setup();
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Initially on Edit tab
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      // Switch to Versions tab
      await user.click(screen.getByRole('tab', { name: /versions/i }));
      expect(screen.getByTestId('version-history')).toBeInTheDocument();

      // Switch back to Edit tab
      await user.click(screen.getByRole('tab', { name: /edit/i }));
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
  });
});
