import { useState, useCallback, useEffect, useRef, useMemo, createElement } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Box, Button, Skeleton } from '@mui/material';
import type { Crepe } from '@milkdown/crepe';
import type { EditorView } from '@codemirror/view';
import { replaceAll } from '@milkdown/kit/utils';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/kit/prose/state';
import { resolveAnchors } from '../editor/commentAnchors.js';
import { commentPluginKey } from '../editor/commentPlugin.js';
import { scanForConversions } from '../editor/importCleanup.js';
import type { DetectedConversion } from '../editor/importCleanup.js';
import { ImportCleanupDialog } from '../components/ImportCleanupDialog.js';
import { MarkdownEditor } from '../components/MarkdownEditor.js';
import { RawMarkdownEditor } from '../components/RawMarkdownEditor.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  useDeleteTemplate,
  useRestoreTemplate,
} from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { useCategories } from '../hooks/useCategories.js';
import { EditorRightSlot } from '../components/EditorRightSlot.js';
import type { ConnectionStatusType } from '../components/ConnectionStatus.js';
import { useAutosave } from '../hooks/useAutosave.js';
import type { AutosaveState } from '../hooks/useAutosave.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { useEditorHistory } from '../hooks/useEditorHistory.js';
import { useHeadingLevel } from '../hooks/useHeadingLevel.js';
import { useSourceEditorCommands } from '../hooks/useSourceEditorCommands.js';
import { KeyboardShortcutHelp } from '../components/KeyboardShortcutHelp.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useToast } from '../components/Toast.js';
import { useOutlineTree } from '../hooks/useOutlineTree.js';
import { OutlineView } from '../components/OutlineView.js';
import { useEditorComments } from '../hooks/useEditorComments.js';
import { useComments } from '../hooks/useComments.js';
import { MarginCommentTrigger } from '../components/MarginCommentTrigger.js';
import { useQueryClient } from '@tanstack/react-query';
import type { Template } from '@legalcode/shared';
import { useTopAppBarSetters } from '../contexts/TopAppBarContext.js';
import { CommentAnchorProvider } from '../contexts/CommentAnchorContext.js';
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

  // Extract primitive deps for setConfig effect to avoid object reference instability
  const templateCreatedAt = templateData?.template.createdAt;
  const templateUpdatedAt = templateData?.template.updatedAt;
  const templateCreatedBy = templateData?.template.createdBy;
  const templateCurrentVersion = templateData?.template.currentVersion;

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.categories ?? [];

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();
  const restoreMutation = useRestoreTemplate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [company, setCompany] = useState('');
  const [content, setContent] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  const [editorMode, setEditorMode] = useState<'edit' | 'source'>('edit');
  const [outlineMode, setOutlineMode] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [detectedConversions, setDetectedConversions] = useState<DetectedConversion[]>([]);

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

  // CodeMirror EditorView ref for source mode commands
  const cmViewRef = useRef<EditorView | null>(null);
  const handleCmViewReady = useCallback((view: EditorView | null) => {
    cmViewRef.current = view;
  }, []);

  // Crepe editor ref for Milkdown commands
  const crepeRef = useRef<Crepe | null>(null);
  const handleEditorReady = useCallback(
    (crepe: Crepe) => {
      crepeRef.current = crepe;
      // Sync existing comment anchors if threads already loaded
      if (threads.length > 0) {
        try {
          crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const docSize = view.state.doc.content.size;
            const anchors = resolveAnchors(
              threads.map((t) => t.comment),
              docSize,
            );
            const tr = view.state.tr.setMeta(commentPluginKey, { anchors });
            view.dispatch(tr);
          });
        } catch {
          // Editor may not be fully initialized
        }
      }
    },
    [threads],
  );

  // Sync comment anchors to ProseMirror decorations
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe || threads.length === 0) return;

    try {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const docSize = view.state.doc.content.size;
        const anchors = resolveAnchors(
          threads.map((t) => t.comment),
          docSize,
        );
        const tr = view.state.tr.setMeta(commentPluginKey, { anchors });
        view.dispatch(tr);
      });
    } catch {
      // Editor may not be ready yet
    }
  }, [threads]);

  // Outline tree hook
  const { entries: outlineEntries, refreshTree } = useOutlineTree(crepeRef);

  /* v8 ignore next 22 -- ProseMirror editor.action callbacks require fully initialized editor; tested via OutlineView integration */
  const handleReorderSection = useCallback(
    (fromPos: number, fromEndPos: number, toPos: number) => {
      const crepe = crepeRef.current;
      if (!crepe) return;
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { tr } = view.state;
        const sectionSlice = tr.doc.slice(fromPos, fromEndPos);
        const afterDelete = tr.delete(fromPos, fromEndPos);
        const adjustedTo = toPos > fromPos ? toPos - (fromEndPos - fromPos) : toPos;
        const step = afterDelete.replaceRange(adjustedTo, adjustedTo, sectionSlice);
        view.dispatch(step);
      });
      refreshTree();
    },
    [refreshTree],
  );

  /* v8 ignore next 20 -- ProseMirror editor.action callbacks require fully initialized editor; tested via OutlineView integration */
  const handleNavigateToHeading = useCallback((pos: number) => {
    setOutlineMode(false);
    const crepe = crepeRef.current;
    if (!crepe) return;
    setTimeout(() => {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        try {
          const resolvedPos = view.state.doc.resolve(pos);
          const selection = TextSelection.near(resolvedPos);
          const navTr = view.state.tr.setSelection(selection).scrollIntoView();
          view.dispatch(navTr);
          view.focus();
        } catch {
          // Position may be invalid after reordering
        }
      });
    }, 100);
  }, []);

  // Edit mode comment margin ref
  const sourceContentRef = useRef<HTMLDivElement>(null);

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  /* v8 ignore next 3 -- callback passed to InlineCommentMargin, invoked by DOM event handler */
  const handleCommentClick = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
  }, []);

  // Sync content back to Milkdown when switching from source to edit mode
  const handleModeChange = useCallback(
    (newMode: 'edit' | 'source') => {
      if (newMode === 'edit' && editorMode === 'source') {
        crepeRef.current?.editor.action(replaceAll(content));
      }
      if (newMode === 'source') {
        setOutlineMode(false);
      }
      setEditorMode(newMode);
    },
    [editorMode, content],
  );

  // Ref for handleModeChange — read inside setConfig effect to avoid
  // re-triggering the context update cycle that causes React Error #185.
  const handleModeChangeRef = useRef(handleModeChange);
  handleModeChangeRef.current = handleModeChange;

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

  // Collaboration user — passed to EditorRightSlot which owns useCollaboration
  const collaborationUser = useMemo(
    () =>
      !isCreateMode && !isViewer && user
        ? { userId: user.id, email: user.email, color: '#1976d2' }
        : null,
    [isCreateMode, isViewer, user?.id, user?.email],
  );

  const isDeleted = templateData?.template.deletedAt != null;
  const isReadOnly = isViewer || isDeleted;

  const { canUndo, canRedo, handleUndo, handleRedo } = useEditorHistory({
    crepeRef,
  });

  const { handleIndent, handleOutdent } = useHeadingLevel(crepeRef);

  const sourceCommands = useSourceEditorCommands(cmViewRef);

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
    const resolvedCompany = company !== '' ? company : undefined;
    const resolvedContent = content !== '' ? content : ' ';
    void createMutation
      .mutateAsync({
        title,
        category: resolvedCategory,
        country: resolvedCountry,
        company: resolvedCompany,
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
  }, [title, category, categories, country, company, content, createMutation, navigate, showToast]);

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

  // Ref for handleDeleteClick — read inside setConfig effect to avoid
  // re-triggering the context update cycle that causes React Error #185.
  const handleDeleteClickRef = useRef(handleDeleteClick);
  handleDeleteClickRef.current = handleDeleteClick;

  const handleImportCleanup = useCallback(() => {
    const crepe = crepeRef.current;
    /* v8 ignore next -- defensive guard; crepeRef always set by onEditorReady */
    if (!crepe) return;
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const conversions = scanForConversions(view.state.doc);
      if (conversions.length === 0) {
        showToast('No numbering detected', 'info');
        return;
      }
      setDetectedConversions(conversions);
      setCleanupDialogOpen(true);
    });
  }, [showToast]);

  const handleApplyCleanup = useCallback(
    (selected: DetectedConversion[]) => {
      const crepe = crepeRef.current;
      /* v8 ignore next -- defensive guard; crepeRef always set by onEditorReady */
      if (!crepe) return;
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        let tr = view.state.tr;
        // Process in reverse order for stable positions
        const sorted = [...selected].sort((a, b) => b.pos - a.pos);
        for (const conv of sorted) {
          const node = tr.doc.nodeAt(conv.pos);
          if (!node) continue;
          const headingType = view.state.schema.nodes.heading;
          if (!headingType) continue;
          if (node.type.name === 'heading') {
            // Replace heading content with cleaned text, keeping same heading level
            const level =
              typeof node.attrs.level === 'number' ? node.attrs.level : conv.headingLevel;
            const headingNode = headingType.create(
              { level },
              view.state.schema.text(conv.cleanedText),
            );
            tr = tr.replaceWith(conv.pos, conv.pos + node.nodeSize, headingNode);
          } else if (node.type.name === 'paragraph') {
            // Convert paragraph to heading
            const headingNode = headingType.create(
              { level: conv.headingLevel },
              view.state.schema.text(conv.cleanedText),
            );
            tr = tr.replaceWith(conv.pos, conv.pos + node.nodeSize, headingNode);
          }
        }
        view.dispatch(tr);
      });
      setCleanupDialogOpen(false);
      const paragraphCount = selected.filter((c) => c.sourceType === 'paragraph').length;
      const headingCount = selected.filter((c) => c.sourceType === 'heading').length;
      const parts: string[] = [];
      if (paragraphCount > 0) {
        parts.push(
          `converted ${String(paragraphCount)} paragraph${paragraphCount === 1 ? '' : 's'} to headings`,
        );
      }
      if (headingCount > 0) {
        parts.push(`cleaned ${String(headingCount)} heading${headingCount === 1 ? '' : 's'}`);
      }
      const message =
        parts.length > 0
          ? parts.join(', ')
          : `Applied ${String(selected.length)} cleanup${selected.length === 1 ? '' : 's'}`;
      // Capitalize first letter
      showToast(message.charAt(0).toUpperCase() + message.slice(1), 'success');
    },
    [showToast],
  );

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
  const { setConfig, clearConfig } = useTopAppBarSetters();

  // Refs break the render loop (React #185): context setters are NOT deps —
  // they update via refs, so setConfig doesn't re-trigger itself through context.
  const setConfigRef = useRef(setConfig);
  setConfigRef.current = setConfig;
  const clearConfigRef = useRef(clearConfig);
  clearConfigRef.current = clearConfig;

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

  // Right slot content for DocumentHeader — EditorRightSlot owns collaboration state.
  // Return undefined (not a React element) when in create mode with nothing to show,
  // so DocumentHeader knows not to render the right slot region.
  const documentHeaderRightSlot = useMemo(() => {
    if (isCreateMode && draftSaveStatus == null) {
      return undefined;
    }
    return (
      <EditorRightSlot
        collaborationUser={collaborationUser}
        draftSaveStatus={draftSaveStatus}
        onExport={handleExport}
        queryClient={queryClient}
        id={id}
      />
    );
  }, [isCreateMode, draftSaveStatus, collaborationUser, handleExport, queryClient, id]);

  // Ref for documentHeaderRightSlot — read inside setConfig effect to avoid
  // re-triggering the context update cycle that causes React Error #185.
  const rightSlotRef = useRef(documentHeaderRightSlot);
  rightSlotRef.current = documentHeaderRightSlot;

  // Refs break the render loop (React #185): volatile JSX/callback references
  // are NOT deps — they update via refs, and draftSaveStatus covers the only
  // primitive change that requires a context update for the right slot.
  useEffect(() => {
    setConfigRef.current({
      documentHeader: (
        <DocumentHeader
          title={title}
          onTitleChange={setTitle}
          category={category}
          onCategoryChange={setCategory}
          country={country}
          onCountryChange={setCountry}
          company={company}
          onCompanyChange={setCompany}
          editorMode={editorMode}
          onModeChange={(mode: 'edit' | 'source') => {
            handleModeChangeRef.current(mode);
          }}
          templateId={id}
          isCreateMode={isCreateMode}
          readOnly={isReadOnly}
          createdAt={templateCreatedAt}
          updatedAt={templateUpdatedAt}
          createdBy={templateCreatedBy}
          currentVersion={templateCurrentVersion}
          rightSlot={rightSlotRef.current}
          onDelete={
            !isCreateMode && !isReadOnly
              ? () => {
                  handleDeleteClickRef.current();
                }
              : undefined
          }
        />
      ),
    });
    return () => {
      clearConfigRef.current();
    };
  }, [
    isCreateMode,
    templateCreatedAt,
    templateUpdatedAt,
    templateCreatedBy,
    templateCurrentVersion,
    title,
    category,
    country,
    company,
    editorMode,
    id,
    isReadOnly,
    draftSaveStatus,
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

  // Reset form when navigating to a different template
  const prevIdRef = useRef(id);
  /* v8 ignore next 13 -- navigation reset requires React Router param change; covered by e2e */
  useEffect(() => {
    if (prevIdRef.current !== id) {
      setFormInitialized(false);
      setTitle('');
      setCategory('');
      setCountry('');
      setCompany('');
      setContent('');
      isDirtyRef.current = false;
      hasAutoCreatedRef.current = false;
      autoCreateFailedRef.current = false;
      prevIdRef.current = id;
    }
  }, [id]);

  // Initialize form when template data loads
  if (!isCreateMode && templateData && !formInitialized) {
    setTitle(templateData.template.title);
    setCategory(templateData.template.category);
    setCountry(templateData.template.country ?? '');
    setCompany(templateData.template.company ?? '');
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
          backgroundColor: '#EDEDED',
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
        <Box sx={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', backgroundColor: '#EDEDED' }}>
          <Box
            sx={{
              maxWidth: 1200,
              mx: 'auto',
              py: 4,
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            <Box
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E0E0E4',
                borderRadius: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                p: { xs: '24px 16px', sm: '36px 48px', md: '48px 72px' },
                my: 3,
              }}
            >
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
          onUndo={editorMode === 'source' ? sourceCommands.undo : handleUndo}
          onRedo={editorMode === 'source' ? sourceCommands.redo : handleRedo}
          onImportCleanup={handleImportCleanup}
          outlineMode={outlineMode}
          onToggleOutline={() => {
            setOutlineMode((prev) => !prev);
          }}
          onIndentHeading={handleIndent}
          onOutdentHeading={handleOutdent}
          onSourceWrap={sourceCommands.wrapSelection}
          onSourceLinePrefix={sourceCommands.insertLinePrefix}
          onSourceBlock={sourceCommands.insertBlock}
        />

        {/* Outline view — full replacement for editor canvas when active */}
        {outlineMode && (
          <Box
            data-testid="outline-view-container"
            sx={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <OutlineView
              entries={outlineEntries}
              onReorderSection={handleReorderSection}
              onNavigateToHeading={handleNavigateToHeading}
              onClose={() => {
                setOutlineMode(false);
              }}
            />
          </Box>
        )}

        {/* Canvas background — grey surface with centered page */}
        <Box
          sx={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            backgroundColor: '#EDEDED',
            display: outlineMode ? 'none' : undefined,
          }}
        >
          <Box
            sx={{
              py: 4,
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            {/* Editor layout container — full width with right padding reserving space for margin comments */}
            <Box
              data-testid="editor-layout-container"
              sx={{
                position: 'relative',
                pr: { xs: 0, lg: '340px' },
              }}
            >
              {/* Edit mode — always mounted, hidden when source */}
              <Box
                data-testid="edit-editor-container"
                sx={{
                  display: editorMode === 'edit' ? 'block' : 'none',
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                  p: { xs: '24px 16px', sm: '36px 48px', md: '48px 72px' },
                  my: 3,
                  minHeight: 'calc(100vh - 200px)',
                  position: 'relative',
                }}
              >
                <Box
                  ref={sourceContentRef}
                  data-testid="edit-editor-surface"
                  sx={{
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
                </Box>
                {!isCreateMode && (
                  <MarginCommentTrigger
                    top={selectionInfo.buttonPosition?.top ?? null}
                    visible={selectionInfo.hasSelection && !isReadOnly}
                    onClick={handleAddComment}
                  />
                )}
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

              {/* Source mode — raw markdown editor */}
              <Box
                data-testid="source-editor-wrapper"
                sx={{
                  display: editorMode === 'source' ? 'block' : 'none',
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                  p: { xs: '24px 16px', sm: '36px 48px', md: '48px 72px' },
                  my: 3,
                  minHeight: 'calc(100vh - 200px)',
                }}
              >
                <RawMarkdownEditor
                  value={content}
                  onChange={handleContentChange}
                  readOnly={isReadOnly}
                  onViewReady={handleCmViewReady}
                />
              </Box>
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

        {/* Import Cleanup dialog */}
        <ImportCleanupDialog
          open={cleanupDialogOpen}
          onClose={() => {
            setCleanupDialogOpen(false);
          }}
          conversions={detectedConversions}
          onApply={handleApplyCleanup}
        />
      </Box>
    </CommentAnchorProvider>
  );
}
