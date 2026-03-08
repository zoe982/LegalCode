import { useState, useCallback, useEffect, useRef, createElement } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { MarkdownEditor } from '../components/MarkdownEditor.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
  useUnarchiveTemplate,
} from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { useCollaboration } from '../hooks/useCollaboration.js';
import { PresenceAvatars } from '../components/PresenceAvatars.js';
import { ConnectionStatus } from '../components/ConnectionStatus.js';
import type { ConnectionStatusType } from '../components/ConnectionStatus.js';
import { useAutosave } from '../hooks/useAutosave.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
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
import { SlideOverPanel } from '../components/SlideOverPanel.js';
import { CommentsTab } from '../components/CommentsTab.js';

interface TemplateDetail {
  template: Template;
  content: string;
  tags: string[];
}

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isCreateMode = id === undefined;
  const isViewer = user?.role === 'viewer';

  const templateQuery = useTemplate(id ?? '');
  const templateData = templateQuery.data as TemplateDetail | undefined;

  const createMutation = useCreateTemplate();
  const publishMutation = usePublishTemplate();
  const archiveMutation = useArchiveTemplate();
  const unarchiveMutation = useUnarchiveTemplate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  // Archive confirmation dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Unarchive confirmation dialog state
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);

  const [editorMode, setEditorMode] = useState<'source' | 'review'>('source');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  // Publish confirmation dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const isDirtyRef = useRef(false);

  // Panel state — comments slide-over
  const [activePanel, setActivePanel] = useState<'comments' | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { selectionInfo, pendingAnchor, startComment, cancelComment, onSelectionChange } =
    useEditorComments();
  const { threads, createComment } = useComments(id);

  // Review mode comment highlighting
  const reviewContentRef = useRef<HTMLDivElement>(null);
  const reviewTextSelection = useTextSelection(reviewContentRef);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [reviewPendingAnchor, setReviewPendingAnchor] = useState<{
    anchorText: string;
    anchorFrom: string;
    anchorTo: string;
  } | null>(null);

  /* v8 ignore next 4 -- callback passed to useCommentHighlights, invoked by DOM event handler */
  const handleCommentClick = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
    setActivePanel('comments');
  }, []);

  useCommentHighlights(
    reviewContentRef,
    editorMode === 'review' ? threads : [],
    handleCommentClick,
  );

  const handleAddComment = useCallback(() => {
    startComment();
    setActivePanel('comments');
  }, [startComment]);

  const handleReviewAddComment = useCallback(() => {
    if (reviewTextSelection.selectedText) {
      setReviewPendingAnchor({
        anchorText: reviewTextSelection.selectedText.slice(0, 500),
        anchorFrom: '0',
        anchorTo: String(reviewTextSelection.selectedText.length),
      });
    }
    setActivePanel('comments');
  }, [reviewTextSelection.selectedText]);

  // Collaboration — only for existing templates with edit permission
  const collaborationUser =
    !isCreateMode && !isViewer && user
      ? { userId: user.id, email: user.email, color: '#1976d2' }
      : null;
  const collaboration = useCollaboration(!isCreateMode ? id : null, collaborationUser, {
    onCommentEvent: useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['comments', id] });
    }, [queryClient, id]),
  });

  const status = templateData?.template.status;
  const isReadOnly = isViewer || status === 'archived';

  const autosave = useAutosave({
    templateId: id,
    status,
    content,
    title,
    enabled: !isCreateMode && !isViewer && status === 'draft',
  });

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
      if (!isCreateMode && status === 'draft') {
        autosave.saveNow();
      }
      showToast("Your work is saved automatically — you're all set", 'success');
    }, [isCreateMode, status, autosave, showToast]),
    onAddComment: handleAddComment,
  });

  const handleExport = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined when export is visible */
    if (id) {
      void templateService.download(id);
    }
  }, [id]);

  const handleCreateDraft = useCallback(() => {
    void createMutation
      .mutateAsync({
        title,
        category,
        country: country || undefined,
        content,
        tags: tags.length > 0 ? tags : undefined,
      })
      .then((result: unknown) => {
        const created = result as { template: Template };
        void navigate(`/templates/${created.template.id}`);
      })
      .catch(() => {
        showToast('Failed to create template', 'error');
      });
  }, [createMutation, title, category, country, content, tags, navigate, showToast]);

  const handlePublishClick = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);

  const handleArchiveClick = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  const handleUnarchiveClick = useCallback(() => {
    setUnarchiveDialogOpen(true);
  }, []);

  // Sync TopAppBar config for editor view — v4: use DocumentHeader
  const { setConfig, clearConfig } = useTopAppBarConfig();

  // Derive connection status for draft autosave display
  const draftSaveStatus: ConnectionStatusType | null =
    !isCreateMode && status === 'draft' && !isViewer
      ? autosave.saveState === 'saving'
        ? 'saving'
        : autosave.saveState === 'saved'
          ? 'saved'
          : autosave.saveState === 'error'
            ? 'error'
            : 'connected' // idle -> show as connected/saved
      : null;

  // Right slot content for DocumentHeader
  const documentHeaderRightSlot = !isCreateMode ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {draftSaveStatus != null && <ConnectionStatus status={draftSaveStatus} />}
      {collaboration.status !== 'disconnected' && status !== 'draft' && (
        <>
          <ConnectionStatus status={collaboration.status as ConnectionStatusType} />
          <PresenceAvatars users={collaboration.connectedUsers} />
        </>
      )}
      <IconButton onClick={handleExport} aria-label="export">
        <DownloadIcon />
      </IconButton>
    </Box>
  ) : undefined;

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
          status={templateData?.template.status}
          editorMode={editorMode}
          onModeChange={setEditorMode}
          templateId={id}
          isCreateMode={isCreateMode}
          readOnly={isReadOnly}
          createdAt={templateData?.template.createdAt}
          updatedAt={templateData?.template.updatedAt}
          createdBy={templateData?.template.createdBy}
          currentVersion={templateData?.template.currentVersion}
          onPublish={!isReadOnly && status === 'draft' ? handlePublishClick : undefined}
          onArchive={!isReadOnly && status === 'active' ? handleArchiveClick : undefined}
          onUnarchive={status === 'archived' ? handleUnarchiveClick : undefined}
          onSaveDraft={isCreateMode ? handleCreateDraft : undefined}
          rightSlot={documentHeaderRightSlot}
        />
      ),
    });
    return () => {
      clearConfig();
    };
  }, [
    isCreateMode,
    templateData,
    title,
    category,
    country,
    editorMode,
    id,
    isReadOnly,
    status,
    collaboration.status,
    collaboration.connectedUsers,
    setConfig,
    clearConfig,
    handleExport,
    handlePublishClick,
    handleArchiveClick,
    handleUnarchiveClick,
    handleCreateDraft,
    draftSaveStatus,
    autosave.saveState,
    isViewer,
    documentHeaderRightSlot,
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
    setTags(templateData.tags);
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

  const handlePublishConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void publishMutation.mutateAsync(id).catch(() => {
      showToast('Failed to publish template', 'error');
    });
    setPublishDialogOpen(false);
  }, [publishMutation, id, showToast]);

  const handleArchiveConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void archiveMutation
      .mutateAsync(id)
      .then(() => {
        showToast(
          'Template archived',
          'success',
          createElement(
            Button,
            {
              size: 'small' as const,
              onClick: () => {
                void unarchiveMutation.mutateAsync(id);
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
          ),
        );
      })
      .catch(() => {
        showToast('Failed to archive template', 'error');
      });
    setArchiveDialogOpen(false);
  }, [archiveMutation, unarchiveMutation, id, showToast]);

  const handleUnarchiveConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void unarchiveMutation.mutateAsync(id).catch(() => {
      showToast('Failed to unarchive template', 'error');
    });
    setUnarchiveDialogOpen(false);
  }, [unarchiveMutation, id, showToast]);

  const handleSubmitNewComment = useCallback(
    (
      commentContent: string,
      anchor: { anchorText: string; anchorFrom: string; anchorTo: string },
    ) => {
      /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
      if (!id) return;
      createComment({
        templateId: id,
        content: commentContent,
        anchorText: anchor.anchorText,
        anchorFrom: anchor.anchorFrom,
        anchorTo: anchor.anchorTo,
      });
      cancelComment();
    },
    [id, createComment, cancelComment],
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
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ maxWidth: '1100px', mx: 'auto', py: 4, px: { xs: 2, sm: 4, md: 6 } }}>
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
          connectionStatus={
            !isCreateMode && collaboration.status !== 'disconnected'
              ? (collaboration.status as
                  | 'connected'
                  | 'connecting'
                  | 'disconnected'
                  | 'reconnecting')
              : undefined
          }
          readOnly={isReadOnly}
        />

        {/* Full-bleed white editor surface with centered 1100px content column */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Box
            sx={{
              maxWidth: '1100px',
              mx: 'auto',
              py: 4,
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            {/* Editor content — title/category moved to DocumentHeader */}
            {editorMode === 'source' ? (
              <Box
                data-testid="source-editor-surface"
                sx={{
                  backgroundColor: '#FFFFFF',
                  flex: 1,
                  position: 'relative',
                }}
              >
                <MarkdownEditor
                  defaultValue={!isCreateMode ? templateData?.content : undefined}
                  onChange={handleContentChange}
                  readOnly={isReadOnly}
                  collaboration={
                    !isCreateMode && collaboration.ydoc && collaboration.awareness
                      ? { ydoc: collaboration.ydoc, awareness: collaboration.awareness }
                      : undefined
                  }
                  onSelectionChange={onSelectionChange}
                />
                <FloatingCommentButton
                  position={selectionInfo.buttonPosition}
                  visible={selectionInfo.hasSelection && !isReadOnly}
                  onClick={handleAddComment}
                />
              </Box>
            ) : (
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
                    '& td, & th': { border: '1px solid var(--border-primary)', padding: '8px' },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: content ? markdownToHtml(content) : '<p>No content yet</p>',
                  }}
                />
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
              </Box>
            )}
          </Box>
        </Box>

        {/* Publish confirmation dialog */}
        <Dialog
          open={publishDialogOpen}
          onClose={() => {
            setPublishDialogOpen(false);
          }}
          slotProps={{
            paper: {
              sx: {
                maxWidth: 480,
                backgroundColor: '#F7F0E6',
                borderRadius: '16px',
              },
            },
            backdrop: {
              sx: { backdropFilter: 'blur(4px)' },
            },
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
              fontWeight: 600,
              color: '#451F61',
            }}
          >
            Publish Template
          </DialogTitle>
          <DialogContent>
            <Typography>
              Publishing makes this template available for use across the organization. Continue?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setPublishDialogOpen(false);
              }}
              sx={{ color: '#451F61' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePublishConfirm}
              sx={{
                backgroundColor: '#8027FF',
                color: '#fff',
                '&:hover': { backgroundColor: '#6B1FD6' },
              }}
            >
              Publish
            </Button>
          </DialogActions>
        </Dialog>

        {/* Archive confirmation dialog */}
        <Dialog
          open={archiveDialogOpen}
          onClose={() => {
            setArchiveDialogOpen(false);
          }}
        >
          <DialogTitle>Archive Template</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to archive this template? You can unarchive it later from the
              Info panel.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setArchiveDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleArchiveConfirm}
              sx={{
                backgroundColor: '#D32F2F',
                color: '#fff',
                '&:hover': { backgroundColor: '#B71C1C' },
              }}
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unarchive confirmation dialog */}
        <Dialog
          open={unarchiveDialogOpen}
          onClose={() => {
            setUnarchiveDialogOpen(false);
          }}
        >
          <DialogTitle>Unarchive Template</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to unarchive this template? It will return to draft status.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setUnarchiveDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUnarchiveConfirm}
              sx={{
                backgroundColor: '#8027FF',
                color: '#fff',
                '&:hover': { backgroundColor: '#6B1FD6' },
              }}
            >
              Unarchive
            </Button>
          </DialogActions>
        </Dialog>

        {/* Keyboard shortcut help dialog */}
        <KeyboardShortcutHelp
          open={shortcutHelpOpen}
          onClose={() => {
            setShortcutHelpOpen(false);
          }}
        />

        {/* Slide-over panels */}
        <SlideOverPanel
          open={activePanel === 'comments'}
          onClose={() => {
            setActivePanel(null);
          }}
          title="Comments"
        >
          <CommentsTab
            templateId={id}
            pendingAnchor={editorMode === 'review' ? reviewPendingAnchor : pendingAnchor}
            onSubmitNew={handleSubmitNewComment}
            onCancelNew={() => {
              cancelComment();
              setReviewPendingAnchor(null);
            }}
            activeCommentId={activeCommentId}
          />
        </SlideOverPanel>
      </Box>
    </CommentAnchorProvider>
  );
}
