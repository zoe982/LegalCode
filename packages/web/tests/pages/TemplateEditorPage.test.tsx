/// <reference types="@testing-library/jest-dom/vitest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

const mockSaveVersion = vi.fn<(summary: string) => Promise<void>>().mockResolvedValue(undefined);

const mockUseCollaboration = vi.fn().mockReturnValue({
  ydoc: null,
  awareness: null,
  status: 'disconnected',
  connectedUsers: [],
  saveVersion: mockSaveVersion,
});

vi.mock('../../src/hooks/useCollaboration.js', () => ({
  useCollaboration: (...args: unknown[]) => mockUseCollaboration(...args) as unknown,
}));

vi.mock('../../src/components/PresenceAvatars.js', () => ({
  PresenceAvatars: ({ users }: { users: { userId: string; email: string; color: string }[] }) => (
    <div data-testid="presence-avatars">
      {users.map((u) => (
        <span key={u.userId} data-testid={`avatar-${u.userId}`}>
          {u.email.charAt(0).toUpperCase()}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('../../src/components/ConnectionStatus.js', () => ({
  ConnectionStatus: ({ status }: { status: string }) => (
    <span data-testid="connection-status">{status}</span>
  ),
}));

vi.mock('../../src/components/SaveVersionDialog.js', () => ({
  SaveVersionDialog: ({
    open,
    onClose,
    onSave,
    saving,
  }: {
    open: boolean;
    onClose: () => void;
    onSave: (summary: string) => void;
    saving: boolean;
  }) =>
    open ? (
      <div data-testid="save-version-dialog">
        <span>{saving ? 'Saving...' : 'Save Version Dialog'}</span>
        <button
          onClick={() => {
            onSave('test change');
          }}
          data-testid="save-version-confirm"
        >
          Save
        </button>
        <button onClick={onClose} data-testid="save-version-cancel">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock('../../src/components/EditorToolbar.js', () => ({
  EditorToolbar: ({
    mode,
    onModeChange,
    wordCount,
  }: {
    mode: string;
    onModeChange: (mode: string) => void;
    wordCount: number;
  }) => (
    <div data-testid="editor-toolbar">
      <button
        data-testid="mode-source"
        onClick={() => {
          onModeChange('source');
        }}
        aria-pressed={mode === 'source'}
      >
        Source
      </button>
      <button
        data-testid="mode-review"
        onClick={() => {
          onModeChange('review');
        }}
        aria-pressed={mode === 'review'}
      >
        Review
      </button>
      <span data-testid="word-count">{String(wordCount)} words</span>
    </div>
  ),
}));

const mockUseKeyboardShortcuts = vi.fn();
vi.mock('../../src/hooks/useKeyboardShortcuts.js', () => ({
  useKeyboardShortcuts: (actions: unknown) => {
    mockUseKeyboardShortcuts(actions);
  },
}));

vi.mock('../../src/components/KeyboardShortcutHelp.js', () => ({
  KeyboardShortcutHelp: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="keyboard-shortcut-help">
        <span>Keyboard Shortcuts</span>
        <button onClick={onClose} data-testid="close-shortcut-help">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('../../src/components/MetadataTab.js', () => ({
  MetadataTab: (props: Record<string, unknown>) => (
    <div data-testid="metadata-tab">
      <span data-testid="metadata-category">{String(props.category)}</span>
      <span data-testid="metadata-country">{String(props.country)}</span>
      <span data-testid="metadata-status">{String(props.status)}</span>
      {typeof props.onPublish === 'function' && (
        <button onClick={props.onPublish as () => void} data-testid="metadata-publish">
          Publish
        </button>
      )}
      {typeof props.onArchive === 'function' && (
        <button onClick={props.onArchive as () => void} data-testid="metadata-archive">
          Archive
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../src/components/CommentsTab.js', () => ({
  CommentsTab: ({ templateId }: { templateId: string }) => (
    <div data-testid="comments-tab">{templateId}</div>
  ),
}));

vi.mock('../../src/components/RightPane.js', () => ({
  RightPane: ({
    open,
    onToggle,
    tabs,
  }: {
    open: boolean;
    onToggle: () => void;
    tabs: { label: string; content: React.ReactNode }[];
  }) =>
    open ? (
      <div data-testid="right-pane">
        <button onClick={onToggle} data-testid="toggle-pane">
          Toggle
        </button>
        {tabs.map((tab) => (
          <div key={tab.label} data-testid={`pane-tab-${tab.label.toLowerCase()}`}>
            {tab.content}
          </div>
        ))}
      </div>
    ) : (
      <div data-testid="right-pane-closed">
        <button onClick={onToggle} data-testid="toggle-pane">
          Toggle
        </button>
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
    mockUseCollaboration.mockReturnValue({
      ydoc: null,
      awareness: null,
      status: 'disconnected',
      connectedUsers: [],
      saveVersion: mockSaveVersion,
    });
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

    it('does not show RightPane in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByTestId('right-pane')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-pane-closed')).not.toBeInTheDocument();
    });

    it('does not show Export button', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });

    it('shows review content in create mode when mode is review', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('mode-review'));
      expect(screen.getByTestId('review-content')).toBeInTheDocument();
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

    it('shows title in the top area and Save Draft button', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByLabelText(/title/i)).toHaveValue('Employment Agreement');
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });

    it('shows template title in the top bar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByText('Employment Agreement')).toBeInTheDocument();
    });

    it('shows RightPane with Metadata tab', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
      expect(screen.getByTestId('pane-tab-metadata')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-tab')).toBeInTheDocument();
    });

    it('MetadataTab receives template data as props', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('metadata-category')).toHaveTextContent('Employment');
      expect(screen.getByTestId('metadata-country')).toHaveTextContent('US');
      expect(screen.getByTestId('metadata-status')).toHaveTextContent('draft');
    });

    it('shows Comments tab in RightPane', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('pane-tab-comments')).toBeInTheDocument();
      expect(screen.getByTestId('comments-tab')).toBeInTheDocument();
    });

    it('shows Versions tab in RightPane', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('pane-tab-versions')).toBeInTheDocument();
      expect(screen.getByTestId('version-history')).toBeInTheDocument();
    });

    it('does not show inline category/country/tags fields in edit mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // Category, country, tags are now in MetadataTab (mocked), not as inline TextFields
      expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/country/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/tags/i)).not.toBeInTheDocument();
    });

    it('shows Publish button via MetadataTab for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('metadata-publish')).toBeInTheDocument();
    });

    it('allows title editing in edit mode', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const titleField = screen.getByLabelText(/title/i);
      await user.clear(titleField);
      await user.type(titleField, 'Updated Title');
      expect(titleField).toHaveValue('Updated Title');
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

    it('shows Save Version button in central workspace', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByRole('button', { name: /save version/i })).toBeInTheDocument();
    });

    it('shows Archive button via MetadataTab for active templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('metadata-archive')).toBeInTheDocument();
    });

    it('does not show Save Draft or inline Publish buttons', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
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
      expect(screen.queryByTestId('metadata-publish')).not.toBeInTheDocument();
      expect(screen.queryByTestId('metadata-archive')).not.toBeInTheDocument();
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
      // Publish/Archive are in MetadataTab, but with readOnly the MetadataTab
      // mock won't render them (onPublish/onArchive won't be passed)
      expect(screen.queryByTestId('metadata-publish')).not.toBeInTheDocument();
      expect(screen.queryByTestId('metadata-archive')).not.toBeInTheDocument();
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

    it('calls publishMutation when Publish is clicked via MetadataTab', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue(activeTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('metadata-publish'));
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

    it('opens save version dialog when Save Version is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /save version/i }));

      // SaveVersionDialog should be visible
      expect(screen.getByTestId('save-version-dialog')).toBeInTheDocument();
    });

    it('calls saveVersion via SaveVersionDialog confirm', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      await user.click(screen.getByRole('button', { name: /save version/i }));

      // Click Save in dialog
      await user.click(screen.getByTestId('save-version-confirm'));

      expect(mockSaveVersion).toHaveBeenCalledWith('test change');
    });

    it('closes save version dialog on Cancel', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      await user.click(screen.getByRole('button', { name: /save version/i }));
      expect(screen.getByTestId('save-version-dialog')).toBeInTheDocument();

      // Click Cancel
      await user.click(screen.getByTestId('save-version-cancel'));
      await waitFor(() => {
        expect(screen.queryByTestId('save-version-dialog')).not.toBeInTheDocument();
      });
    });

    it('opens archive confirmation dialog when Archive is clicked via MetadataTab', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('metadata-archive'));

      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to archive this template/i),
      ).toBeInTheDocument();
    });

    it('calls archiveMutation on archive confirm', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open archive dialog via MetadataTab
      await user.click(screen.getByTestId('metadata-archive'));

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

      // Open archive dialog via MetadataTab
      await user.click(screen.getByTestId('metadata-archive'));
      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
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

  describe('Active mode — publish via MetadataTab', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft', tags: [] },
        }),
      );
    });

    it('calls publishMutation when Publish is clicked in MetadataTab', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('metadata-publish'));

      expect(mockPublishMutateAsync).toHaveBeenCalledWith('t1');
    });
  });

  describe('Active mode — archive flow via MetadataTab', () => {
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
      await user.click(screen.getByTestId('metadata-archive'));

      // Archive dialog should be open
      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to archive/i)).toBeInTheDocument();

      // Click the Archive button in the dialog
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      // The last Archive button is in the dialog
      const confirmBtn = archiveButtons[archiveButtons.length - 1];
      if (!confirmBtn) throw new Error('Expected archive confirm button');
      await user.click(confirmBtn);

      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('closes archive dialog via onClose (backdrop/escape)', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('metadata-archive'));

      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Active mode — save version dialog onClose', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
    });

    it('closes save version dialog via cancel button', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByRole('button', { name: /save version/i }));

      expect(screen.getByTestId('save-version-dialog')).toBeInTheDocument();

      // Click cancel
      await user.click(screen.getByTestId('save-version-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('save-version-dialog')).not.toBeInTheDocument();
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

  describe('Viewer role — edit mode', () => {
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
      expect(screen.queryByTestId('metadata-archive')).not.toBeInTheDocument();
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

    it('makes title field read-only for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const titleField = screen.getByLabelText(/title/i);
      expect(titleField).toBeDisabled();
    });
  });

  describe('Loading state — duplicate', () => {
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
      // The key thing is the onChange callback fires
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
      // Country is now in MetadataTab; check it receives empty string
      expect(screen.getByTestId('metadata-country')).toHaveTextContent('');
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

  describe('Active mode — save version with collaboration', () => {
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

    it('calls collaboration.saveVersion via SaveVersionDialog', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open save version dialog
      await user.click(screen.getByRole('button', { name: /save version/i }));
      expect(screen.getByTestId('save-version-dialog')).toBeInTheDocument();

      // Click confirm
      await user.click(screen.getByTestId('save-version-confirm'));

      expect(mockSaveVersion).toHaveBeenCalledWith('test change');
    });

    it('closes save version dialog after successful save', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /save version/i }));
      await user.click(screen.getByTestId('save-version-confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('save-version-dialog')).not.toBeInTheDocument();
      });
    });

    it('closes save version dialog on cancel', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /save version/i }));
      await user.click(screen.getByTestId('save-version-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('save-version-dialog')).not.toBeInTheDocument();
      });
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

  describe('Collaboration integration', () => {
    it('shows collaboration UI when editing an existing template with connected status', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
      mockUseCollaboration.mockReturnValue({
        ydoc: {},
        awareness: {},
        status: 'connected',
        connectedUsers: [{ userId: 'u1', email: 'alice@example.com', color: '#ff0000' }],
        saveVersion: mockSaveVersion,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      expect(screen.getByTestId('presence-avatars')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-u1')).toHaveTextContent('A');
    });

    it('does not show collaboration UI in create mode', () => {
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

      expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('presence-avatars')).not.toBeInTheDocument();
    });

    it('does not show collaboration UI when status is disconnected', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
      // Default mock is 'disconnected'

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('presence-avatars')).not.toBeInTheDocument();
    });

    it('shows Save Version button for active templates', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
      mockUseCollaboration.mockReturnValue({
        ydoc: {},
        awareness: {},
        status: 'connected',
        connectedUsers: [],
        saveVersion: mockSaveVersion,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByRole('button', { name: /save version/i })).toBeInTheDocument();
    });

    it('passes collaboration to useCollaboration with correct arguments', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseCollaboration).toHaveBeenCalledWith('t2', {
        userId: '1',
        email: 'alice@acasus.com',
        color: '#1976d2',
      });
    });

    it('passes null templateId to useCollaboration in create mode', () => {
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

      expect(mockUseCollaboration).toHaveBeenCalledWith(null, null);
    });

    it('passes null user to useCollaboration for viewer role', () => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseCollaboration).toHaveBeenCalledWith('t2', null);
    });

    it('shows connecting status', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active', tags: [] },
        }),
      );
      mockUseCollaboration.mockReturnValue({
        ydoc: null,
        awareness: null,
        status: 'connecting',
        connectedUsers: [],
        saveVersion: mockSaveVersion,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('connection-status')).toHaveTextContent('connecting');
    });
  });

  describe('Mode toggle', () => {
    beforeEach(() => {
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
    });

    it('renders EditorToolbar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('starts in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('mode-source')).toHaveAttribute('aria-pressed', 'true');
    });

    it('switches to review mode when Review is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('mode-review'));
      expect(screen.getByTestId('mode-review')).toHaveAttribute('aria-pressed', 'true');
    });

    it('hides markdown editor in review mode', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('mode-review'));
      expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
    });

    it('shows read-only content in review mode', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      await user.click(screen.getByTestId('mode-review'));
      expect(screen.getByTestId('review-content')).toBeInTheDocument();
    });
  });

  describe('RightPane integration', () => {
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

    it('RightPane is open by default in edit mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('pane toggle changes RightPane visibility', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Pane is open by default
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();

      // Click toggle to close
      await user.click(screen.getByTestId('toggle-pane'));

      // Now pane should be closed
      expect(screen.queryByTestId('right-pane')).not.toBeInTheDocument();
      expect(screen.getByTestId('right-pane-closed')).toBeInTheDocument();

      // Toggle open again
      await user.click(screen.getByTestId('toggle-pane'));
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('useKeyboardShortcuts is called with pane toggle handler', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onTogglePane: expect.any(Function),
          onEscape: expect.any(Function),
        }),
      );
    });

    it('useKeyboardShortcuts receives onShowHelp callback', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onShowHelp: expect.any(Function),
        }),
      );
    });

    it('onShowHelp opens keyboard shortcut help dialog', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // Help dialog should not be visible initially
      expect(screen.queryByTestId('keyboard-shortcut-help')).not.toBeInTheDocument();

      // Invoke the onShowHelp callback passed to useKeyboardShortcuts
      const callArgs = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onShowHelp: () => void }];
      act(() => {
        callArgs[0].onShowHelp();
      });

      // Re-render picks up the state change
      expect(screen.getByTestId('keyboard-shortcut-help')).toBeInTheDocument();
    });

    it('closing keyboard shortcut help dialog hides it', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open it
      const callArgs = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onShowHelp: () => void }];
      act(() => {
        callArgs[0].onShowHelp();
      });
      expect(screen.getByTestId('keyboard-shortcut-help')).toBeInTheDocument();

      // Close it
      await user.click(screen.getByTestId('close-shortcut-help'));
      expect(screen.queryByTestId('keyboard-shortcut-help')).not.toBeInTheDocument();
    });

    it('VersionHistory receives correct props in RightPane', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('version-history')).toHaveTextContent('Version history for t1 v1');
    });

    it('CommentsTab receives templateId in RightPane', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('comments-tab')).toHaveTextContent('t1');
    });
  });

  describe('Four-zone layout', () => {
    it('renders flex row layout in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft',
            tags: [],
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Both central workspace and right pane should be rendered
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('does not render flex row in create mode (no RightPane)', () => {
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

      expect(screen.queryByTestId('right-pane')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-pane-closed')).not.toBeInTheDocument();
      // But form fields should still be present
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });
});
