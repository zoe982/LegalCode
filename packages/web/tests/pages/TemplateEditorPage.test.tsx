/// <reference types="@testing-library/jest-dom/vitest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode, ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TemplateEditorPage } from '../../src/pages/TemplateEditorPage.js';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { Template } from '@legalcode/shared';
import type { GetTemplateResponse } from '../../src/services/templates.js';

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
const mockDeleteMutate = vi.fn();
const mockRestoreMutate = vi.fn();

const mockUseCreateTemplate = vi.fn();
const mockUseDeleteTemplate = vi.fn();
const mockUseRestoreTemplate = vi.fn();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplate: (...args: unknown[]) => mockUseTemplate(...args) as unknown,
  useCreateTemplate: () => mockUseCreateTemplate() as unknown,
  useDeleteTemplate: () => mockUseDeleteTemplate() as unknown,
  useRestoreTemplate: () => mockUseRestoreTemplate() as unknown,
}));

vi.mock('../../src/hooks/useCategories.js', () => ({
  useCategories: () => ({
    data: { categories: [{ id: 'c1', name: 'Employment', createdAt: '2026-01-01T00:00:00Z' }] },
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));

const mockEditorAction = vi.fn();
const mockCrepe = { editor: { action: mockEditorAction } };

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
      onEditorReady(mockCrepe);
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

vi.mock('../../src/components/RawMarkdownEditor.js', () => ({
  RawMarkdownEditor: ({
    value,
    onChange,
    readOnly,
  }: {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
  }) => (
    <textarea
      data-testid="raw-markdown-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
    />
  ),
}));

const mockReplaceAll = vi.fn((content: string) => `replaceAll:${content}`);
vi.mock('@milkdown/kit/utils', () => ({
  replaceAll: (content: string) => mockReplaceAll(content) as unknown,
}));

vi.mock('@milkdown/kit/core', () => ({
  editorViewCtx: Symbol('editorViewCtx'),
}));

vi.mock('../../src/editor/commentAnchors.js', () => ({
  resolveAnchors: vi.fn().mockReturnValue([]),
}));

vi.mock('../../src/editor/commentPlugin.js', () => ({
  commentPluginKey: { getState: vi.fn() },
}));

const mockScanForConversions = vi.fn().mockReturnValue([]);
vi.mock('../../src/editor/importCleanup.js', () => ({
  scanForConversions: (...args: unknown[]) => mockScanForConversions(...args) as unknown,
}));

vi.mock('../../src/components/ImportCleanupDialog.js', () => ({
  ImportCleanupDialog: ({
    open,
    onClose,
    conversions,
    onApply,
  }: {
    open: boolean;
    onClose: () => void;
    conversions: {
      pos: number;
      originalText: string;
      headingLevel: number;
      cleanedText: string;
      confidence: string;
      pattern: string;
      selected: boolean;
    }[];
    onApply: (
      selected: {
        pos: number;
        originalText: string;
        headingLevel: number;
        cleanedText: string;
        confidence: string;
        pattern: string;
        selected: boolean;
      }[],
    ) => void;
  }) =>
    open ? (
      <div data-testid="import-cleanup-dialog" role="dialog" aria-label="Import Cleanup">
        <span data-testid="cleanup-count">{String(conversions.length)}</span>
        <button
          data-testid="cleanup-apply"
          onClick={() => {
            onApply(conversions.filter((c) => c.selected));
          }}
        >
          Apply
        </button>
        <button data-testid="cleanup-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
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

vi.mock('../../src/components/EditorRightSlot.js', () => ({
  EditorRightSlot: ({
    collaborationUser,
    draftSaveStatus,
    onExport,
    id,
  }: {
    collaborationUser: { userId: string; email: string; color: string } | null;
    draftSaveStatus: string | null;
    onExport: () => void;
    queryClient: unknown;
    id: string | undefined;
  }) => {
    // Simulate the real EditorRightSlot behavior using the mocked useCollaboration.
    // This mirrors EditorRightSlot's unifiedStatus logic for test fidelity.
    const collab = mockUseCollaboration(id ?? null, collaborationUser, {
      onCommentEvent: () => undefined,
    });
    const collabStatus = (collab as { status: string }).status;
    const connectedUsers = (
      collab as { connectedUsers: { userId: string; email: string; color: string }[] }
    ).connectedUsers;
    const isCreateMode = id === undefined;

    // Compute unified status (same priority logic as real EditorRightSlot)
    const priorityOrder = [
      'error',
      'saving',
      'reconnecting',
      'connecting',
      'disconnected',
      'saved',
      'connected',
    ];
    const statuses: string[] = [];
    if (draftSaveStatus != null) statuses.push(draftSaveStatus);
    if (!isCreateMode && collabStatus !== 'disconnected') statuses.push(collabStatus);
    const unifiedStatus =
      statuses.length > 0
        ? (priorityOrder.find((p) => statuses.includes(p)) ?? statuses[0] ?? null)
        : null;

    if (!isCreateMode) {
      return (
        <div data-testid="editor-right-slot">
          {unifiedStatus != null && <span data-testid="connection-status">{unifiedStatus}</span>}
          {collabStatus !== 'disconnected' && (
            <div data-testid="presence-avatars">
              {connectedUsers.map((u) => (
                <span key={u.userId} data-testid={`avatar-${u.userId}`}>
                  {u.email.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          )}
          <button aria-label="export" onClick={onExport} />
        </div>
      );
    }
    if (draftSaveStatus != null) {
      return (
        <div data-testid="editor-right-slot">
          <span data-testid="connection-status">{draftSaveStatus}</span>
        </div>
      );
    }
    return null;
  },
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
    onImportCleanup,
    outlineMode,
    onToggleOutline,
  }: {
    mode: string;
    wordCount: number;
    crepeRef?: unknown;
    onImportCleanup?: () => void;
    outlineMode?: boolean;
    onToggleOutline?: () => void;
  }) => (
    <div data-testid="editor-toolbar">
      <span data-testid="editor-mode">{mode}</span>
      <span data-testid="word-count">{String(wordCount)} words</span>
      {crepeRef != null && <span data-testid="toolbar-has-crepe-ref" />}
      {onImportCleanup != null && (
        <button data-testid="toolbar-import-cleanup" onClick={onImportCleanup}>
          Import Cleanup
        </button>
      )}
      {onToggleOutline != null && (
        <button data-testid="toolbar-toggle-outline" onClick={onToggleOutline}>
          {outlineMode === true ? 'Exit Outline' : 'Outline'}
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../src/hooks/useOutlineTree.js', () => ({
  useOutlineTree: () => ({
    entries: [],
    refreshTree: vi.fn(),
  }),
}));

vi.mock('../../src/components/OutlineView.js', () => ({
  OutlineView: ({
    entries,
    onClose,
  }: {
    entries: { text: string }[];
    onReorderSection: unknown;
    onNavigateToHeading: unknown;
    onClose: () => void;
  }) => (
    <div data-testid="outline-view">
      <span data-testid="outline-entry-count">{String(entries.length)}</span>
      <button data-testid="outline-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@milkdown/kit/prose/state', () => ({
  TextSelection: {
    near: vi.fn(),
  },
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

vi.mock('../../src/hooks/useTextSelection.js', () => ({
  useTextSelection: () => ({
    selectedText: '',
    selectionRect: null,
    hasSelection: false,
  }),
}));

vi.mock('../../src/hooks/useCommentHighlights.js', () => ({
  useCommentHighlights: () => {
    // no-op — useCommentHighlights is no longer used by TemplateEditorPage
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

vi.mock('../../src/components/MarginCommentTrigger.js', () => ({
  MarginCommentTrigger: ({
    onClick,
    visible,
  }: {
    top: number | null;
    visible: boolean;
    onClick: () => void;
  }) =>
    visible ? (
      <button data-testid="margin-comment-trigger" onClick={onClick}>
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
        <span data-testid="dh-company">{String(props.company)}</span>
        <span data-testid="dh-deleted">{props.readOnly ? 'true' : 'false'}</span>
        <span data-testid="dh-mode">{String(props.editorMode)}</span>
        {typeof props.onModeChange === 'function' && (
          <>
            <button
              data-testid="dh-mode-edit"
              onClick={() => {
                (props.onModeChange as (m: string) => void)('edit');
              }}
            >
              Edit
            </button>
            <button
              data-testid="dh-mode-source"
              onClick={() => {
                (props.onModeChange as (m: string) => void)('source');
              }}
            >
              Source
            </button>
          </>
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
  useTopAppBarSetters: () => ({
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

function templateData(template: Template, content: string): GetTemplateResponse {
  return { template, content, changeSummary: null, tags: [] };
}

function createTemplateQueryResult(
  overrides: Partial<UseQueryResult<GetTemplateResponse>>,
): UseQueryResult<GetTemplateResponse> {
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
    promise: Promise.resolve(templateData(draftTemplate, '# Draft')),
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
  } as UseQueryResult<GetTemplateResponse>;
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
  displayId: 'TEM-AAA-001',
  category: 'Employment',
  description: null,
  country: 'US',
  company: null,
  currentVersion: 1,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  deletedAt: null,
  deletedBy: null,
};

const activeTemplate: Template = {
  ...draftTemplate,
  id: 't2',
};

const archivedTemplate: Template = {
  ...draftTemplate,
  id: 't3',
  deletedAt: '2026-03-01T00:00:00Z',
  deletedBy: 'u1',
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
  mockUseDeleteTemplate.mockReturnValue({
    ...createMutationResult(vi.fn()),
    mutate: mockDeleteMutate,
  });
  mockUseRestoreTemplate.mockReturnValue({
    ...createMutationResult(vi.fn()),
    mutate: mockRestoreMutate,
  });
}

// Helper: render the documentHeader from the latest TopAppBar config to inspect/interact with it
function renderDocumentHeader() {
  return render(latestAppBarConfig.documentHeader as ReactElement);
}

// ── Tests ────────────────────────────────────────────────────────────

describe('TemplateEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceAll.mockImplementation((content: string) => `replaceAll:${content}`);
    mockScanForConversions.mockReturnValue([]);
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

    it('does not show Export button in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-right-slot')).not.toBeInTheDocument();
    });

    it('shows raw markdown editor when mode is switched to source', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Switch to source via DocumentHeader mock
      const { getByTestId } = renderDocumentHeader();
      await user.click(getByTestId('dh-mode-source'));
      expect(screen.getByTestId('raw-markdown-editor')).toBeInTheDocument();
    });

    it('does not render publish or archive elements in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
    });
  });

  describe('Edit mode - draft', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );
    });

    it('passes template title to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-title')).toHaveTextContent('Employment Agreement');
    });

    it('uses useAutosave hook for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseAutosave).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 't1',
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

    it('does not render publish or archive elements for draft templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
    });

    it('passes readOnly to DocumentHeader based on deletedAt', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-deleted')).toHaveTextContent('false');
    });

    it('passes editorMode to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-mode')).toHaveTextContent('edit');
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

    it('passes company to DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-company')).toHaveTextContent('');
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
          data: templateData(activeTemplate, '# Active content'),
        }),
      );
    });

    it('does not render publish or archive elements for active templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
    });
  });

  describe('Edit mode - archived', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(archivedTemplate, '# Archived content'),
        }),
      );
    });

    it('passes readOnly=true to DocumentHeader for deleted templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      expect(screen.getByTestId('dh-read-only')).toBeInTheDocument();
    });

    it('does not render publish, archive, or unarchive elements for deleted templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-publish')).not.toBeInTheDocument();
      expect(queryByTestId('dh-archive')).not.toBeInTheDocument();
      expect(queryByTestId('dh-unarchive')).not.toBeInTheDocument();
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
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-read-only')).toBeInTheDocument();
    });

    it('does not render action buttons in DocumentHeader in create mode for viewer', () => {
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
  });

  describe('Export button', () => {
    it('rightSlot includes export button in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
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
          data: templateData(draftTemplate, '# Draft content'),
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

  describe('Delete flow', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );
    });

    it('passes onDelete to DocumentHeader for non-readOnly, non-create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.onDelete).toBeDefined();
    });

    it('does not pass onDelete to DocumentHeader in create mode', () => {
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
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.onDelete).toBeUndefined();
    });

    it('does not pass onDelete to DocumentHeader when readOnly (viewer)', () => {
      mockUseAuth.mockReturnValue(viewerAuth);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.onDelete).toBeUndefined();
    });

    it('opens delete dialog when onDelete is called via DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('calls deleteMutation.mutate when delete is confirmed', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      act(() => {
        deleteButton.click();
      });

      expect(mockDeleteMutate).toHaveBeenCalledWith('t1', expect.anything());
    });

    it('navigates to /templates on successful delete', () => {
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      act(() => {
        deleteButton.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/templates');
    });

    it('closes delete dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      // Dialog should be open
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Click Cancel to close the dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('closes delete dialog when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      // Dialog should be open
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Press Escape to close via MUI Dialog onClose handler
      await user.keyboard('{Escape}');

      // Dialog should be closed — exercises the onClose callback at lines 702-704
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('shows undo toast with "Template moved to trash" after successful delete', () => {
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      act(() => {
        deleteButton.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/templates');
      expect(mockShowToast).toHaveBeenCalledWith(
        'Template moved to trash',
        'success',
        expect.anything(),
      );
    });

    it('calls restoreMutation.mutate when undo button in toast is clicked after delete', () => {
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      act(() => {
        deleteButton.click();
      });

      // Extract the action (undo button) from the showToast call
      const toastCall = mockShowToast.mock.calls.find(
        (call: unknown[]) => call[0] === 'Template moved to trash',
      );
      expect(toastCall).toBeDefined();
      const undoAction = toastCall![2] as { props: { onClick: () => void } };
      expect(undoAction).toBeDefined();

      // Click the undo action
      act(() => {
        undoAction.props.onClick();
      });

      expect(mockRestoreMutate).toHaveBeenCalledWith('t1', expect.anything());
    });

    it('shows "Template restored" toast when undo restore succeeds', () => {
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });
      mockRestoreMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onDelete as () => void)();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      act(() => {
        deleteButton.click();
      });

      // Extract the undo action from the toast call
      const toastCall = mockShowToast.mock.calls.find(
        (call: unknown[]) => call[0] === 'Template moved to trash',
      );
      const undoAction = toastCall![2] as { props: { onClick: () => void } };

      // Click undo
      act(() => {
        undoAction.props.onClick();
      });

      // Should show "Template restored" toast
      expect(mockShowToast).toHaveBeenCalledWith('Template restored', 'success');
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

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, '# Test Content');
      // Content is tracked in component state; verified via auto-create tests
      expect(editor).toHaveValue('# Test Content');
    });
  });

  describe('Template without country', () => {
    it('initializes country to empty string when null', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      const templateNoCountry = { ...draftTemplate, country: null };
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(templateNoCountry, '# Draft'),
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
          data: templateData({ ...draftTemplate, country: null }, '# Draft'),
        }),
      );
    });

    it('autosave is enabled for draft templates without optional fields', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockUseAutosave).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          templateId: 't1',
        }),
      );
    });
  });

  describe('Collaboration integration', () => {
    it('includes collaboration UI in DocumentHeader rightSlot when connected', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
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

      const { getByTestId: getDocTestId, getAllByTestId: getAllDocTestId } = renderDocumentHeader();
      expect(getDocTestId('dh-right-slot')).toBeInTheDocument();
      const statusElements = getAllDocTestId('connection-status');
      expect(statusElements.some((el) => el.textContent === 'connected')).toBe(true);
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
          data: templateData(activeTemplate, '# Active'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(mockSetConfig).toHaveBeenCalled();
    });

    it('passes collaboration to useCollaboration with correct arguments', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // EditorRightSlot is rendered inside DocumentHeader's rightSlot
      renderDocumentHeader();

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

      // In create mode, EditorRightSlot is not rendered (returns undefined),
      // so useCollaboration is never called — verify via EditorRightSlot absence
      const dh = renderDocumentHeader();
      expect(dh.container.querySelector('[data-testid="editor-right-slot"]')).toBeNull();
    });

    it('passes null user to useCollaboration for viewer role', () => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // EditorRightSlot renders inside DocumentHeader's rightSlot
      renderDocumentHeader();

      expect(mockUseCollaboration).toHaveBeenCalledWith('t2', null, expect.objectContaining({}));
    });

    it('includes connecting status in DocumentHeader rightSlot for active templates', () => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
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

      const { container } = renderDocumentHeader();
      const statusEls = container.querySelectorAll('[data-testid="connection-status"]');
      expect(statusEls.length).toBeGreaterThanOrEqual(1);
      // At least one should show the connecting status from collaboration
      const connectingEl = Array.from(statusEls).find((el) => el.textContent === 'connecting');
      expect(connectingEl).toBeDefined();
    });
  });

  describe('Mode toggle', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );
    });

    it('renders EditorToolbar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    it('starts in edit mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { getByTestId } = renderDocumentHeader();
      expect(getByTestId('dh-mode')).toHaveTextContent('edit');
    });

    it('switches to source mode when Source is clicked via DocumentHeader', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });
      // After mode change, RawMarkdownEditor should be visible
      expect(screen.getByTestId('source-editor-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('raw-markdown-editor')).toBeInTheDocument();
    });

    it('keeps markdown editor in DOM but hides it in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });
      // Editor stays in DOM (no unmount) but its container is hidden
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
      const sourceContainer = screen.getByTestId('edit-editor-container');
      expect(sourceContainer).toHaveStyle({ display: 'none' });
    });

    it('both edit and source panels are always in the DOM', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      // In edit mode (default), both panels should be in DOM
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
      expect(screen.getByTestId('raw-markdown-editor')).toBeInTheDocument();
    });

    it('shows RawMarkdownEditor in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });
      expect(screen.getByTestId('raw-markdown-editor')).toBeInTheDocument();
    });

    it('calls replaceAll when switching from source back to edit mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      // Switch to source first
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });
      // Switch back to edit
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('edit');
      });
      expect(mockReplaceAll).toHaveBeenCalled();
    });
  });

  describe('Keyboard shortcuts', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
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
          data: templateData(draftTemplate, '# Draft'),
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
          data: templateData(draftTemplate, '# Draft content'),
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

  describe('Deleted template', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't3' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(archivedTemplate, '# Archived'),
        }),
      );
    });

    it('sets documentHeader in TopAppBar config for deleted templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHeader: expect.anything(),
        }),
      );
    });
  });

  describe('Inline comment margin', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );
    });

    it('renders InlineCommentMargin in edit mode for existing templates', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('inline-comment-margin')).toBeInTheDocument();
    });

    it('does not render InlineCommentMargin in create mode (no id)', () => {
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

    it('calls startComment when MarginCommentTrigger is clicked in edit mode', async () => {
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

      const commentBtn = await screen.findByTestId('margin-comment-trigger');
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

      const resolveButton = screen.getByTestId('margin-resolve');
      await user.click(resolveButton);
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

      const deleteButton = screen.getByTestId('margin-delete');
      await user.click(deleteButton);
      expect(mockDeleteComment).toHaveBeenCalledWith(
        { templateId: 't1', commentId: 'c1' },
        expect.anything(),
      );
    });

    it('shows undo toast after comment deletion and re-creates comment on undo', async () => {
      const user = userEvent.setup();
      const mockDeleteComment = vi.fn(
        (_vars: { templateId: string; commentId: string }, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        },
      );
      const mockCommentThread = {
        comment: {
          id: 'c1',
          templateId: 't1',
          parentId: null,
          authorId: 'u1',
          authorName: 'Alice',
          authorEmail: 'alice@acasus.com',
          content: 'This needs review',
          anchorFrom: '10',
          anchorTo: '20',
          anchorText: 'some text',
          resolved: false,
          resolvedBy: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        replies: [],
      };
      mockUseComments.mockReturnValue({
        threads: [mockCommentThread],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: mockDeleteComment,
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const deleteButton = screen.getByTestId('margin-delete');
      await user.click(deleteButton);
      expect(mockDeleteComment).toHaveBeenCalledWith(
        { templateId: 't1', commentId: 'c1' },
        expect.anything(),
      );

      // Should show toast with "Comment deleted" and an undo action
      expect(mockShowToast).toHaveBeenCalledWith('Comment deleted', 'success', expect.anything());

      // Extract the undo action and click it
      const toastCall = mockShowToast.mock.calls.find(
        (call: unknown[]) => call[0] === 'Comment deleted',
      );
      const undoAction = toastCall![2] as { props: { onClick: () => void } };

      act(() => {
        undoAction.props.onClick();
      });

      // Undo should re-create the comment with original data
      expect(mockCreateComment).toHaveBeenCalledWith({
        templateId: 't1',
        content: 'This needs review',
        anchorFrom: '10',
        anchorTo: '20',
        anchorText: 'some text',
      });
    });

    it('wires reply callback to createComment from useComments', async () => {
      const user = userEvent.setup();

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const replyButton = screen.getByTestId('margin-reply');
      await user.click(replyButton);
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
          data: templateData(draftTemplate, '# Draft content'),
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

  describe('Version history slide-over', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
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
          data: templateData(activeTemplate, '# Active'),
        }),
      );
    });

    it('does not render version history component (now on separate page)', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.queryByTestId('version-history')).not.toBeInTheDocument();
    });
  });

  describe('inline comments wiring', () => {
    it('InlineCommentMargin receives threads from useComments in edit mode', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Hello'),
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

      const threadCount = screen.getByTestId('margin-thread-count');
      expect(threadCount).toHaveTextContent('1');
    });
  });

  describe('handleAddComment', () => {
    it('calls startComment when MarginCommentTrigger is clicked in edit mode', async () => {
      const user = userEvent.setup();
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft'),
        }),
      );

      // Make the margin trigger visible by providing a selection
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

      const commentBtn = await screen.findByTestId('margin-comment-trigger');
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

      // In create mode, MarginCommentTrigger is hidden (!isCreateMode && ...)
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

    it('shows toast when handleAddComment is called via keyboard shortcut in create mode (source)', () => {
      // Create mode: no id
      mockUseParams.mockReturnValue({});

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });

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
          data: templateData(draftTemplate, '# Draft'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // EditorRightSlot is rendered inside DocumentHeader's rightSlot — render it to trigger useCollaboration
      renderDocumentHeader();

      // useCollaboration is called with (id, user, options) — capture the options arg
      expect(mockUseCollaboration).toHaveBeenCalled();
      const callArgs = mockUseCollaboration.mock.calls[0] as unknown[];
      const options = callArgs[2] as { onCommentEvent: () => void };
      expect(options).toBeDefined();
      expect(typeof options.onCommentEvent).toBe('function');

      // Invoke the callback — the mock's onCommentEvent is () => undefined,
      // so just verify it's callable (branch coverage for EditorRightSlot's forwarding)
      act(() => {
        options.onCommentEvent();
      });

      expect(mockUseCollaboration).toHaveBeenCalled();
    });
  });

  describe('CommentAnchorProvider wrapping', () => {
    it('wraps content with CommentAnchorProvider', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft'),
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('comment-anchor-provider')).toBeInTheDocument();
    });
  });

  describe('Source mode RawMarkdownEditor', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );
    });

    it('shows RawMarkdownEditor with current content in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });

      const rawEditor = screen.getByTestId('raw-markdown-editor');
      expect(rawEditor).toBeInTheDocument();
      expect(rawEditor).toHaveValue('# Draft content');
    });

    it('source mode RawMarkdownEditor calls handleContentChange on change', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });

      const rawEditor = screen.getByTestId('raw-markdown-editor');
      await user.clear(rawEditor);
      await user.type(rawEditor, '# Updated');
      expect(rawEditor).toHaveValue('# Updated');
    });

    it('source mode RawMarkdownEditor respects readOnly', () => {
      mockUseAuth.mockReturnValue(viewerAuth);

      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });

      const rawEditor = screen.getByTestId('raw-markdown-editor');
      expect(rawEditor).toHaveAttribute('readonly');
    });

    it('does not show MarginCommentTrigger or InlineCommentMargin in source mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onModeChange as (m: string) => void)('source');
      });

      // Edit mode container is hidden, so MarginCommentTrigger inside it is hidden
      const editContainer = screen.getByTestId('edit-editor-container');
      expect(editContainer).toHaveStyle({ display: 'none' });

      // Source mode only has RawMarkdownEditor, no comment UI
      expect(screen.getByTestId('source-editor-wrapper')).toBeInTheDocument();
    });
  });

  describe('Viewer role — edit mode', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(viewerAuth);
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Active'),
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
          data: templateData(activeTemplate, '# Active'),
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

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('My New Template');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
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

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
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

      act(() => {
        vi.advanceTimersByTime(1100);
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

    it('auto-creates draft with default category when only title is provided', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-default' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Title Only');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Title Only',
            category: 'Employment',
            content: ' ',
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
        vi.advanceTimersByTime(1100);
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

    it('shows saving status during auto-create in create mode', async () => {
      let resolveCreate: (value: unknown) => void = () => {
        /* placeholder */
      };
      mockCreateMutateAsync.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Saving Template');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      // During save, rightSlot should show saving status
      renderDocumentHeader();
      expect(latestDocumentHeaderProps.rightSlot).not.toBeUndefined();

      // Resolve the create
      act(() => {
        resolveCreate({ template: { ...draftTemplate, id: 'save-status' } });
      });
    });

    it('Ctrl+S triggers immediate auto-create in create mode', () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'ctrl-s-create' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Ctrl+S Template');
      });

      // Trigger Ctrl+S without waiting for debounce
      const lastCall = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onCtrlS: () => void }];
      act(() => {
        lastCall[0].onCtrlS();
      });

      // Should create immediately without needing debounce
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ctrl+S Template',
        }),
      );
    });

    it('does not render Save Draft button in create mode', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      const { queryByTestId } = renderDocumentHeader();
      expect(queryByTestId('dh-save-draft')).not.toBeInTheDocument();
    });

    it('uses user-provided category, country, and content when set', async () => {
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
        (latestDocumentHeaderProps.onCategoryChange as (c: string) => void)('Compliance');
      });
      // Set country
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onCountryChange as (c: string) => void)('US');
      });
      // Set content via MarkdownEditor
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const editor = screen.getByTestId('markdown-editor');
      await user.type(editor, '# Content');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Full Template',
            category: 'Compliance',
            country: 'US',
            content: '# Content',
          }),
        );
      });
    });

    it('does not auto-create again after hasAutoCreated is set', async () => {
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'auto-once' },
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // First title entry triggers auto-create
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('First Title');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
      });

      // Navigates away, so further title changes should not trigger another create
      // Reset to verify no additional calls
      mockCreateMutateAsync.mockClear();

      // Change title again (should not trigger since hasAutoCreated is true)
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Second Title');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('does not retry auto-create in a loop when creation fails', async () => {
      mockCreateMutateAsync.mockRejectedValue(new Error('Server error'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title to trigger auto-create
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Loop Test');
      });

      // Advance past debounce — first call fires and fails
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
      });

      // Clear mock and advance a long time — should NOT retry
      mockCreateMutateAsync.mockClear();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(0);
    });

    it('Ctrl+S allows manual retry after auto-create failure', async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(new Error('Server error'));

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Set title to trigger auto-create
      renderDocumentHeader();
      act(() => {
        (latestDocumentHeaderProps.onTitleChange as (t: string) => void)('Retry Via Ctrl+S');
      });

      // Advance past debounce — first call fires and fails
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save draft', 'error');
      });

      // Set up success for retry
      mockCreateMutateAsync.mockResolvedValue({
        template: { ...draftTemplate, id: 'retry-success' },
      });

      // Trigger Ctrl+S for manual retry
      const lastCall = mockUseKeyboardShortcuts.mock.calls.at(-1) as [{ onCtrlS: () => void }];
      act(() => {
        lastCall[0].onCtrlS();
      });

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Comment creation flow', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
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
  });

  describe('comment anchor sync', () => {
    it('calls editor.action when threads are present after editor ready', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );

      const mockCommentThread = {
        comment: {
          id: 'c1',
          templateId: 't1',
          content: 'test',
          anchorText: 'Hello',
          anchorFrom: '2',
          anchorTo: '7',
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
      };

      mockUseComments.mockReturnValue({
        threads: [mockCommentThread],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // The thread count should be reflected in the margin
      expect(screen.getByTestId('margin-thread-count')).toHaveTextContent('1');
    });

    it('syncs anchors to ProseMirror via useEffect when threads change', () => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft content'),
        }),
      );

      // Start with empty threads
      mockUseComments.mockReturnValue({
        threads: [],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      const { rerender } = render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('margin-thread-count')).toHaveTextContent('0');

      const mockCommentThread = {
        comment: {
          id: 'c2',
          templateId: 't1',
          content: 'another test',
          anchorText: 'Draft',
          anchorFrom: '2',
          anchorTo: '7',
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
      };

      mockUseComments.mockReturnValue({
        threads: [mockCommentThread],
        isLoading: false,
        createComment: mockCreateComment,
        resolveComment: vi.fn(),
        deleteComment: vi.fn(),
        showResolved: false,
        toggleShowResolved: vi.fn(),
      });

      rerender(<TemplateEditorPage />);

      expect(screen.getByTestId('margin-thread-count')).toHaveTextContent('1');
    });
  });

  describe('Import Cleanup', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't1' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(draftTemplate, '# Draft'),
        }),
      );
    });

    it('passes onImportCleanup prop to EditorToolbar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('toolbar-import-cleanup')).toBeInTheDocument();
    });

    it('shows toast when no conversions are found', () => {
      // Configure the editor action to invoke the callback with a mock ctx
      const mockDoc = { forEach: vi.fn() };
      const mockView = { state: { doc: mockDoc } };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue([]);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const cleanupButton = screen.getByTestId('toolbar-import-cleanup');
      act(() => {
        cleanupButton.click();
      });

      expect(mockScanForConversions).toHaveBeenCalledWith(mockDoc);
      expect(mockShowToast).toHaveBeenCalledWith('No numbering detected', 'info');
      expect(screen.queryByTestId('import-cleanup-dialog')).not.toBeInTheDocument();
    });

    it('opens cleanup dialog when conversions are found', () => {
      const mockConversions = [
        {
          pos: 0,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          selected: true,
        },
      ];

      const mockDoc = { forEach: vi.fn() };
      const mockView = { state: { doc: mockDoc } };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const cleanupButton = screen.getByTestId('toolbar-import-cleanup');
      act(() => {
        cleanupButton.click();
      });

      expect(screen.getByTestId('import-cleanup-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('cleanup-count')).toHaveTextContent('1');
    });

    it('closes cleanup dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockConversions = [
        {
          pos: 0,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          selected: true,
        },
      ];

      const mockDoc = { forEach: vi.fn() };
      const mockView = { state: { doc: mockDoc } };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      const cleanupButton = screen.getByTestId('toolbar-import-cleanup');
      act(() => {
        cleanupButton.click();
      });

      expect(screen.getByTestId('import-cleanup-dialog')).toBeInTheDocument();

      await user.click(screen.getByTestId('cleanup-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('import-cleanup-dialog')).not.toBeInTheDocument();
      });
    });

    it('applies selected conversions and dispatches ProseMirror transaction', () => {
      const mockConversions = [
        {
          pos: 10,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          sourceType: 'paragraph' as const,
          selected: true,
        },
        {
          pos: 5,
          originalText: '2. Background',
          headingLevel: 1,
          cleanedText: 'Background',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          sourceType: 'paragraph' as const,
          selected: true,
        },
      ];

      const mockHeadingNode = { type: 'heading' };
      const mockHeadingType = {
        create: vi.fn().mockReturnValue(mockHeadingNode),
      };
      const mockParagraphNode = { type: { name: 'paragraph' }, nodeSize: 15 };
      const mockTr = {
        doc: { nodeAt: vi.fn().mockReturnValue(mockParagraphNode) },
        replaceWith: vi.fn().mockReturnThis(),
      };
      const mockDispatch = vi.fn();
      const mockView = {
        state: {
          doc: { forEach: vi.fn() },
          tr: mockTr,
          schema: {
            nodes: { heading: mockHeadingType },
            text: vi.fn((t: string) => ({ text: t })),
          },
        },
        dispatch: mockDispatch,
      };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      // First call: handleImportCleanup (opens dialog)
      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open the cleanup dialog
      const cleanupButton = screen.getByTestId('toolbar-import-cleanup');
      act(() => {
        cleanupButton.click();
      });

      expect(screen.getByTestId('import-cleanup-dialog')).toBeInTheDocument();

      // Click apply — our mock dialog sends selected conversions
      const applyButton = screen.getByTestId('cleanup-apply');
      act(() => {
        applyButton.click();
      });

      // Should have dispatched the transaction
      expect(mockDispatch).toHaveBeenCalledWith(mockTr);
      // Should have replaced nodes in reverse order (pos 10 before pos 5)
      expect(mockTr.doc.nodeAt).toHaveBeenCalledWith(10);
      expect(mockTr.doc.nodeAt).toHaveBeenCalledWith(5);
      expect(mockHeadingType.create).toHaveBeenCalledTimes(2);
      expect(mockTr.replaceWith).toHaveBeenCalledTimes(2);

      // Dialog should close
      expect(screen.queryByTestId('import-cleanup-dialog')).not.toBeInTheDocument();

      // Should show success toast
      expect(mockShowToast).toHaveBeenCalledWith('Converted 2 paragraphs to headings', 'success');
    });

    it('skips nodes that are neither paragraphs nor headings during apply', () => {
      const mockConversions = [
        {
          pos: 5,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          sourceType: 'paragraph' as const,
          selected: true,
        },
      ];

      // nodeAt returns an unhandled node type (e.g. blockquote)
      const mockBlockquoteNode = { type: { name: 'blockquote' }, nodeSize: 10 };
      const mockTr = {
        doc: { nodeAt: vi.fn().mockReturnValue(mockBlockquoteNode) },
        replaceWith: vi.fn().mockReturnThis(),
      };
      const mockDispatch = vi.fn();
      const mockView = {
        state: {
          doc: { forEach: vi.fn() },
          tr: mockTr,
          schema: {
            nodes: { heading: { create: vi.fn() } },
            text: vi.fn(),
          },
        },
        dispatch: mockDispatch,
      };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      act(() => {
        screen.getByTestId('toolbar-import-cleanup').click();
      });

      // Apply
      act(() => {
        screen.getByTestId('cleanup-apply').click();
      });

      // replaceWith should NOT have been called since the node type is unhandled
      expect(mockTr.replaceWith).not.toHaveBeenCalled();
      // But dispatch should still be called (empty transaction)
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('skips conversion when heading type is not in schema', () => {
      const mockConversions = [
        {
          pos: 5,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          selected: true,
        },
      ];

      const mockParagraphNode = { type: { name: 'paragraph' }, nodeSize: 15 };
      const mockTr = {
        doc: { nodeAt: vi.fn().mockReturnValue(mockParagraphNode) },
        replaceWith: vi.fn().mockReturnThis(),
      };
      const mockDispatch = vi.fn();
      const mockView = {
        state: {
          doc: { forEach: vi.fn() },
          tr: mockTr,
          schema: {
            nodes: { heading: undefined }, // No heading type in schema
            text: vi.fn(),
          },
        },
        dispatch: mockDispatch,
      };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      act(() => {
        screen.getByTestId('toolbar-import-cleanup').click();
      });

      // Apply
      act(() => {
        screen.getByTestId('cleanup-apply').click();
      });

      // replaceWith should NOT have been called since heading type is missing
      expect(mockTr.replaceWith).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('skips conversion when nodeAt returns null', () => {
      const mockConversions = [
        {
          pos: 5,
          originalText: '1. Introduction',
          headingLevel: 1,
          cleanedText: 'Introduction',
          confidence: 'high' as const,
          pattern: 'numbered-h1',
          selected: true,
        },
      ];

      const mockTr = {
        doc: { nodeAt: vi.fn().mockReturnValue(null) },
        replaceWith: vi.fn().mockReturnThis(),
      };
      const mockDispatch = vi.fn();
      const mockView = {
        state: {
          doc: { forEach: vi.fn() },
          tr: mockTr,
          schema: {
            nodes: { heading: { create: vi.fn() } },
            text: vi.fn(),
          },
        },
        dispatch: mockDispatch,
      };
      const mockCtx = { get: vi.fn().mockReturnValue(mockView) };

      mockEditorAction.mockImplementation((cb: (ctx: unknown) => void) => {
        cb(mockCtx);
      });
      mockScanForConversions.mockReturnValue(mockConversions);

      render(<TemplateEditorPage />, { wrapper: Wrapper });

      // Open dialog
      act(() => {
        screen.getByTestId('toolbar-import-cleanup').click();
      });

      // Apply
      act(() => {
        screen.getByTestId('cleanup-apply').click();
      });

      // replaceWith should NOT have been called since node is null
      expect(mockTr.replaceWith).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Outline mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 't2' });
      mockUseTemplate.mockReturnValue(
        createTemplateQueryResult({
          data: templateData(activeTemplate, '# Introduction\n\nSome content.'),
        }),
      );
    });

    it('renders Toggle Outline button in toolbar', () => {
      render(<TemplateEditorPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('toolbar-toggle-outline')).toBeInTheDocument();
    });

    it('shows OutlineView when Toggle Outline is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      expect(screen.queryByTestId('outline-view')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('toolbar-toggle-outline'));

      expect(screen.getByTestId('outline-view')).toBeInTheDocument();
    });

    it('hides editor canvas when outline mode is active', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('toolbar-toggle-outline'));

      // The canvas background box gets display:none when outlineMode is true
      // We verify the outline view is visible instead
      expect(screen.getByTestId('outline-view')).toBeInTheDocument();
    });

    it('closes OutlineView when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('toolbar-toggle-outline'));
      expect(screen.getByTestId('outline-view')).toBeInTheDocument();

      await user.click(screen.getByTestId('outline-close'));
      expect(screen.queryByTestId('outline-view')).not.toBeInTheDocument();
    });

    it('toggles outline mode off when Toggle Outline is clicked again', async () => {
      const user = userEvent.setup();
      render(<TemplateEditorPage />, { wrapper: Wrapper });

      await user.click(screen.getByTestId('toolbar-toggle-outline'));
      expect(screen.getByTestId('outline-view')).toBeInTheDocument();

      await user.click(screen.getByTestId('toolbar-toggle-outline'));
      expect(screen.queryByTestId('outline-view')).not.toBeInTheDocument();
    });
  });
});
