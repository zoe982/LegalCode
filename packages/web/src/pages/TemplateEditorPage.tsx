import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { MarkdownEditor } from '../components/MarkdownEditor.js';
import { VersionHistory } from '../components/VersionHistory.js';
import { RightPane } from '../components/RightPane.js';
import { MetadataTab } from '../components/MetadataTab.js';
import { CommentsTab } from '../components/CommentsTab.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
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
import type { Template } from '@legalcode/shared';
import { useTopAppBarConfig } from '../contexts/TopAppBarContext.js';
import { StatusChip } from '../components/StatusChip.js';

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

  const [rightPaneOpen, setRightPaneOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  // Archive confirmation dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Save version dialog state
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [editorMode, setEditorMode] = useState<'source' | 'review'>('source');
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  // Publish confirmation dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const { showToast } = useToast();

  // Keyboard shortcuts for pane toggle and help dialog
  useKeyboardShortcuts({
    onTogglePane: useCallback(() => {
      setRightPaneOpen((prev) => !prev);
    }, []),
    onEscape: useCallback(() => {
      setRightPaneOpen(false);
    }, []),
    onShowHelp: useCallback(() => {
      setShortcutHelpOpen(true);
    }, []),
    onCtrlS: useCallback(() => {
      showToast('Changes save automatically', 'info');
    }, [showToast]),
  });

  // Collaboration — only for existing templates with edit permission
  const collaborationUser =
    !isCreateMode && !isViewer && user
      ? { userId: user.id, email: user.email, color: '#1976d2' }
      : null;
  const collaboration = useCollaboration(!isCreateMode ? id : null, collaborationUser);

  const status = templateData?.template.status;
  const isReadOnly = isViewer || status === 'archived';

  const handleExport = useCallback(() => {
    if (id) {
      void templateService.download(id);
    }
  }, [id]);

  // Sync TopAppBar config for editor view
  const { setConfig, clearConfig } = useTopAppBarConfig();

  const handleTitleChangeViaAppBar = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  useEffect(() => {
    if (!isCreateMode && templateData) {
      setConfig({
        editableTitle: title || templateData.template.title,
        onTitleChange: isReadOnly ? undefined : handleTitleChangeViaAppBar,
        statusBadge: <StatusChip status={templateData.template.status} />,
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
        editableTitle: 'New Template',
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
    isReadOnly,
    collaboration.status,
    collaboration.connectedUsers,
    setConfig,
    clearConfig,
    handleTitleChangeViaAppBar,
    handleExport,
  ]);

  // Initialize form when template data loads
  if (!isCreateMode && templateData && !formInitialized) {
    setTitle(templateData.template.title);
    setCategory(templateData.template.category);
    setCountry(templateData.template.country ?? '');
    setTags(templateData.tags);
    setContent(templateData.content);
    setFormInitialized(true);
  }

  const handleContentChange = useCallback((md: string) => {
    setContent(md);
  }, []);

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
    void updateMutation.mutateAsync({
      id,
      data: {
        title,
        category,
        country: country || undefined,
        content,
        tags: tags.length > 0 ? tags : undefined,
      },
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
    void archiveMutation.mutateAsync(id);
    setArchiveDialogOpen(false);
  }, [archiveMutation, id]);

  const handleSaveVersion = useCallback(
    (summary: string) => {
      setSavingVersion(true);
      void collaboration.saveVersion(summary).finally(() => {
        setSavingVersion(false);
        setSaveVersionOpen(false);
      });
    },
    [collaboration.saveVersion],
  );

  const handleTogglePane = useCallback(() => {
    setRightPaneOpen((prev) => !prev);
  }, []);

  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  // Loading state for edit mode
  if (!isCreateMode && templateQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Central workspace */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'auto',
          p: 3,
        }}
      >
        {/* Back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
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

        {/* Create mode: inline form with all fields */}
        {isCreateMode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              required
              disabled={isReadOnly}
              fullWidth
            />
            <TextField
              label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
              required
              disabled={isReadOnly}
              fullWidth
            />
            <TextField
              label="Country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
              }}
              placeholder="e.g. US, UK"
              disabled={isReadOnly}
              fullWidth
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={tags}
              onChange={(_e, newValue: string[]) => {
                setTags(newValue);
              }}
              disabled={isReadOnly}
              renderValue={(value: string[], getItemProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...itemProps } = getItemProps({ index });
                  return <Chip key={key} label={option} size="small" {...itemProps} />;
                })
              }
              renderInput={(params) => <TextField {...params} label="Tags" />}
            />
            {editorMode === 'source' ? (
              <Box
                data-testid="source-editor-surface"
                sx={{
                  backgroundColor: '#F5EEE3',
                  px: { xs: 3, lg: 6 },
                  py: 2,
                  borderRadius: '8px',
                  flex: 1,
                }}
              >
                <MarkdownEditor
                  defaultValue={undefined}
                  onChange={handleContentChange}
                  readOnly={isReadOnly}
                  collaboration={undefined}
                />
              </Box>
            ) : (
              <Box
                data-testid="review-content"
                sx={{
                  maxWidth: 860,
                  mx: 'auto',
                  p: 3,
                  backgroundColor: '#F7F0E6',
                  borderRadius: '12px',
                  fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                  lineHeight: 1.6,
                  minHeight: 200,
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                    color: '#451F61',
                    fontWeight: 600,
                  },
                  '& .template-var': {
                    backgroundColor: '#8027FF1A',
                    color: '#8027FF',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  },
                  '& .clause-ref': {
                    backgroundColor: '#8027FF1A',
                    color: '#8027FF',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontStyle: 'italic',
                  },
                  '& a': { color: '#8027FF' },
                  '& hr': { border: 'none', borderTop: '1px solid #D4C5B2', margin: '24px 0' },
                  '& table': { borderCollapse: 'collapse', width: '100%' },
                  '& td, & th': { border: '1px solid #D4C5B2', padding: '8px' },
                }}
                dangerouslySetInnerHTML={{
                  __html: content ? markdownToHtml(content) : '<p>No content yet</p>',
                }}
              />
            )}

            {/* Action buttons — create mode */}
            {!isViewer && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="contained" onClick={handleCreateDraft}>
                  Save Draft
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Edit mode: editor + action buttons (title moved to TopAppBar) */}
        {!isCreateMode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editorMode === 'source' ? (
              <Box
                data-testid="source-editor-surface"
                sx={{
                  backgroundColor: '#F5EEE3',
                  px: { xs: 3, lg: 6 },
                  py: 2,
                  borderRadius: '8px',
                  flex: 1,
                }}
              >
                <MarkdownEditor
                  defaultValue={templateData?.content}
                  onChange={handleContentChange}
                  readOnly={isReadOnly}
                  collaboration={
                    collaboration.ydoc && collaboration.awareness
                      ? { ydoc: collaboration.ydoc, awareness: collaboration.awareness }
                      : undefined
                  }
                />
              </Box>
            ) : (
              <Box
                data-testid="review-content"
                sx={{
                  maxWidth: 860,
                  mx: 'auto',
                  p: 3,
                  backgroundColor: '#F7F0E6',
                  borderRadius: '12px',
                  fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                  lineHeight: 1.6,
                  minHeight: 200,
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                    color: '#451F61',
                    fontWeight: 600,
                  },
                  '& .template-var': {
                    backgroundColor: '#8027FF1A',
                    color: '#8027FF',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  },
                  '& .clause-ref': {
                    backgroundColor: '#8027FF1A',
                    color: '#8027FF',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontStyle: 'italic',
                  },
                  '& a': { color: '#8027FF' },
                  '& hr': { border: 'none', borderTop: '1px solid #D4C5B2', margin: '24px 0' },
                  '& table': { borderCollapse: 'collapse', width: '100%' },
                  '& td, & th': { border: '1px solid #D4C5B2', padding: '8px' },
                }}
                dangerouslySetInnerHTML={{
                  __html: content ? markdownToHtml(content) : '<p>No content yet</p>',
                }}
              />
            )}

            {/* Action buttons — edit mode */}
            {!isViewer && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                {status === 'draft' && (
                  <Button variant="contained" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                )}
                {status === 'active' && (
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
        )}
      </Box>

      {/* Right pane — edit mode only */}
      {!isCreateMode && templateData != null && (
        <RightPane
          open={rightPaneOpen}
          onToggle={handleTogglePane}
          tabs={[
            {
              label: 'Metadata',
              content: (
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
                />
              ),
            },
            {
              label: 'Comments',
              content: <CommentsTab templateId={id} />,
            },
            {
              label: 'Versions',
              content: (
                <VersionHistory
                  templateId={id}
                  currentVersion={templateData.template.currentVersion}
                />
              ),
            },
          ]}
        />
      )}

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
            Are you sure you want to archive this template? Archived templates cannot be edited.
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

      {/* Keyboard shortcut help dialog */}
      <KeyboardShortcutHelp
        open={shortcutHelpOpen}
        onClose={() => {
          setShortcutHelpOpen(false);
        }}
      />
    </Box>
  );
}
