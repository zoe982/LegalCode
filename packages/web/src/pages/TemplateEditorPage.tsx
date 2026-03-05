import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tab,
  Tabs,
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
import { useAuth } from '../hooks/useAuth.js';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
} from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
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

  const [activeTab, setActiveTab] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  // Change summary dialog state
  const [changeSummaryOpen, setChangeSummaryOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');

  // Archive confirmation dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

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

  const handleSaveActive = useCallback(() => {
    setChangeSummaryOpen(true);
  }, []);

  const handleChangeSummaryConfirm = useCallback(() => {
    if (!id) return;
    void updateMutation.mutateAsync({
      id,
      data: {
        title,
        category,
        country: country || undefined,
        content,
        changeSummary: changeSummary || undefined,
        tags: tags.length > 0 ? tags : undefined,
      },
    });
    setChangeSummaryOpen(false);
    setChangeSummary('');
  }, [updateMutation, id, title, category, country, content, changeSummary, tags]);

  const handlePublish = useCallback(() => {
    if (!id) return;
    void publishMutation.mutateAsync(id);
  }, [publishMutation, id]);

  const handleArchiveClick = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    if (!id) return;
    void archiveMutation.mutateAsync(id);
    setArchiveDialogOpen(false);
  }, [archiveMutation, id]);

  const status = templateData?.template.status;
  const isReadOnly = isViewer || status === 'archived';

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
    <Box sx={{ p: 3 }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={handleBack} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {headerTitle}
        </Typography>
        {!isCreateMode && (
          <IconButton onClick={handleExport} aria-label="export">
            <DownloadIcon />
          </IconButton>
        )}
      </Box>

      {/* Tabs (edit mode only) */}
      {!isCreateMode && (
        <Tabs
          value={activeTab}
          onChange={(_e, val: number) => {
            setActiveTab(val);
          }}
          sx={{ mb: 3 }}
        >
          <Tab label="Edit" />
          <Tab label="Versions" />
        </Tabs>
      )}

      {/* Edit tab or create form */}
      {(isCreateMode || activeTab === 0) && (
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
          <MarkdownEditor
            defaultValue={isCreateMode ? undefined : templateData?.content}
            onChange={handleContentChange}
            readOnly={isReadOnly}
          />

          {/* Action buttons */}
          {!isViewer && (
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              {isCreateMode && (
                <Button variant="contained" onClick={handleCreateDraft}>
                  Save Draft
                </Button>
              )}
              {!isCreateMode && status === 'draft' && (
                <>
                  <Button variant="contained" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                  <Button variant="outlined" onClick={handlePublish}>
                    Publish
                  </Button>
                </>
              )}
              {!isCreateMode && status === 'active' && (
                <>
                  <Button variant="contained" onClick={handleSaveActive}>
                    Save
                  </Button>
                  <Button variant="outlined" color="warning" onClick={handleArchiveClick}>
                    Archive
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Versions tab */}
      {!isCreateMode && activeTab === 1 && <Typography>Version history</Typography>}

      {/* Change summary dialog */}
      <Dialog
        open={changeSummaryOpen}
        onClose={() => {
          setChangeSummaryOpen(false);
        }}
      >
        <DialogTitle>Change Summary</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Describe your changes"
            value={changeSummary}
            onChange={(e) => {
              setChangeSummary(e.target.value);
            }}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setChangeSummaryOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleChangeSummaryConfirm}>
            Save
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
          <Button variant="contained" color="warning" onClick={handleArchiveConfirm}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
