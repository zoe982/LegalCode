import { useState, useCallback } from 'react';
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
import type { Template } from '@legalcode/shared';

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
  });

  // Collaboration — only for existing templates with edit permission
  const collaborationUser =
    !isCreateMode && !isViewer && user
      ? { userId: user.id, email: user.email, color: '#1976d2' }
      : null;
  const collaboration = useCollaboration(!isCreateMode ? id : null, collaborationUser);

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

  const handleExport = useCallback(() => {
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

  const handlePublish = useCallback(() => {
    /* v8 ignore next -- guard for TypeScript; id is always defined in edit mode */
    if (!id) return;
    void publishMutation.mutateAsync(id);
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

  const status = templateData?.template.status;
  const isReadOnly = isViewer || status === 'archived';
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  // Loading state for edit mode
  if (!isCreateMode && templateQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const headerTitle = isCreateMode
    ? 'New Template'
    : (templateData?.template.title ?? 'Loading...');

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
        {/* Top bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <IconButton onClick={handleBack} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            {headerTitle}
          </Typography>
          {!isCreateMode && collaboration.status !== 'disconnected' && (
            <>
              <ConnectionStatus status={collaboration.status as ConnectionStatusType} />
              <PresenceAvatars users={collaboration.connectedUsers} />
            </>
          )}
          {!isCreateMode && (
            <IconButton onClick={handleExport} aria-label="export">
              <DownloadIcon />
            </IconButton>
          )}
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
              <MarkdownEditor
                defaultValue={undefined}
                onChange={handleContentChange}
                readOnly={isReadOnly}
                collaboration={undefined}
              />
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

        {/* Edit mode: title + editor + action buttons (no inline category/country/tags) */}
        {!isCreateMode && (
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
            {editorMode === 'source' ? (
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
                  onPublish={!isReadOnly && status === 'draft' ? handlePublish : undefined}
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
          <Button variant="contained" color="warning" onClick={handleArchiveConfirm}>
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
