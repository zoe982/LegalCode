import { useState, useCallback, useEffect, useRef, useMemo, createElement } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Box, Button, IconButton, Skeleton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { Crepe } from '@milkdown/crepe';
import { MarkdownEditor } from '../components/MarkdownEditor.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  useDeleteTemplate,
  useRestoreTemplate,
} from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { useCategories } from '../hooks/useCategories.js';
import { useCollaboration } from '../hooks/useCollaboration.js';
import { PresenceAvatars } from '../components/PresenceAvatars.js';
import { ConnectionStatus } from '../components/ConnectionStatus.js';
import type { ConnectionStatusType } from '../components/ConnectionStatus.js';
import { useAutosave } from '../hooks/useAutosave.js';
import type { AutosaveState } from '../hooks/useAutosave.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { useEditorHistory } from '../hooks/useEditorHistory.js';
import { KeyboardShortcutHelp } from '../components/KeyboardShortcutHelp.js';
import { markdownToHtml } from '../utils/markdownToHtml.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useToast } from '../components/Toast.js';
import { useEditorComments } from '../hooks/useEditorComments.js';
import { useComments } from '../hooks/useComments.js';
import { FloatingCommentButton } from '../components/FloatingCommentButton.js';
import { useQueryClient } from '@tanstack/react-query';
import type { Template } from '@legalcode/shared';
import { useTopAppBarConfig } from '../contexts/TopAppBarContext.js';
import { CommentAnchorProvider } from '../contexts/CommentAnchorContext.js';
import { useTextSelection } from '../hooks/useTextSelection.js';
import { useCommentHighlights } from '../hooks/useCommentHighlights.js';
import { DocumentHeader } from '../components/DocumentHeader.js';
import { DeleteTemplateDialog } from '../components/DeleteTemplateDialog.js';
import { InlineCommentMargin } from '../components/InlineCommentMargin.js';

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isCreateMode = id === undefined;
  const isViewer = user?.role === 'viewer';

  const templateQuery = useTemplate(id ?? '');
  const templateData = templateQuery.data;

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.categories ?? [];

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();
  const restoreMutation = useRestoreTemplate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [content, setContent] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  const [editorMode, setEditorMode] = useState<'source' | 'review'>('source');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDirtyRef = useRef(false);
  const [autoCreateState, setAutoCreateState] = useState<'idle' | 'saving'>('idle');

  // Auto-create draft when user starts typing in create mode
  const autoCreateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoCreatedRef = useRef(false);
  const autoCreateFailedRef = useRef(false);

  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { selectionInfo, pendingAnchor, startComment, cancelComment, onSelectionChange } =
    useEditorComments();
  /* v8 ignore next 10 -- error toast callbacks tested at hook level in useComments.test.ts */
  const commentErrorCallbacks = {
    onCreateError: (error: Error) => {
      showToast(error.message || 'Failed to save comment', 'error');
    },
    onResolveError: (error: Error) => {
      showToast(error.message || 'Failed to resolve comment', 'error');
    },
    onDeleteError: (error: Error) => {
      showToast(error.message || 'Failed to delete comment', 'error');
    },
  };
  const { threads, isCreating, createComment, resolveComment, deleteComment } = useComments(
    id,
    commentErrorCallbacks,
  );

  // Crepe editor ref for Milkdown commands
  const crepeRef = useRef<Crepe | null>(null);
  const handleEditorReady = useCallback((crepe: Crepe) => {
    crepeRef.current = crepe;
  }, []);

  // Source mode comment margin ref
  const sourceContentRef = useRef<HTMLDivElement>(null);

  // Review mode comment highlighting
  const reviewContentRef = useRef<HTMLDivElement>(null);
  const reviewTextSelection = useTextSelection(reviewContentRef);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  /* v8 ignore next 3 -- callback passed to useCommentHighlights, invoked by DOM event handler */
  const handleCommentClick = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
  }, []);

  useCommentHighlights(
    reviewContentRef,
    editorMode === 'review' ? threads : [],
    handleCommentClick,
  );

  const handleAddComment = useCallback(() => {
    if (isCreateMode) {
      showToast('Save the template first to add comments', 'info');
      return;
    }
    startComment();
  }, [isCreateMode, startComment, showToast]);

  const handleSubmitComment = useCallback(
    (commentContent: string) => {
      /* v8 ignore next -- defensive guard; id always exists when comments are available */
      if (!id || !pendingAnchor) return;
      createComment({
        templateId: id,
        content: commentContent,
        anchorFrom: pendingAnchor.anchorFrom,
        anchorTo: pendingAnchor.anchorTo,
        anchorText: pendingAnchor.anchorText,
      });
      cancelComment();
    },
    [id, pendingAnchor, createComment, cancelComment],
  );

  // Review mode pending comment state
  const [reviewPendingAnchor, setReviewPendingAnchor] = useState<{
    anchorText: string;
  } | null>(null);

  const handleReviewAddComment = useCallback(() => {
    /* v8 ignore next 4 -- defensive guard; FloatingCommentButton is hidden in create mode */
    if (isCreateMode) {
      showToast('Save the template first to add comments', 'info');
      return;
    }
    if (reviewTextSelection.selectedText) {
      setReviewPendingAnchor({ anchorText: reviewTextSelection.selectedText });
    }
  }, [isCreateMode, reviewTextSelection.selectedText, showToast]);

  const handleReviewSubmitComment = useCallback(
    (commentContent: string) => {
      /* v8 ignore next -- defensive guard; id always exists when comments are available */
      if (!id || !reviewPendingAnchor) return;
      createComment({
        templateId: id,
        content: commentContent,
        anchorText: reviewPendingAnchor.anchorText,
      });
      setReviewPendingAnchor(null);
    },
    [id, reviewPendingAnchor, createComment],
  );

  // Collaboration — only for existing templates with edit permission
  const collaborationUser = useMemo(
    () =>
      !isCreateMode && !isViewer && user
        ? { userId: user.id, email: user.email, color: '#1976d2' }
        : null,
    [isCreateMode, isViewer, user?.id, user?.email],
  );
  const collaboration = useCollaboration(!isCreateMode ? id : null, collaborationUser, {
    onCommentEvent: useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['comments', id] });
    }, [queryClient, id]),
  });

  const isDeleted = templateData?.template.deletedAt != null;
  const isReadOnly = isViewer || isDeleted;

  const { canUndo, canRedo, handleUndo, handleRedo } = useEditorHistory({
    crepeRef,
  });

  const autosave = useAutosave({
    templateId: id,
    content,
    title,
    enabled: !isCreateMode && !isViewer && !isDeleted,
  });

  // Toast notification when autosave completes (saving -> saved transition)
  const prevSaveStateRef = useRef<AutosaveState>('idle');
  useEffect(() => {
    if (autosave.saveState === 'saved' && prevSaveStateRef.current === 'saving') {
      showToast('Changes saved', 'success');
    }
    prevSaveStateRef.current = autosave.saveState;
  }, [autosave.saveState, showToast]);

  // Shared auto-create logic for debounced auto-create and Ctrl+S
  const performAutoCreate = useCallback(() => {
    /* v8 ignore next -- defensive guard; hasAutoCreatedRef already-created branch guarded by useEffect above */
    if (hasAutoCreatedRef.current || title.trim() === '') return;
    hasAutoCreatedRef.current = true;
    setAutoCreateState('saving');
    /* v8 ignore next -- defensive guard; categories always have entries by the time auto-create runs */
    const resolvedCategory = category !== '' ? category : (categories[0]?.name ?? 'General');
    const resolvedCountry = country !== '' ? country : undefined;
    const resolvedContent = content !== '' ? content : ' ';
    void createMutation
      .mutateAsync({
        title,
        category: resolvedCategory,
        country: resolvedCountry,
        content: resolvedContent,
      })
      .then((result: unknown) => {
        const created = result as { template: Template };
        setAutoCreateState('idle');
        void navigate(`/templates/${created.template.id}`, { replace: true });
      })
      .catch(() => {
        // hasAutoCreatedRef stays true — blocks useEffect-driven retries
        autoCreateFailedRef.current = true;
        setAutoCreateState('idle');
        showToast('Failed to save draft', 'error');
      });
  }, [title, category, categories, country, content, createMutation, navigate, showToast]);

  // Auto-create draft when user starts typing in create mode
  useEffect(() => {
    if (!isCreateMode || hasAutoCreatedRef.current) return;
    if (title.trim() === '') return;

    if (autoCreateTimerRef.current) {
      clearTimeout(autoCreateTimerRef.current);
    }

    autoCreateTimerRef.current = setTimeout(() => {
      performAutoCreate();
    }, 1000);

    return () => {
      if (autoCreateTimerRef.current) {
        clearTimeout(autoCreateTimerRef.current);
      }
    };
  }, [isCreateMode, title, performAutoCreate]);

  // Clean up auto-create timer on unmount
  useEffect(() => {
    return () => {
      if (autoCreateTimerRef.current) {
        clearTimeout(autoCreateTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePane: useCallback(() => {
      // No-op in v3 — panels will be slide-overs in Phase 4-5
    }, []),
    onEscape: useCallback(() => {
      // No-op in v3 — panels will be slide-overs in Phase 4-5
    }, []),
    onShowHelp: useCallback(() => {
      setShortcutHelpOpen(true);
    }, []),
    onCtrlS: useCallback(() => {
      if (isCreateMode && title.trim() !== '') {
        if (autoCreateTimerRef.current) {
          clearTimeout(autoCreateTimerRef.current);
        }
        if (autoCreateFailedRef.current) {
          autoCreateFailedRef.current = false;
          hasAutoCreatedRef.current = false; // Reset to allow retry
        }
        performAutoCreate();
      } else if (!isCreateMode && !isDeleted) {
        autosave.saveNow();
      }
      // Only show "all set" toast if not in create mode (create mode shows its own toasts)
      if (!isCreateMode) {
        showToast("Your work is saved automatically — you're all set", 'success');
      }
    }, [isCreateMode, title, isDeleted, autosave, showToast, performAutoCreate]),
    onAddComment: handleAddComment,
  });

  const handleExport = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined when export is visible */
    if (id) {
      void templateService.download(id);
    }
  }, [id]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    /* v8 ignore next -- defensive guard; id always exists when delete button is visible */
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        void navigate('/templates');

        const undoButton = createElement(
          Button,
          {
            size: 'small' as const,
            onClick: () => {
              restoreMutation.mutate(id, {
                onSuccess: () => {
                  showToast('Template restored', 'success');
                },
              });
            },
            sx: {
              color: '#8027FF',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
              minWidth: 0,
              padding: '2px 8px',
            },
          },
          'Undo',
        );
        showToast('Template moved to trash', 'success', undoButton);
      },
    });
  }, [id, deleteMutation, navigate, restoreMutation, showToast]);

  // Sync TopAppBar config for editor view — v4: use DocumentHeader
  const { setConfig, clearConfig } = useTopAppBarConfig();

  // Derive connection status for draft autosave display
  const draftSaveStatus: ConnectionStatusType | null =
    isCreateMode && autoCreateState === 'saving'
      ? 'saving'
      : !isCreateMode && !isDeleted && !isViewer
        ? autosave.saveState === 'saving'
          ? 'saving'
          : autosave.saveState === 'saved'
            ? 'saved'
            : autosave.saveState === 'error'
              ? 'error'
              : 'connected' // idle -> show as connected/saved
        : null;

  // Derive a single unified connection status
  const unifiedStatus: ConnectionStatusType | null = useMemo(() => {
    // Priority: error > saving > reconnecting > connecting > disconnected > saved > connected
    const statuses: ConnectionStatusType[] = [];
    if (draftSaveStatus != null) statuses.push(draftSaveStatus);
    if (!isCreateMode && collaboration.status !== 'disconnected') {
      statuses.push(collaboration.status as ConnectionStatusType);
    }
    if (statuses.length === 0) return null;

    const priority: ConnectionStatusType[] = [
      'error',
      'saving',
      'reconnecting',
      'connecting',
      'disconnected',
      'saved',
      'connected',
    ];
    for (const p of priority) {
      if (statuses.includes(p)) return p;
    }
    return statuses[0] ?? null;
  }, [draftSaveStatus, isCreateMode, collaboration.status]);

  // Right slot content for DocumentHeader
  const documentHeaderRightSlot = useMemo(() => {
    if (!isCreateMode) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unifiedStatus != null && <ConnectionStatus status={unifiedStatus} autoHide />}
          {collaboration.status !== 'disconnected' && (
            <PresenceAvatars users={collaboration.connectedUsers} />
          )}
          <IconButton onClick={handleExport} aria-label="export">
            <DownloadIcon />
          </IconButton>
        </Box>
      );
    }
    if (draftSaveStatus != null) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ConnectionStatus status={draftSaveStatus} autoHide />
        </Box>
      );
    }
    return undefined;
  }, [
    isCreateMode,
    unifiedStatus,
    draftSaveStatus,
    collaboration.status,
    collaboration.connectedUsers,
    handleExport,
  ]);

  useEffect(() => {
    setConfig({
      documentHeader: (
        <DocumentHeader
          title={title}
          onTitleChange={setTitle}
          category={category}
          onCategoryChange={setCategory}
          country={country}
          onCountryChange={setCountry}
          editorMode={editorMode}
          onModeChange={setEditorMode}
          templateId={id}
          isCreateMode={isCreateMode}
          readOnly={isReadOnly}
          createdAt={templateData?.template.createdAt}
          updatedAt={templateData?.template.updatedAt}
          createdBy={templateData?.template.createdBy}
          currentVersion={templateData?.template.currentVersion}
          rightSlot={documentHeaderRightSlot}
          onDelete={!isCreateMode && !isReadOnly ? handleDeleteClick : undefined}
        />
      ),
    });
    return () => {
      clearConfig();
    };
    // Intentionally omitting deps captured through documentHeaderRightSlot
  }, [
    isCreateMode,
    templateData,
    title,
    category,
    country,
    editorMode,
    id,
    isReadOnly,
    documentHeaderRightSlot,
    setConfig,
    clearConfig,
    handleDeleteClick,
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || autosave.saveState === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [autosave.saveState]);

  // Initialize form when template data loads
  if (!isCreateMode && templateData && !formInitialized) {
    setTitle(templateData.template.title);
    setCategory(templateData.template.category);
    setCountry(templateData.template.country ?? '');
    setContent(templateData.content);
    setFormInitialized(true);
  }

  const handleContentChange = useCallback(
    (md: string) => {
      setContent(md);
      isDirtyRef.current = true;
      if (id) {
        try {
          sessionStorage.setItem(`legalcode:backup:${id}`, md);
        } catch {
          /* v8 ignore next -- sessionStorage full or unavailable */
        }
      }
    },
    [id],
  );

  const handleMarginResolve = useCallback(
    (commentId: string) => {
      /* v8 ignore next -- defensive guard; id always exists when margin actions are visible */
      if (!id) return;
      resolveComment({ templateId: id, commentId });
    },
    [id, resolveComment],
  );

  const handleMarginDelete = useCallback(
    (commentId: string) => {
      /* v8 ignore next -- defensive guard; id always exists when margin actions are visible */
      if (!id) return;

      // Find the comment data for potential undo
      const thread = threads.find((t) => t.comment.id === commentId);
      const commentData = thread?.comment ?? thread?.replies.find((r) => r.id === commentId);

      deleteComment(
        { templateId: id, commentId },
        {
          onSuccess: () => {
            /* v8 ignore next -- defensive guard; commentData always exists when delete is triggered from visible comment */
            if (!commentData) return;
            const undoButton = createElement(
              Button,
              {
                size: 'small' as const,
                onClick: () => {
                  createComment({
                    templateId: id,
                    content: commentData.content,
                    ...(commentData.anchorFrom != null && { anchorFrom: commentData.anchorFrom }),
                    ...(commentData.anchorTo != null && { anchorTo: commentData.anchorTo }),
                    ...(commentData.anchorText != null && { anchorText: commentData.anchorText }),
                    ...(commentData.parentId != null && { parentId: commentData.parentId }),
                  });
                },
                sx: {
                  color: '#8027FF',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 0,
                  padding: '2px 8px',
                },
              },
              'Undo',
            );
            showToast('Comment deleted', 'success', undoButton);
          },
        },
      );
    },
    [id, threads, deleteComment, createComment, showToast],
  );

  const handleMarginReply = useCallback(
    (parentId: string, replyContent: string) => {
      /* v8 ignore next -- defensive guard; id always exists when margin actions are visible */
      if (!id) return;
      createComment({ templateId: id, content: replyContent, parentId });
    },
    [id, createComment],
  );

  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  // Loading state for edit mode
  if (!isCreateMode && templateQuery.isLoading) {
    return (
      <Box
        data-testid="editor-skeleton"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Box sx={{ px: 2, pt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={32} height={32} />
        </Box>
        <Box
          sx={{
            height: '44px',
            px: 2,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: '8px' }} />
        </Box>
        <Box sx={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
          <Box sx={{ maxWidth: '720px', mx: 'auto', py: 4, px: { xs: 2, sm: 4, md: 6 } }}>
            <Skeleton variant="text" width="50%" height={40} />
            <Box sx={{ borderBottom: '1px solid var(--border-secondary)', my: 3 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="95%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="90%" height={20} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <CommentAnchorProvider>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Editor toolbar — mode toggle moved to DocumentHeader */}
        <EditorToolbar
          mode={editorMode}
          wordCount={wordCount}
          readOnly={isReadOnly}
          crepeRef={crepeRef}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Full-bleed white editor surface */}
        <Box
          sx={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Box
            sx={{
              py: 4,
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            {/* Editor content — title/category moved to DocumentHeader */}
            {/* Source mode — always mounted, hidden when review */}
            <Box
              data-testid="source-editor-container"
              sx={{
                display: editorMode === 'source' ? 'block' : 'none',
                maxWidth: '720px',
                mx: 'auto',
                position: 'relative',
              }}
            >
              <Box
                ref={sourceContentRef}
                data-testid="source-editor-surface"
                sx={{
                  backgroundColor: '#FFFFFF',
                  position: 'relative',
                }}
              >
                <MarkdownEditor
                  defaultValue={!isCreateMode ? templateData?.content : undefined}
                  onChange={handleContentChange}
                  readOnly={isReadOnly}
                  onEditorReady={handleEditorReady}
                  onSelectionChange={onSelectionChange}
                />
                {!isCreateMode && (
                  <FloatingCommentButton
                    position={selectionInfo.buttonPosition}
                    visible={selectionInfo.hasSelection && !isReadOnly}
                    onClick={handleAddComment}
                  />
                )}
              </Box>
              {id != null && (
                <InlineCommentMargin
                  threads={threads}
                  contentRef={sourceContentRef}
                  activeCommentId={activeCommentId}
                  onCommentClick={handleCommentClick}
                  templateId={id}
                  onResolve={handleMarginResolve}
                  onDelete={handleMarginDelete}
                  onReply={handleMarginReply}
                  pendingAnchor={pendingAnchor}
                  onSubmitComment={handleSubmitComment}
                  onCancelComment={cancelComment}
                  /* v8 ignore next 2 -- nullish coalescing fallback for missing user fields */
                  authorName={user?.name ?? user?.email ?? ''}
                  authorEmail={user?.email ?? ''}
                  isCreating={isCreating}
                  pendingCommentTop={selectionInfo.buttonPosition?.top ?? undefined}
                />
              )}
            </Box>

            {/* Review mode — always mounted, hidden when source */}
            <Box
              sx={{
                display: editorMode === 'review' ? 'block' : 'none',
                maxWidth: '720px',
                mx: 'auto',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box
                  ref={reviewContentRef}
                  data-testid="review-content"
                  sx={{
                    backgroundColor: '#FFFFFF',
                    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                    lineHeight: 1.6,
                    minHeight: 200,
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    },
                    '& .template-var': {
                      backgroundColor: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    },
                    '& .clause-ref': {
                      backgroundColor: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontStyle: 'italic',
                    },
                    '& a': { color: 'var(--text-link)' },
                    '& hr': {
                      border: 'none',
                      borderTop: '1px solid var(--border-primary)',
                      margin: '24px 0',
                    },
                    '& table': { borderCollapse: 'collapse', width: '100%' },
                    '& td, & th': {
                      border: '1px solid var(--border-primary)',
                      padding: '8px',
                    },
                  }}
                  // nosemgrep: dangerous-innerhtml — markdownToHtml sanitizes input
                  dangerouslySetInnerHTML={{
                    __html: content ? markdownToHtml(content) : '<p>No content yet</p>',
                  }}
                />
                {!isCreateMode && (
                  <FloatingCommentButton
                    position={
                      reviewTextSelection.selectionRect
                        ? {
                            top: reviewTextSelection.selectionRect.top,
                            left: reviewTextSelection.selectionRect.left,
                          }
                        : null
                    }
                    visible={reviewTextSelection.hasSelection && !isReadOnly}
                    onClick={handleReviewAddComment}
                  />
                )}
              </Box>
              {id != null && (
                <InlineCommentMargin
                  threads={threads}
                  contentRef={reviewContentRef}
                  activeCommentId={activeCommentId}
                  onCommentClick={handleCommentClick}
                  templateId={id}
                  onResolve={handleMarginResolve}
                  onDelete={handleMarginDelete}
                  onReply={handleMarginReply}
                  pendingAnchor={reviewPendingAnchor}
                  onSubmitComment={handleReviewSubmitComment}
                  onCancelComment={() => {
                    setReviewPendingAnchor(null);
                  }}
                  /* v8 ignore next 2 -- nullish coalescing fallback for missing user fields */
                  authorName={user?.name ?? user?.email ?? ''}
                  authorEmail={user?.email ?? ''}
                  isCreating={isCreating}
                  pendingCommentTop={reviewTextSelection.selectionRect?.top ?? undefined}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Keyboard shortcut help dialog */}
        <KeyboardShortcutHelp
          open={shortcutHelpOpen}
          onClose={() => {
            setShortcutHelpOpen(false);
          }}
        />

        {/* Delete confirmation dialog */}
        <DeleteTemplateDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
          }}
          onConfirm={handleDeleteConfirm}
          templateTitle={title}
          isDeleting={deleteMutation.isPending}
        />
      </Box>
    </CommentAnchorProvider>
  );
}
