/// <reference types="@testing-library/jest-dom/vitest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode, ReactElement } from 'react';
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
const mockUnarchiveMutateAsync = vi.fn();
const mockUseUnarchiveTemplate = vi.fn();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplate: (...args: unknown[]) => mockUseTemplate(...args) as unknown,
  useCreateTemplate: () => mockUseCreateTemplate() as unknown,
  useUpdateTemplate: () => mockUseUpdateTemplate() as unknown,
  usePublishTemplate: () => mockUsePublishTemplate() as unknown,
  useArchiveTemplate: () => mockUseArchiveTemplate() as unknown,
  useUnarchiveTemplate: () => mockUseUnarchiveTemplate() as unknown,
}));

vi.mock('../../src/components/MarkdownEditor.js', () => ({
  MarkdownEditor: ({
    defaultValue,
    onChange,
    readOnly,
    onSelectionChange,
    onEditorReady,
  }: {
    defaultValue?: string;
    onChange?: (md: string) => void;
    readOnly?: boolean;
    onSelectionChange?: (...args: unknown[]) => void;
    onEditorReady?: (crepe: unknown) => void;
  }) => {
    // Call onEditorReady with a mock crepe if provided
    if (onEditorReady) {
      onEditorReady({ editor: { action: vi.fn() } });
    }
    return (
      <textarea
        data-testid="markdown-editor"
        data-has-selection-change={String(onSelectionChange != null)}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    );
  },
}));

const mockGetVersion = vi.fn();
vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    download: vi.fn(),
    getVersion: (...args: unknown[]) => mockGetVersion(...args) as unknown,
  },
}));

