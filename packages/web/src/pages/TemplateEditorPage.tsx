import { useState, useCallback, useEffect, useMemo, useRef, createElement } from 'react';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { MarkdownEditor } from '../components/MarkdownEditor.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
  useUnarchiveTemplate,
} from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { useCollaboration } from '../hooks/useCollaboration.js';
import { PresenceAvatars } from '../components/PresenceAvatars.js';
import { ConnectionStatus } from '../components/ConnectionStatus.js';
import type { ConnectionStatusType } from '../components/ConnectionStatus.js';
import { SaveVersionDialog } from '../components/SaveVersionDialog.js';
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
import { StatusChip } from '../components/StatusChip.js';
import { MetadataTab } from '../components/MetadataTab.js';
import { PanelToggleButtons } from '../components/PanelToggleButtons.js';
import { SlideOverPanel } from '../components/SlideOverPanel.js';
import { CommentsTab } from '../components/CommentsTab.js';
import { VersionHistory } from '../components/VersionHistory.js';

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
  const updateMutation = useUpdateTemplate();
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

  // Save version dialog state
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [editorMode, setEditorMode] = useState<'source' | 'review'>('source');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  // Publish confirmation dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const isDirtyRef = useRef(false);

  // Panel state
  const [activePanel, setActivePanel] = useState<'info' | 'comments' | 'history' | null>(null);
  const handlePanelToggle = useCallback((panel: 'info' | 'comments' | 'history') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { selectionInfo, pendingAnchor, startComment, cancelComment } = useEditorComments();
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
      showToast("Your work is saved automatically — you're all set", 'success');
    }, [showToast]),
    onAddComment: handleAddComment,
  });

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

  const handleExport = useCallback(() => {
    if (id) {
      void templateService.download(id);
    }
  }, [id]);

  // Sync TopAppBar config for editor view
  const { setConfig, clearConfig } = useTopAppBarConfig();

  const panelToggles = useMemo(
    () => <PanelToggleButtons activePanel={activePanel} onToggle={handlePanelToggle} />,
    [activePanel, handlePanelToggle],
  );

  useEffect(() => {
    if (!isCreateMode && templateData) {
      setConfig({
        breadcrumbTemplateName: title || templateData.template.title,
        statusBadge: <StatusChip status={templateData.template.status} />,
        panelToggles,
        rightSlot: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {collaboration.status !== 'disconnected' && (
              <>
                <ConnectionStatus status={collaboration.status as ConnectionStatusType} />
                <PresenceAvatars users={collaboration.connectedUsers} />
              </>
            )}
            <IconButton onClick={handleExport} aria-label="export">
              <DownloadIcon />
            </IconButton>
          </Box>
        ),
      });
    } else if (isCreateMode) {
      setConfig({
        breadcrumbTemplateName: 'New Template',
        panelToggles,
        statusBadge: undefined,
        rightSlot: undefined,
      });
    }
    return () => {
      clearConfig();
    };
  }, [
    isCreateMode,
    templateData,
    title,
    collaboration.status,
    collaboration.connectedUsers,
    setConfig,
    clearConfig,
    handleExport,
    panelToggles,
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, []);

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

  const handleBack = useCallback(() => {
    void navigate('/');
  }, [navigate]);

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
      });
  }, [createMutation, title, category, country, content, tags, navigate]);

  const handleSaveDraft = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void updateMutation
      .mutateAsync({
        id,
        data: {
          title,
          category,
          country: country || undefined,
          content,
          tags: tags.length > 0 ? tags : undefined,
        },
      })
      .then(() => {
        isDirtyRef.current = false;
        sessionStorage.removeItem(`legalcode:backup:${id}`);
      });
  }, [updateMutation, id, title, category, country, content, tags]);

  const handlePublishClick = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);

  const handlePublishConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void publishMutation.mutateAsync(id);
    setPublishDialogOpen(false);
  }, [publishMutation, id]);

  const handleArchiveClick = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void archiveMutation.mutateAsync(id).then(() => {
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
    });
    setArchiveDialogOpen(false);
  }, [archiveMutation, unarchiveMutation, id, showToast]);

  const handleUnarchiveClick = useCallback(() => {
    setUnarchiveDialogOpen(true);
  }, []);

  const handleUnarchiveConfirm = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void unarchiveMutation.mutateAsync(id);
    setUnarchiveDialogOpen(false);
  }, [unarchiveMutation, id]);

  const handleSaveVersion = useCallback(
    (summary: string) => {
      setSavingVersion(true);
      void collaboration
        .saveVersion(summary)
        .then(() => {
          isDirtyRef.current = false;
          if (id) {
            sessionStorage.removeItem(`legalcode:backup:${id}`);
          }
        })
        .finally(() => {
          setSavingVersion(false);
          setSaveVersionOpen(false);
        });
    },
    [collaboration.saveVersion, id],
  );

  const handleRestoreVersion = useCallback(
    (version: number) => {
      if (!id) return;
      void templateService.getVersion(id, version).then((versionData) => {
        const restoredContent = versionData.content;

        // Update Yjs doc if collaboration is active
        if (collaboration.ydoc) {
          const ydoc = collaboration.ydoc;
          ydoc.transact(() => {
            const text = ydoc.getText('content');
            text.delete(0, text.length);
            text.insert(0, restoredContent);
          });
        }
        setContent(restoredContent);

        // Save as a new version
        void collaboration.saveVersion(`Restored from version ${String(version)}`).then(() => {
          showToast(`Restored to version ${String(version)}`, 'success');
        });
      });
    },
    [id, collaboration, showToast],
  );

  const handleSubmitNewComment = useCallback(
    (
      commentContent: string,
      anchor: { anchorText: string; anchorFrom: string; anchorTo: string },
    ) => {
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
          <Box sx={{ maxWidth: '720px', mx: 'auto', py: 4, px: 2 }}>
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
        {/* Back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1, gap: 1 }}>
          <IconButton onClick={handleBack} aria-label="back" size="small">
            <ArrowBackIcon />
          </IconButton>
        </Box>

        {/* Editor toolbar */}
        <EditorToolbar
          mode={editorMode}
          onModeChange={setEditorMode}
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

        {/* Full-bleed white editor surface with centered 720px content column */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Box
            sx={{
              maxWidth: '720px',
              mx: 'auto',
              py: 4,
              px: 2,
            }}
          >
            {/* Borderless title input — Source Serif 4, 1.75rem, 700 */}
            <Box
              component="input"
              type="text"
              placeholder="Untitled"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTitle(e.target.value);
              }}
              readOnly={isReadOnly}
              sx={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                padding: 0,
                '&::placeholder': {
                  color: 'var(--text-tertiary)',
                },
              }}
            />

            {/* Separator */}
            <Box
              sx={{
                borderBottom: '1px solid var(--border-secondary)',
                my: 3,
              }}
            />

            {/* Editor content */}
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

            {/* Action buttons */}
            {!isViewer && (
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                {isCreateMode && (
                  <Button variant="contained" onClick={handleCreateDraft}>
                    Save Draft
                  </Button>
                )}
                {!isCreateMode && status === 'draft' && (
                  <Button variant="contained" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                )}
                {!isCreateMode && status === 'active' && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSaveVersionOpen(true);
                    }}
                  >
                    Save Version
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Save version dialog */}
        <SaveVersionDialog
          open={saveVersionOpen}
          onClose={() => {
            setSaveVersionOpen(false);
          }}
          onSave={handleSaveVersion}
          saving={savingVersion}
        />

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

        <SlideOverPanel
          open={activePanel === 'info'}
          onClose={() => {
            setActivePanel(null);
          }}
          title="Info"
        >
          {!isCreateMode && templateData != null && (
            <MetadataTab
              category={templateData.template.category}
              country={templateData.template.country ?? ''}
              tags={templateData.tags}
              status={templateData.template.status}
              createdAt={templateData.template.createdAt}
              updatedAt={templateData.template.updatedAt}
              readOnly={isReadOnly}
              onPublish={!isReadOnly && status === 'draft' ? handlePublishClick : undefined}
              onArchive={!isReadOnly && status === 'active' ? handleArchiveClick : undefined}
              onUnarchive={status === 'archived' ? handleUnarchiveClick : undefined}
            />
          )}
        </SlideOverPanel>

        <SlideOverPanel
          open={activePanel === 'history'}
          onClose={() => {
            setActivePanel(null);
          }}
          title="Version History"
        >
          {!isCreateMode && templateData != null && (
            <VersionHistory
              templateId={id}
              currentVersion={templateData.template.currentVersion}
              onRestore={handleRestoreVersion}
              onNavigateDiff={(from, to) => {
                void navigate(`/templates/${id}/diff/${String(from)}/${String(to)}`);
              }}
            />
          )}
        </SlideOverPanel>
      </Box>
    </CommentAnchorProvider>
  );
}