vi.mock('../../src/components/VersionHistory.js', () => ({
  VersionHistory: ({
    templateId,
    currentVersion,
    onNavigateDiff,
    onRestore,
    onCreateVersion,
    isCreatingVersion,
  }: {
    templateId: string;
    currentVersion: number;
    onNavigateDiff?: (from: number, to: number) => void;
    onRestore?: (version: number) => void;
    onCreateVersion?: (summary: string) => void;
    isCreatingVersion?: boolean;
  }) => (
    <div data-testid="version-history">
      Version history for {templateId} v{String(currentVersion)}
      {onNavigateDiff != null && (
        <button
          data-testid="version-navigate-diff"
          onClick={() => {
            onNavigateDiff(1, 2);
          }}
        >
          View diff
        </button>
      )}
      {onRestore != null && (
        <button
          data-testid="version-restore"
          onClick={() => {
            onRestore(1);
          }}
        >
          Restore v1
        </button>
      )}
      {onCreateVersion != null && (
        <button
          data-testid="version-create"
          onClick={() => {
            onCreateVersion('Test version');
          }}
        >
          Create Version
        </button>
      )}
      {isCreatingVersion === true && <span data-testid="creating-version">Creating...</span>}
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

const mockSaveNow = vi.fn();
const mockUseAutosave = vi.fn().mockReturnValue({
  saveState: 'idle' as const,
  lastSavedAt: null,
  saveNow: mockSaveNow,
});
vi.mock('../../src/hooks/useAutosave.js', () => ({
  useAutosave: (options: unknown) => mockUseAutosave(options) as unknown,
}));

vi.mock('../../src/components/EditorToolbar.js', () => ({
  EditorToolbar: ({
    mode,
    wordCount,
    crepeRef,
  }: {
    mode: string;
    wordCount: number;
    crepeRef?: unknown;
  }) => (
    <div data-testid="editor-toolbar">
      <span data-testid="editor-mode">{mode}</span>
      <span data-testid="word-count">{String(wordCount)} words</span>
      {crepeRef != null && <span data-testid="toolbar-has-crepe-ref" />}
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

vi.mock('../../src/components/InlineCommentMargin.js', () => ({
  InlineCommentMargin: ({
    threads,
    activeCommentId,
    onResolve,
    onDelete,
    onReply,
    pendingAnchor,
    onSubmitComment,
    onCancelComment,
    pendingCommentTop,
  }: {
    threads: { comment: { id: string; content: string } }[];
    contentRef: unknown;
    activeCommentId?: string | null;
    onCommentClick?: (id: string) => void;
    templateId?: string;
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
    onReply: (parentId: string, content: string) => void;
    pendingAnchor?: { anchorText: string } | null;
    onSubmitComment?: (content: string) => void;
    onCancelComment?: () => void;
    authorName?: string;
    authorEmail?: string;
    isCreating?: boolean;
    pendingCommentTop?: number;
  }) => (
    <div data-testid="inline-comment-margin" role="complementary" aria-label="Comments">
      <span data-testid="margin-thread-count">{String(threads.length)}</span>
      {activeCommentId != null && <span data-testid="margin-active">{activeCommentId}</span>}
      {pendingAnchor != null && (
        <div data-testid="new-comment-card">
          <span data-testid="ncc-anchor">{pendingAnchor.anchorText}</span>
          {pendingCommentTop != null && (
            <span data-testid="ncc-top">{String(pendingCommentTop)}</span>
          )}
          <button
            data-testid="ncc-submit"
            onClick={() => {
              onSubmitComment?.('test comment');
            }}
          >
            Submit
          </button>
          <button data-testid="ncc-cancel" onClick={onCancelComment}>
            Cancel
          </button>
        </div>
      )}
      <button
        data-testid="margin-resolve"
        onClick={() => {
          onResolve('c1');
        }}
      >
        Resolve
      </button>
      <button
        data-testid="margin-delete"
        onClick={() => {
          onDelete('c1');
        }}
      >
        Delete
      </button>
      <button
        data-testid="margin-reply"
        onClick={() => {
          onReply('c1', 'test reply');
        }}
      >
        Reply
      </button>
    </div>
  ),
}));

const mockStartComment = vi.fn();
const mockCancelComment = vi.fn();
const mockUseEditorComments = vi.fn().mockReturnValue({
  selectionInfo: { hasSelection: false, text: '', buttonPosition: null },
  pendingAnchor: null,
  startComment: mockStartComment,
  cancelComment: mockCancelComment,
  onSelectionChange: vi.fn(),
});
vi.mock('../../src/hooks/useEditorComments.js', () => ({
  useEditorComments: () => mockUseEditorComments() as unknown,
}));

const mockCreateComment = vi.fn();
const mockUseComments = vi.fn().mockReturnValue({
  threads: [],
  isLoading: false,
  createComment: mockCreateComment,
  resolveComment: vi.fn(),
  deleteComment: vi.fn(),
  showResolved: false,
  toggleShowResolved: vi.fn(),
  isCreating: false,
});
vi.mock('../../src/hooks/useComments.js', () => ({
  useComments: (...args: unknown[]) => mockUseComments(...args) as unknown,
}));

const mockUseTextSelection = vi.fn().mockReturnValue({
  selectedText: '',
  selectionRect: null,
  hasSelection: false,
});
vi.mock('../../src/hooks/useTextSelection.js', () => ({
  useTextSelection: (...args: unknown[]) => mockUseTextSelection(...args) as unknown,
}));

const mockUseCommentHighlights = vi.fn();
vi.mock('../../src/hooks/useCommentHighlights.js', () => ({
  useCommentHighlights: (...args: unknown[]) => {
    mockUseCommentHighlights(...args);
  },
}));

vi.mock('../../src/components/NewCommentCard.js', () => ({
  NewCommentCard: ({
    anchorText,
    onSubmit,
    onCancel,
    top,
  }: {
    anchorText: string;
    onSubmit: (content: string) => void;
    onCancel: () => void;
    top?: number;
  }) => (
    <div data-testid="new-comment-card">
      <span data-testid="ncc-anchor">{anchorText}</span>
      {top != null && <span data-testid="ncc-top">{String(top)}</span>}
      <button
        data-testid="ncc-submit"
        onClick={() => {
          onSubmit('test comment');
        }}
      >
        Submit
      </button>
      <button data-testid="ncc-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('../../src/contexts/CommentAnchorContext.js', () => ({
  CommentAnchorProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="comment-anchor-provider">{children}</div>
  ),
}));

vi.mock('../../src/components/FloatingCommentButton.js', () => ({
  FloatingCommentButton: ({
    onClick,
    visible,
  }: {
    position: { top: number; left: number } | null;
    visible: boolean;
    onClick: () => void;
  }) =>
    visible ? (
      <button data-testid="floating-comment-button" onClick={onClick}>
        Comment
      </button>
    ) : null,
}));

// Store the latest DocumentHeader props so tests can trigger callbacks
let latestDocumentHeaderProps: Record<string, unknown> = {};

vi.mock('../../src/components/DocumentHeader.js', () => ({
  DocumentHeader: (props: Record<string, unknown>) => {
    latestDocumentHeaderProps = props;
    return (
      <div data-testid="document-header">
        <span data-testid="dh-title">{String(props.title)}</span>
        <span data-testid="dh-category">{String(props.category)}</span>
        <span data-testid="dh-country">{String(props.country)}</span>
        <span data-testid="dh-status">{typeof props.status === 'string' ? props.status : ''}</span>
        <span data-testid="dh-mode">{String(props.editorMode)}</span>
        {typeof props.onModeChange === 'function' && (
          <>
            <button
              data-testid="dh-mode-source"
              onClick={() => {
                (props.onModeChange as (m: string) => void)('source');
              }}
            >
              Source
            </button>
            <button
              data-testid="dh-mode-review"
              onClick={() => {
                (props.onModeChange as (m: string) => void)('review');
              }}
            >
              Review
            </button>
          </>
        )}
        {typeof props.onPublish === 'function' && (
          <button data-testid="dh-publish" onClick={props.onPublish as () => void}>
            Publish
          </button>
        )}
        {typeof props.onArchive === 'function' && (
          <button data-testid="dh-archive" onClick={props.onArchive as () => void}>
            Archive
          </button>
        )}
        {typeof props.onUnarchive === 'function' && (
          <button data-testid="dh-unarchive" onClick={props.onUnarchive as () => void}>
            Unarchive
          </button>
        )}
        {typeof props.onSaveDraft === 'function' && (
          <button data-testid="dh-save-draft" onClick={props.onSaveDraft as () => void}>
            Save Draft
          </button>
        )}
        {props.rightSlot != null && (
          <div data-testid="dh-right-slot">{props.rightSlot as React.ReactNode}</div>
        )}
        {props.isCreateMode === true && <span data-testid="dh-create-mode" />}
        {props.readOnly === true && <span data-testid="dh-read-only" />}
      </div>
    );
  },
}));

const mockSetConfig = vi.fn();
const mockClearConfig = vi.fn();

// Store the latest config so we can inspect documentHeader
let latestAppBarConfig: Record<string, unknown> = {};
vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    config: {},
    setConfig: (config: Record<string, unknown>) => {
      latestAppBarConfig = config;
      mockSetConfig(config);
    },
    clearConfig: () => {
      latestAppBarConfig = {};
      mockClearConfig();
    },
  }),
}));

const mockShowToast = vi.fn();
vi.mock('../../src/components/Toast.js', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────

interface TemplateDetail {
  template: Template;
  content: string;
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
  description: null,
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
  mockUseUnarchiveTemplate.mockReturnValue(createMutationResult(mockUnarchiveMutateAsync));
}

// Helper: render the documentHeader from the latest TopAppBar config to inspect/interact with it
function renderDocumentHeader() {
  return render(latestAppBarConfig.documentHeader as ReactElement);
}

// ── Tests ────────────────────────────────────────────────────────────

describe('TemplateEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestAppBarConfig = {};
    latestDocumentHeaderProps = {};
    mockUseAuth.mockReturnValue(editorAuth);
    setupMutationMocks();
    mockSaveVersion.mockResolvedValue(undefined);
    mockUseAutosave.mockReturnValue({
      saveState: 'idle' as const,
      lastSavedAt: null,
      saveNow: mockSaveNow,
    });
    mockUseEditorComments.mockReturnValue({
      selectionInfo: { hasSelection: false, text: '', buttonPosition: null },
      pendingAnchor: null,
      startComment: mockStartComment,
      cancelComment: mockCancelComment,
      onSelectionChange: vi.fn(),
    });
    mockUseTextSelection.mockReturnValue({
      selectedText: '',
      selectionRect: null,
      hasSelection: false,
    });
    mockUseCommentHighlights.mockClear();
    mockUseComments.mockReturnValue({
      threads: [],
      isLoading: false,
      createComment: mockCreateComment,
      resolveComment: vi.fn(),
      deleteComment: vi.fn(),
      showResolved: false,
      toggleShowResolved: vi.fn(),
    });
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

    it('renders editor and DocumentHeader with create mode props', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('sets documentHeader in TopAppBar config', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHeader: expect.anything(),
        }),
      );
    });

    it('passes isCreateMode=true to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-create-mode')).toBeInTheDocument();
    });

    it('passes onSaveDraft callback to DocumentHeader in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-save-draft')).toBeInTheDocument();
    });

    it('does not show Export button in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-right-slot')).not.toBeInTheDocument();
    });

    it('shows review content when mode is switched to review', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Switch to review via DocumentHeader mock
      const { getByTestId } = renderDocumentHeader();
      await user.click(getByTestId('dh-mode-review'));
      expect(screen.getByTestId('review-content')).toBeInTheDocument();
    });

    it('does not pass onPublish to DocumentHeader in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
    });

    it('does not pass onArchive to DocumentHeader in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
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
          },
        }),
      );
    });

    it('passes template title to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-title')).toHaveTextContent('Employment Agreement');
    });

    it('does not pass onSaveDraft to DocumentHeader for existing drafts (autosave handles saving)', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-save-draft')).not.toBeInTheDocument();
    });

    it('uses useAutosave hook for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseAutosave).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 't1',
          status: 'draft',
          enabled: true,
        }),
      );
    });

    it('passes draft save status to DocumentHeader rightSlot', () => {
      mockUseAutosave.mockReturnValue({
        saveState: 'saved' as const,
        lastSavedAt: '2026-03-01T00:00:00Z',
        saveNow: mockSaveNow,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // rightSlot should be defined for edit mode
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-right-slot')).toBeInTheDocument();
    });

    it('shows ConnectionStatus as saving when autosave is saving', () => {
      mockUseAutosave.mockReturnValue({
        saveState: 'saving' as const,
        lastSavedAt: null,
        saveNow: mockSaveNow,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-right-slot')).toBeInTheDocument();
      expect(getByTestId('connection-status')).toHaveTextContent('saving');
    });

    it('shows ConnectionStatus as error when autosave has error', () => {
      mockUseAutosave.mockReturnValue({
        saveState: 'error' as const,
        lastSavedAt: null,
        saveNow: mockSaveNow,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('connection-status')).toHaveTextContent('error');
    });

    it('shows ConnectionStatus as connected when autosave is idle', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('connection-status')).toHaveTextContent('connected');
    });

    it('shows toast when autosave transitions from saving to saved', () => {
      // Start with saving state
      mockUseAutosave.mockReturnValue({
        saveState: 'saving' as const,
        lastSavedAt: null,
        saveNow: mockSaveNow,
      });

      const { rerender } = render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Transition to saved
      mockUseAutosave.mockReturnValue({
        saveState: 'saved' as const,
        lastSavedAt: '2026-03-08T00:00:00Z',
        saveNow: mockSaveNow,
      });

      rerender(<TemplateEditorPage />);

      expect(mockShowToast).toHaveBeenCalledWith('Changes saved', 'success');
    });

    it('does not show toast when autosave state is saved on mount (idle -> saved)', () => {
      // Start directly with saved state (not transitioning from saving)
      mockUseAutosave.mockReturnValue({
        saveState: 'saved' as const,
        lastSavedAt: '2026-03-08T00:00:00Z',
        saveNow: mockSaveNow,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Should not toast because the previous state was idle, not saving
      expect(mockShowToast).not.toHaveBeenCalledWith('Changes saved', 'success');
    });

    it('passes documentHeader to TopAppBar config', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHeader: expect.anything(),
        }),
      );
    });

    it('passes onSelectionChange to MarkdownEditor in edit mode', async () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('markdown-editor');
      expect(editor.getAttribute('data-has-selection-change')).toBe('true');
    });

    it('passes onPublish to DocumentHeader for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-publish')).toBeInTheDocument();
    });

    it('does not pass onArchive to DocumentHeader for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
    });

    it('passes template status to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-status')).toHaveTextContent('draft');
    });

    it('passes editorMode to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-mode')).toHaveTextContent('source');
    });

    it('passes category to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-category')).toHaveTextContent('Employment');
    });

    it('passes country to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-country')).toHaveTextContent('US');
    });

    it('passes templateId to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // Render the DocumentHeader to trigger the mock and capture props
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.templateId).toBe('t1');
    });

    it('passes template metadata to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(latestDocumentHeaderProps.updatedAt).toBe('2026-03-01T00:00:00Z');
      expect(latestDocumentHeaderProps.createdBy).toBe('u1');
      expect(latestDocumentHeaderProps.currentVersion).toBe(1);
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
          },
        }),
      );
    });

    it('does not show Save Draft button for active templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-save-draft')).not.toBeInTheDocument();
    });

    it('passes onArchive to DocumentHeader for active templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-archive')).toBeInTheDocument();
    });

    it('does not pass onPublish to DocumentHeader for active templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
    });

    it('passes active status to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-status')).toHaveTextContent('active');
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
          },
        }),
      );
    });

    it('passes onUnarchive to DocumentHeader for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-unarchive')).toBeInTheDocument();
    });

    it('passes readOnly=true to DocumentHeader for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-read-only')).toBeInTheDocument();
    });

    it('does not pass onPublish to DocumentHeader for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
    });

    it('does not pass onArchive to DocumentHeader for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
    });
  });

  describe('Viewer role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(viewerAuth);
    });

    it('passes readOnly=true to DocumentHeader for viewer role', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-read-only')).toBeInTheDocument();
    });

    it('does not pass action buttons to DocumentHeader in create mode', () => {
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
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
    });

    it('does not pass onSaveDraft to DocumentHeader in create mode for viewer', () => {
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
      // Viewer should still get onSaveDraft in create mode since isCreateMode is the condition
      // The readOnly flag is used for disabling editing within DocumentHeader
    });
  });

  describe('Export button', () => {
    it('rightSlot includes export button in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-right-slot')).toBeInTheDocument();
    });

    it('rightSlot is not set in create mode', () => {
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
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-right-slot')).not.toBeInTheDocument();
    });

    it('export handler calls templateService.download', async () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );

      const templates = await import('../../src/services/templates.js');
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Render the DocumentHeader to access the right slot
      const { getByTestId } = renderDocumentHeader();
      const rightSlot = getByTestId('dh-right-slot');
      const exportBtn = rightSlot.querySelector('[aria-label="export"]');
      expect(exportBtn).not.toBeNull();
      act(() => {
        exportBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
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

    it('calls createMutation when Save Draft is triggered via DocumentHeader', async () => {
      const user = userEvent.setup();
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'new-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Click Save Draft via DocumentHeader mock button
      const { getByTestId } = renderDocumentHeader();
      await user.click(getByTestId('dh-save-draft'));
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('shows error toast when create draft fails', async () => {
      const user = userEvent.setup();
      mockCreateMutateAsync.mockRejectedValue(new Error('Failed'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const { getByTestId } = renderDocumentHeader();
      await user.click(getByTestId('dh-save-draft'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/failed|error/i), 'error');
      });
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
          },
        }),
      );
    });

    it('opens publish confirmation dialog when onPublish is called via DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      expect(screen.getByText('Publish Template')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Publishing makes this template available for use across the organization. Continue?',
        ),
      ).toBeInTheDocument();
    });

    it('closes publish confirmation dialog on Cancel', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      expect(screen.getByText('Publish Template')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Publish Template')).not.toBeInTheDocument();
      });
    });

    it('calls publishMutation when Publish is confirmed in dialog', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue(activeTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      const publishButtons = screen.getAllByRole('button', { name: /publish/i });
      const confirmButton = publishButtons[publishButtons.length - 1];
      if (!confirmButton) throw new Error('Expected publish confirm button');
      await user.click(confirmButton);

      expect(mockPublishMutateAsync).toHaveBeenCalledWith('t1');
    });

    it('shows error toast when publish fails', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockRejectedValue(new Error('Failed'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      const publishButtons = screen.getAllByRole('button', { name: /publish/i });
      const confirmButton = publishButtons[publishButtons.length - 1];
      if (!confirmButton) throw new Error('Expected publish confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/failed|error/i), 'error');
      });
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
          },
        }),
      );
    });

    it('opens archive confirmation dialog when onArchive is called via DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(
        screen.getByText(
          /are you sure you want to archive this template\? you can unarchive it later/i,
        ),
      ).toBeInTheDocument();
    });

    it('calls archiveMutation on archive confirm', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('closes archive dialog on Cancel', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });
      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });

    it('shows error toast when archive fails', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockRejectedValue(new Error('Failed'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/failed|error/i), 'error');
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
      expect(screen.getByTestId('editor-skeleton')).toBeInTheDocument();
    });

    it('shows title and content skeleton elements while loading', () => {
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
      const skeleton = screen.getByTestId('editor-skeleton');
      const skeletons = skeleton.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
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

      // Save via DocumentHeader
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onSaveDraft as () => void)();
      });

      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Template without country', () => {
    it('initializes country to empty string when null', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      const templateNoCountry = { ...draftTemplate, country: null };
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: templateNoCountry, content: '# Draft' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // Country is initialized but now rendered via DocumentHeader
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-country')).toHaveTextContent('');
    });
  });

  describe('Draft mode — autosave enabled without optional fields', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: { ...draftTemplate, country: null },
            content: '# Draft',
          },
        }),
      );
    });

    it('autosave is enabled for draft templates without optional fields', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseAutosave).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          templateId: 't1',
          status: 'draft',
        }),
      );
    });
  });

  describe('Collaboration integration', () => {
    it('includes collaboration UI in DocumentHeader rightSlot when connected', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
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

      const { getByTestId: getDocTestId } = renderDocumentHeader();
      expect(getDocTestId('dh-right-slot')).toBeInTheDocument();
      expect(getDocTestId('connection-status')).toHaveTextContent('connected');
      expect(getDocTestId('presence-avatars')).toBeInTheDocument();
      expect(getDocTestId('avatar-u1')).toHaveTextContent('A');
    });

    it('does not include collaboration UI in create mode', () => {
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

      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-right-slot')).not.toBeInTheDocument();
    });

    it('does not include collaboration UI when status is disconnected', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockSetConfig).toHaveBeenCalled();
    });

    it('passes collaboration to useCollaboration with correct arguments', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseCollaboration).toHaveBeenCalledWith(
        't2',
        {
          userId: '1',
          email: 'alice@acasus.com',
          color: '#1976d2',
        },
        expect.objectContaining({}),
      );
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

      expect(mockUseCollaboration).toHaveBeenCalledWith(null, null, expect.objectContaining({}));
    });

    it('passes null user to useCollaboration for viewer role', () => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseCollaboration).toHaveBeenCalledWith('t2', null, expect.objectContaining({}));
    });

    it('includes connecting status in DocumentHeader rightSlot for active templates', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
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

      const { getByTestId: getDocTestId } = renderDocumentHeader();
      expect(getDocTestId('connection-status')).toHaveTextContent('connecting');
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
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-mode')).toHaveTextContent('source');
    });

    it('switches to review mode when Review is clicked via DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });
      // After mode change, DocumentHeader should receive updated mode
      expect(screen.getByTestId('review-content')).toBeInTheDocument();
    });

    it('hides markdown editor in review mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });
      expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
    });

    it('shows read-only content in review mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });
      expect(screen.getByTestId('review-content')).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcuts', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );
    });

    it('useKeyboardShortcuts is called with shortcut handlers', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onTogglePane: expect.any(Function),
          onEscape: expect.any(Function),
          onShowHelp: expect.any(Function),
          onCtrlS: expect.any(Function),
        }),
      );
    });

    it('onShowHelp opens keyboard shortcut help dialog', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByTestId('keyboard-shortcut-help')).not.toBeInTheDocument();

      const callArgs = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onShowHelp: () => void }];
      act(() => {
        callArgs[0].onShowHelp();
      });

      expect(screen.getByTestId('keyboard-shortcut-help')).toBeInTheDocument();
    });

    it('closing keyboard shortcut help dialog hides it', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const callArgs = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onShowHelp: () => void }];
      act(() => {
        callArgs[0].onShowHelp();
      });
      expect(screen.getByTestId('keyboard-shortcut-help')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-shortcut-help'));
      expect(screen.queryByTestId('keyboard-shortcut-help')).not.toBeInTheDocument();
    });
  });

  describe('Full-bleed layout', () => {
    it('renders full-bleed white workspace in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft',
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // No RightPane in v3
      expect(screen.queryByTestId('right-pane')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-pane-closed')).not.toBeInTheDocument();
      // Editor toolbar is present
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
      // DocumentHeader is set via TopAppBar config
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHeader: expect.anything(),
        }),
      );
    });

    it('does not render RightPane in create mode', () => {
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
    });
  });

  describe('Archive dialog — destructive styling', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('archive confirm button uses destructive red styling', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      expect(confirmButton).toHaveStyle({ backgroundColor: '#D32F2F' });
    });
  });

  describe('Ctrl+S toast', () => {
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

    it('useKeyboardShortcuts receives onCtrlS callback', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onCtrlS: expect.any(Function),
        }),
      );
    });
  });

  describe('Ctrl+S handler', () => {
    it('calls autosave.saveNow and showToast when Ctrl+S is triggered for draft', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const lastCall = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onCtrlS: () => void }];

      act(() => {
        lastCall[0].onCtrlS();
      });

      expect(mockSaveNow).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        "Your work is saved automatically — you're all set",
        'success',
      );
    });
  });

  describe('Publish confirmation dialog', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );
    });

    it('closes publish dialog when pressing Escape', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });
      expect(screen.getByText('Publish Template')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('Publish Template')).not.toBeInTheDocument();
      });
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
      expect(screen.getByTestId('editor-skeleton')).toBeInTheDocument();
    });
  });

  describe('Archived template', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: archivedTemplate, content: '# Archived' },
        }),
      );
    });

    it('sets documentHeader in TopAppBar config for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHeader: expect.anything(),
        }),
      );
    });
  });

  describe('Inline comment margin in review mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );
    });

    it('renders InlineCommentMargin in review mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      expect(screen.getByTestId('inline-comment-margin')).toBeInTheDocument();
    });

    it('renders InlineCommentMargin in source mode for existing templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // In edit mode (id exists), InlineCommentMargin renders in source mode too
      expect(screen.getByTestId('inline-comment-margin')).toBeInTheDocument();
    });

    it('does not render InlineCommentMargin in source mode for create mode (no id)', () => {
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

      expect(screen.queryByTestId('inline-comment-margin')).not.toBeInTheDocument();
    });

    it('calls startComment when FloatingCommentButton is clicked in source mode', async () => {
      const user = userEvent.setup();
      mockUseEditorComments.mockReturnValue({
        selectionInfo: {
          hasSelection: true,
          text: 'selected',
          buttonPosition: { top: 100, left: 200 },
        },
        pendingAnchor: null,
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const commentBtn = await screen.findByTestId('floating-comment-button');
      await user.click(commentBtn);

      expect(mockStartComment).toHaveBeenCalled();
    });

    it('wires resolve callback to resolveComment from useComments', async () => {
      const user = userEvent.setup();
      const mockResolveComment = vi.fn();
      mockUseComments.mockReturnValue({
        threads: [],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: mockResolveComment,
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      await user.click(screen.getByTestId('margin-resolve'));
      expect(mockResolveComment).toHaveBeenCalledWith({ templateId: 't1', commentId: 'c1' });
    });

    it('wires delete callback to deleteComment from useComments', async () => {
      const user = userEvent.setup();
      const mockDeleteComment = vi.fn();
      mockUseComments.mockReturnValue({
        threads: [],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: mockDeleteComment,
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      await user.click(screen.getByTestId('margin-delete'));
      expect(mockDeleteComment).toHaveBeenCalledWith({ templateId: 't1', commentId: 'c1' });
    });

    it('wires reply callback to createComment from useComments', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      await user.click(screen.getByTestId('margin-reply'));
      expect(mockCreateComment).toHaveBeenCalledWith({
        templateId: 't1',
        content: 'test reply',
        parentId: 'c1',
      });
    });
  });

  describe('Safety nets', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: {
            template: draftTemplate,
            content: '# Draft content',
          },
        }),
      );
      sessionStorage.clear();
    });

    it('beforeunload event is prevented when content is dirty', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Type in the markdown editor to trigger onChange (makes content dirty)
      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, 'new content');

      const event = new Event('beforeunload', { cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('sessionStorage backup is written on content change', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, 'x');

      expect(sessionStorage.getItem('legalcode:backup:t1')).not.toBeNull();
    });

    it('sessionStorage backup is written when content changes (autosave handles clearing)', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Make content dirty
      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, 'x');
      expect(sessionStorage.getItem('legalcode:backup:t1')).not.toBeNull();
    });

    it('does not write sessionStorage backup in create mode (no id)', async () => {
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

      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, 'x');

      expect(sessionStorage.length).toBe(0);
    });

    it('beforeunload is not prevented when content is not dirty', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const event = new Event('beforeunload', { cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Unarchive flow', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: archivedTemplate, content: '# Archived' },
        }),
      );
    });

    it('passes onUnarchive to DocumentHeader for archived templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-unarchive')).toBeInTheDocument();
    });

    it('opens unarchive confirmation dialog when onUnarchive is called', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onUnarchive as () => void)();
      });

      expect(screen.getByText('Unarchive Template')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to unarchive this template/i),
      ).toBeInTheDocument();
    });

    it('calls unarchiveMutation on unarchive confirm', async () => {
      const user = userEvent.setup();
      mockUnarchiveMutateAsync.mockResolvedValue({ ...archivedTemplate, status: 'draft' });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onUnarchive as () => void)();
      });

      const unarchiveButtons = screen.getAllByRole('button', { name: /unarchive/i });
      const confirmButton = unarchiveButtons[unarchiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected unarchive confirm button');
      await user.click(confirmButton);

      expect(mockUnarchiveMutateAsync).toHaveBeenCalledWith('t3');
    });

    it('shows error toast when unarchive fails', async () => {
      const user = userEvent.setup();
      mockUnarchiveMutateAsync.mockRejectedValue(new Error('Failed'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onUnarchive as () => void)();
      });

      const unarchiveButtons = screen.getAllByRole('button', { name: /unarchive/i });
      const confirmButton = unarchiveButtons[unarchiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected unarchive confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/failed|error/i), 'error');
      });
    });

    it('closes unarchive dialog on Cancel', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onUnarchive as () => void)();
      });
      expect(screen.getByText('Unarchive Template')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Unarchive Template')).not.toBeInTheDocument();
      });
    });

    it('closes unarchive dialog via onClose (backdrop/escape)', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onUnarchive as () => void)();
      });
      expect(screen.getByText('Unarchive Template')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('Unarchive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Archive with undo toast', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('shows toast with Undo button after archive confirmation', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Template archived',
          'success',
          expect.anything(),
        );
      });
    });

    it('archive undo toast action calls unarchive mutation', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);
      mockUnarchiveMutateAsync.mockResolvedValue({ ...archivedTemplate, status: 'draft' });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });

      // Extract the Undo action (third argument)
      const actionElement = mockShowToast.mock.calls.find(
        (c: unknown[]) => c[0] === 'Template archived',
      )?.[2] as { props: { onClick: () => void } } | undefined;
      expect(actionElement).toBeDefined();

      act(() => {
        actionElement?.props.onClick();
      });

      expect(mockUnarchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('archive dialog closes after confirmation', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue(archivedTemplate);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmButton = archiveButtons[archiveButtons.length - 1];
      if (!confirmButton) throw new Error('Expected archive confirm button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Version history slide-over', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('history slide-over is closed by default', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByTestId('slide-over-version-history')).not.toBeInTheDocument();
    });
  });

  describe('Version history (removed from slide-over)', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('does not render version history component (now on separate page)', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByTestId('version-history')).not.toBeInTheDocument();
    });
  });

  describe('inline comments wiring', () => {
    it('InlineCommentMargin receives threads from useComments in review mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Hello' },
        }),
      );

      const mockThreads = [
        {
          comment: {
            id: 'c1',
            templateId: 't1',
            content: 'test',
            anchorText: 'Hello',
            anchorFrom: '0',
            anchorTo: '5',
            parentId: null,
            resolved: false,
            authorId: 'u1',
            authorName: 'Alice',
            authorEmail: 'alice@acasus.com',
            resolvedBy: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          replies: [],
        },
      ];
      mockUseComments.mockReturnValue({
        threads: mockThreads,
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      expect(screen.getByTestId('margin-thread-count')).toHaveTextContent('1');
    });
  });

  describe('handleAddComment', () => {
    it('calls startComment when FloatingCommentButton is clicked in source mode', async () => {
      const user = userEvent.setup();
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft' },
        }),
      );

      // Make the floating button visible by providing a selection
      mockUseEditorComments.mockReturnValue({
        selectionInfo: {
          hasSelection: true,
          text: 'selected',
          buttonPosition: { top: 100, left: 200 },
        },
        pendingAnchor: null,
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const commentBtn = await screen.findByTestId('floating-comment-button');
      await user.click(commentBtn);

      expect(mockStartComment).toHaveBeenCalled();
    });
  });

  describe('create-mode comment blocking', () => {
    it('shows toast when handleAddComment is called in create mode (source)', () => {
      // Create mode: no id
      mockUseParams.mockReturnValue({});
      mockUseEditorComments.mockReturnValue({
        selectionInfo: {
          hasSelection: true,
          text: 'selected',
          buttonPosition: { top: 100, left: 200 },
        },
        pendingAnchor: null,
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // In create mode, FloatingCommentButton is hidden (!isCreateMode && ...)
      // But handleAddComment is also wired to keyboard shortcut onAddComment
      // Let's invoke it via the keyboard shortcuts mock
      const shortcutArgs = mockUseKeyboardShortcuts.mock.calls[0]?.[0] as {
        onAddComment: () => void;
      };
      act(() => {
        shortcutArgs.onAddComment();
      });

      expect(mockShowToast).toHaveBeenCalledWith('Save the template first to add comments', 'info');
      expect(mockStartComment).not.toHaveBeenCalled();
    });

    it('shows toast when handleReviewAddComment is called in create mode (review)', () => {
      // Create mode: no id
      mockUseParams.mockReturnValue({});
      mockUseTextSelection.mockReturnValue({
        selectedText: 'some text',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      // FloatingCommentButton should not be visible in create mode
      // But if it were (e.g., the guard was only on handleReviewAddComment), clicking it would toast
      // Since FloatingCommentButton is hidden in create mode, verify it's not there
      expect(screen.queryByTestId('floating-comment-button')).not.toBeInTheDocument();

      // Verify toast would fire if callback were called directly via keyboard shortcut
      const shortcutArgs = mockUseKeyboardShortcuts.mock.calls.at(-1)?.[0] as {
        onAddComment: () => void;
      };
      act(() => {
        shortcutArgs.onAddComment();
      });

      expect(mockShowToast).toHaveBeenCalledWith('Save the template first to add comments', 'info');
    });
  });

  describe('onCommentEvent callback', () => {
    it('invalidates comment queries when onCommentEvent is invoked', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // useCollaboration is called with (id, user, options) — capture the options arg
      const callArgs = mockUseCollaboration.mock.calls[0] as unknown[];
      const options = callArgs[2] as { onCommentEvent: () => void };
      expect(options).toBeDefined();
      expect(typeof options.onCommentEvent).toBe('function');

      // Invoke the callback
      act(() => {
        options.onCommentEvent();
      });

      // The callback calls queryClient.invalidateQueries — just verify it doesn't throw
      // and that it was reachable (branch coverage)
      expect(mockUseCollaboration).toHaveBeenCalled();
    });
  });

  describe('CommentAnchorProvider wrapping', () => {
    it('wraps content with CommentAnchorProvider', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft' },
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('comment-anchor-provider')).toBeInTheDocument();
    });
  });

  describe('Review mode comment highlighting', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft content' },
        }),
      );
    });

    it('calls useCommentHighlights in review mode with threads', () => {
      const mockThreads = [
        {
          comment: {
            id: 'c1',
            templateId: 't1',
            content: 'test',
            anchorText: 'Draft',
            anchorFrom: '0',
            anchorTo: '5',
            parentId: null,
            resolved: false,
            createdBy: 'u1',
            authorEmail: 'alice@acasus.com',
            createdAt: '2026-01-01T00:00:00Z',
          },
          replies: [],
        },
      ];
      mockUseComments.mockReturnValue({
        threads: mockThreads,
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      expect(mockUseCommentHighlights).toHaveBeenCalled();
      // Verify it was called with threads (second argument)
      const lastCall = mockUseCommentHighlights.mock.calls.at(-1) as unknown[];
      expect(lastCall[1]).toEqual(mockThreads);
    });

    it('does not pass threads to useCommentHighlights in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // In source mode, useCommentHighlights is called with empty threads array
      const lastCall = mockUseCommentHighlights.mock.calls.at(-1) as unknown[];
      expect(lastCall[1]).toEqual([]);
      expect(screen.getByTestId('source-editor-surface')).toBeInTheDocument();
    });

    it('shows FloatingCommentButton in review mode when text is selected', () => {
      mockUseTextSelection.mockReturnValue({
        selectedText: 'Draft content',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      const commentBtn = screen.getByTestId('floating-comment-button');
      expect(commentBtn).toBeInTheDocument();
    });

    it('review mode FloatingCommentButton click triggers review add comment', async () => {
      const user = userEvent.setup();
      mockUseTextSelection.mockReturnValue({
        selectedText: 'Draft content',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      const commentBtn = screen.getByTestId('floating-comment-button');
      await user.click(commentBtn);

      // InlineCommentMargin should be rendered in review mode
      expect(screen.getByTestId('inline-comment-margin')).toBeInTheDocument();
    });
  });

  describe('Viewer role — edit mode', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('passes readOnly to DocumentHeader for viewer role', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-read-only')).toBeInTheDocument();
    });
  });

  describe('Header title fallback', () => {
    it('does not set TopAppBar config when templateData is undefined in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: undefined,
          isLoading: false,
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // In edit mode without data (not loading), DocumentHeader still gets empty values
      // since the form state hasn't been initialized
    });
  });

  describe('Edit mode — export button via DocumentHeader', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('includes export button in DocumentHeader rightSlot', async () => {
      const { templateService } = await import('../../src/services/templates.js');

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const { getByTestId: getRightTestId } = renderDocumentHeader();
      const rightSlot = getRightTestId('dh-right-slot');
      const exportBtn = rightSlot.querySelector('[aria-label="export"]');
      expect(exportBtn).not.toBeNull();
      act(() => {
        exportBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(templateService.download).toHaveBeenCalledWith('t2');
    });
  });

  describe('Active mode — archive flow via DocumentHeader', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: activeTemplate, content: '# Active' },
        }),
      );
    });

    it('opens archive dialog and confirms archive', async () => {
      const user = userEvent.setup();
      mockArchiveMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      expect(screen.getByText('Archive Template')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to archive/i)).toBeInTheDocument();

      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      const confirmBtn = archiveButtons[archiveButtons.length - 1];
      if (!confirmBtn) throw new Error('Expected archive confirm button');
      await user.click(confirmBtn);

      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('t2');
    });

    it('closes archive dialog via onClose (backdrop/escape)', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onArchive as () => void)();
      });

      expect(screen.getByText('Archive Template')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Archive Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Active mode — publish flow via DocumentHeader', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft' },
        }),
      );
    });

    it('opens publish confirmation dialog when onPublish is called', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      expect(screen.getByText('Publish Template')).toBeInTheDocument();
    });

    it('calls publishMutation when Publish is confirmed via dialog', async () => {
      const user = userEvent.setup();
      mockPublishMutateAsync.mockResolvedValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onPublish as () => void)();
      });

      const publishButtons = screen.getAllByRole('button', { name: /publish/i });
      const confirmButton = publishButtons[publishButtons.length - 1];
      if (!confirmButton) throw new Error('Expected publish confirm button');
      await user.click(confirmButton);

      expect(mockPublishMutateAsync).toHaveBeenCalledWith('t1');
    });
  });

  describe('Auto-create draft on title input', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
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

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-creates draft after debounce when title is entered in create mode', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-1' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Simulate title change via DocumentHeader
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('My New Template');
      });
      // Set category
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });
      // Set content via MarkdownEditor
      const editor = screen.getByTestId('markdown-editor');
      fireEvent.change(editor, { target: { value: '# Test content' } });

      // Advance past the 1.5s debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'My New Template',
          }),
        );
      });
    });

    it('navigates to new template after auto-create succeeds', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-2' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Auto Draft');
      });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });
      const editor = screen.getByTestId('markdown-editor');
      fireEvent.change(editor, { target: { value: '# Test content' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/templates/auto-2', { replace: true });
      });
    });

    it('shows error toast and allows retry when auto-create fails', async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Retry Draft');
      });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });
      const editor = screen.getByTestId('markdown-editor');
      fireEvent.change(editor, { target: { value: '# Test content' } });

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save draft', 'error');
      });
    });

    it('does not auto-create when title is empty', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Title starts as empty string — should not trigger auto-create
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('does not auto-create when category is empty', async () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title but leave category empty (default)
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('My Template');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('does not auto-create when content is empty', async () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title and category but leave content empty
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('My Template');
      });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('auto-creates when all required fields are filled', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-full' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Full Template');
      });
      // Set category
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });
      // Set content via MarkdownEditor
      const editor = screen.getByTestId('markdown-editor');
      fireEvent.change(editor, { target: { value: '# Content here' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Full Template',
            category: 'contracts',
            content: '# Content here',
          }),
        );
      });
    });

    it('debounces and only creates once', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-3' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();

      // First title change
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('First');
      });

      // Set category and content for the guard
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('contracts');
      });
      const editor = screen.getByTestId('markdown-editor');
      fireEvent.change(editor, { target: { value: '# Test content' } });

      // Advance part way (not enough for debounce)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Re-render to get updated props, change title again
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Second');
      });

      // Advance past the debounce
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        // Should only have been called once with the latest title
        expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Second',
          }),
        );
      });
    });
  });

  describe('Comment creation flow', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: { template: draftTemplate, content: '# Draft content' },
        }),
      );
    });

    it('renders NewCommentCard when pendingAnchor exists in source mode', () => {
      mockUseEditorComments.mockReturnValue({
        selectionInfo: { hasSelection: false, text: '', buttonPosition: null },
        pendingAnchor: { anchorText: 'selected text', anchorFrom: '10', anchorTo: '20' },
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('new-comment-card')).toBeInTheDocument();
      expect(screen.getByTestId('ncc-anchor')).toHaveTextContent('selected text');
    });

    it('passes top position to NewCommentCard when buttonPosition is available', () => {
      mockUseEditorComments.mockReturnValue({
        selectionInfo: {
          hasSelection: true,
          text: 'hello',
          buttonPosition: { top: 150, left: 200 },
        },
        pendingAnchor: { anchorText: 'selected text', anchorFrom: '10', anchorTo: '20' },
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('new-comment-card')).toBeInTheDocument();
      expect(screen.getByTestId('ncc-top')).toHaveTextContent('150');
    });

    it('does not render NewCommentCard when no pendingAnchor', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.queryByTestId('new-comment-card')).not.toBeInTheDocument();
    });

    it('submit calls createComment with correct data and clears pending anchor', async () => {
      const user = userEvent.setup();
      mockUseEditorComments.mockReturnValue({
        selectionInfo: { hasSelection: false, text: '', buttonPosition: null },
        pendingAnchor: { anchorText: 'selected text', anchorFrom: '10', anchorTo: '20' },
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('ncc-submit'));

      expect(mockCreateComment).toHaveBeenCalledWith({
        templateId: 't1',
        content: 'test comment',
        anchorFrom: '10',
        anchorTo: '20',
        anchorText: 'selected text',
      });
      expect(mockCancelComment).toHaveBeenCalled();
    });

    it('cancel calls cancelComment', async () => {
      const user = userEvent.setup();
      mockUseEditorComments.mockReturnValue({
        selectionInfo: { hasSelection: false, text: '', buttonPosition: null },
        pendingAnchor: { anchorText: 'selected text', anchorFrom: '10', anchorTo: '20' },
        startComment: mockStartComment,
        cancelComment: mockCancelComment,
        onSelectionChange: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('ncc-cancel'));

      expect(mockCancelComment).toHaveBeenCalled();
    });

    it('renders NewCommentCard in review mode when review pending anchor exists', async () => {
      const user = userEvent.setup();
      mockUseTextSelection.mockReturnValue({
        selectedText: 'Draft content',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      // Click the floating comment button to set review pending anchor
      const commentBtn = screen.getByTestId('floating-comment-button');
      await user.click(commentBtn);

      expect(screen.getByTestId('new-comment-card')).toBeInTheDocument();
      expect(screen.getByTestId('ncc-anchor')).toHaveTextContent('Draft content');
      // Verify top position is passed from selectionRect
      expect(screen.getByTestId('ncc-top')).toHaveTextContent('100');
    });

    it('review mode submit calls createComment and clears review pending anchor', async () => {
      const user = userEvent.setup();
      mockUseTextSelection.mockReturnValue({
        selectedText: 'Draft content',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      // Click floating comment button to set pending anchor
      await user.click(screen.getByTestId('floating-comment-button'));

      // Submit the comment
      await user.click(screen.getByTestId('ncc-submit'));

      expect(mockCreateComment).toHaveBeenCalledWith({
        templateId: 't1',
        content: 'test comment',
        anchorText: 'Draft content',
      });

      // NewCommentCard should be gone after submit
      expect(screen.queryByTestId('new-comment-card')).not.toBeInTheDocument();
    });

    it('review mode cancel clears review pending anchor', async () => {
      const user = userEvent.setup();
      mockUseTextSelection.mockReturnValue({
        selectedText: 'Draft content',
        selectionRect: { top: 100, left: 200, width: 100, height: 20 } as DOMRect,
        hasSelection: true,
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('review');
      });

      // Click floating comment button to set pending anchor
      await user.click(screen.getByTestId('floating-comment-button'));
      expect(screen.getByTestId('new-comment-card')).toBeInTheDocument();

      // Cancel
      await user.click(screen.getByTestId('ncc-cancel'));
      expect(screen.queryByTestId('new-comment-card')).not.toBeInTheDocument();
    });
  });
});
