import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  Skeleton,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTemplate, useTemplateVersions } from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { useTopAppBarConfig } from '../contexts/TopAppBarContext.js';
import { markdownToHtml } from '../utils/markdownToHtml.js';
import { relativeTime } from '../utils/relativeTime.js';
import { computeDiff } from '../utils/diff.js';

export function VersionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const templateId = id ?? '';

  const templateQuery = useTemplate(templateId);
  const templateData = templateQuery.data;

  const { data: versions, isLoading: versionsLoading } = useTemplateVersions(templateId);

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const { setConfig, clearConfig } = useTopAppBarConfig();

  // Set app bar config
  useEffect(() => {
    setConfig({
      breadcrumbTemplateName: templateData?.template.title,
      breadcrumbPageName: 'Version History',
    });
    return () => {
      clearConfig();
    };
  }, [setConfig, clearConfig, templateData?.template.title]);

  // Auto-select current version on load
  useEffect(() => {
    if (templateData && selectedVersion === null) {
      setSelectedVersion(templateData.template.currentVersion);
    }
  }, [templateData, selectedVersion]);

  // Load version content when selected
  useEffect(() => {
    if (!templateId || selectedVersion === null) return;

    // If selecting the current version, use the template data content
    if (selectedVersion === templateData?.template.currentVersion) {
      setVersionContent(templateData.content);
      return;
    }

    setLoadingContent(true);
    void templateService.getVersion(templateId, selectedVersion).then((v) => {
      setVersionContent(v.content);
      setLoadingContent(false);
    });
  }, [templateId, selectedVersion, templateData]);

  const handleVersionSelect = useCallback(
    (version: number) => {
      if (version === selectedVersion) return;
      setSelectedVersion(version);
      setVersionContent(null);
      setLoadingContent(true);

      void templateService.getVersion(templateId, version).then((v) => {
        setVersionContent(v.content);
        setLoadingContent(false);
      });
    },
    [templateId, selectedVersion],
  );

  const handleRestoreClick = useCallback(() => {
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialogOpen(false);
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (selectedVersion === null || !versionContent) return;
    setRestoreDialogOpen(false);

    void templateService
      .update(templateId, {
        content: versionContent,
        changeSummary: `Restored from version ${String(selectedVersion)}`,
      })
      .then(() => {
        void navigate(`/templates/${templateId}`);
      });
  }, [templateId, selectedVersion, versionContent, navigate]);

  const currentVersion = templateData?.template.currentVersion ?? 0;
  const isCurrentSelected = selectedVersion === currentVersion;

  const sorted = useMemo(() => {
    if (!versions) return [];
    return [...versions].sort((a, b) => b.version - a.version);
  }, [versions]);

  // Diff computation
  const diffHtml = useMemo(() => {
    if (!showDiff || !versionContent || !templateData) return null;

    const currentContent = templateData.content;
    const lines = computeDiff(versionContent, currentContent);

    return lines
      .map((line) => {
        if (line.type === 'added') {
          return `<div style="background-color: #D1FAE5; padding: 2px 8px;">${line.text || '&nbsp;'}</div>`;
        }
        if (line.type === 'removed') {
          return `<div style="background-color: #FEE2E2; padding: 2px 8px; text-decoration: line-through;">${line.text || '&nbsp;'}</div>`;
        }
        return `<div style="padding: 2px 8px;">${line.text || '&nbsp;'}</div>`;
      })
      .join('');
  }, [showDiff, versionContent, templateData]);

  // Loading state
  if (templateQuery.isLoading || versionsLoading) {
    return (
      <Box data-testid="version-history-skeleton" sx={{ display: 'flex', height: '100%' }}>
        <Box sx={{ flex: 1, p: 4 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="100%" height={20} sx={{ mt: 3 }} />
          <Skeleton variant="text" width="95%" height={20} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="100%" height={20} sx={{ mt: 3 }} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="90%" height={20} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 3 }} />
          <Skeleton variant="text" width="85%" height={20} />
        </Box>
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            backgroundColor: '#F9F9FB',
            p: '20px 16px',
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 0.5, borderRadius: '8px' }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Split layout */}
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          backgroundColor: 'var(--surface-primary)',
        }}
      >
        {/* Document Preview (left) */}
        <Box
          role="region"
          aria-label="Document preview"
          aria-live="polite"
          data-loading={String(loadingContent)}
          sx={{
            flex: 1,
            overflowY: 'auto',
            borderRight: '1px solid var(--border-primary)',
            position: 'relative',
            opacity: loadingContent ? 0.5 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          {/* Diff toggle */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              p: 2,
              zIndex: 1,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={showDiff}
                  onChange={(_, checked) => {
                    setShowDiff(checked);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      'aria-label': 'Show changes between selected version and current version',
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Show changes
                </Typography>
              }
              labelPlacement="start"
              sx={{ mr: 0 }}
            />
          </Box>

          {/* Content */}
          <Box
            sx={{
              maxWidth: 'var(--editor-max-width)',
              mx: 'auto',
              py: 4,
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            {showDiff && diffHtml && !isCurrentSelected ? (
              <Box
                data-testid="diff-view"
                sx={{
                  fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                  lineHeight: 1.6,
                  fontSize: '0.875rem',
                }}
                // nosemgrep: dangerous-innerhtml — diffHtml is generated from diff library, not user input
                dangerouslySetInnerHTML={{ __html: diffHtml }}
              />
            ) : (
              <Box
                sx={{
                  fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                  lineHeight: 1.6,
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
                }}
                // nosemgrep: dangerous-innerhtml — markdownToHtml sanitizes input
                dangerouslySetInnerHTML={{
                  __html: versionContent ? markdownToHtml(versionContent) : '<p>No content</p>',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Version Timeline (right) */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            backgroundColor: '#F9F9FB',
            overflowY: 'auto',
            p: '20px 16px',
          }}
        >
          {/* Timeline header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: '20px',
              pb: 2,
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Versions
            </Typography>
            <Box
              component="span"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--surface-tertiary)',
                borderRadius: '10px',
                px: 1,
                py: 0.25,
                ml: 1,
              }}
            >
              {String(sorted.length)}
            </Box>
          </Box>

          {/* Timeline list */}
          <Box
            role="listbox"
            aria-label="Version list"
            sx={{
              position: 'relative',
              pl: '20px',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '20px',
                top: 8,
                bottom: 8,
                width: 2,
                backgroundColor: 'var(--border-primary)',
              },
            }}
          >
            {sorted.map((v) => {
              const isCurrent = v.version === currentVersion;
              const isSelected = v.version === selectedVersion;

              return (
                <Box
                  key={v.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`v${String(v.version)}${isCurrent ? ' (current)' : ''}`}
                  tabIndex={0}
                  className="version-card"
                  onClick={() => {
                    handleVersionSelect(v.version);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleVersionSelect(v.version);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    ml: 4,
                    mb: 0.5,
                    p: 1.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isCurrent
                      ? 'rgba(128, 39, 255, 0.04)'
                      : isSelected
                        ? '#FFFFFF'
                        : 'transparent',
                    border: isSelected
                      ? '1px solid var(--border-primary)'
                      : '1px solid transparent',
                    boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                    transition: 'background-color 150ms ease',
                    '&:hover': {
                      backgroundColor: isSelected ? '#FFFFFF' : 'var(--surface-tertiary)',
                    },
                  }}
                >
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -40,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: isCurrent
                        ? '#8027FF'
                        : isSelected
                          ? 'var(--text-primary)'
                          : 'var(--border-primary)',
                      border: isCurrent ? '2px solid #8027FF' : 'none',
                      zIndex: 1,
                      transition: 'background-color 200ms ease',
                    }}
                  />

                  {/* Horizontal connector */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -30,
                      top: '50%',
                      width: 8,
                      height: 2,
                      backgroundColor: 'var(--border-primary)',
                    }}
                  />

                  {/* Version header row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      v{String(v.version)}
                    </Typography>

                    {isCurrent && (
                      <Box
                        component="span"
                        sx={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: '#8027FF',
                          backgroundColor: 'rgba(128, 39, 255, 0.08)',
                          borderRadius: '4px',
                          px: 0.75,
                          py: 0.125,
                        }}
                      >
                        current
                      </Box>
                    )}

                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        ml: 'auto',
                      }}
                    >
                      {relativeTime(v.createdAt)}
                    </Typography>
                  </Box>

                  {/* Change summary */}
                  <Typography
                    sx={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.875rem',
                      color: 'var(--text-body)',
                      mt: 0.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {v.changeSummary ?? 'Initial version'}
                  </Typography>

                  {v.createdBy && (
                    <Typography
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        mt: 0.25,
                      }}
                    >
                      {v.createdBy}
                    </Typography>
                  )}

                  {/* Restore button — visible on hover for non-current versions */}
                  {!isCurrent && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreClick();
                      }}
                      aria-label={`Restore to version ${String(v.version)}`}
                      className="restore-button"
                      sx={{
                        mt: 1,
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: '#8027FF',
                        textTransform: 'none',
                        height: 28,
                        px: 1,
                        opacity: isSelected ? 1 : 0,
                        transition: 'opacity 150ms ease',
                        '.version-card:hover &': {
                          opacity: 1,
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(128, 39, 255, 0.04)',
                        },
                      }}
                    >
                      Restore this version
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Restore confirmation dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={handleRestoreCancel}
        slotProps={{
          paper: {
            sx: {
              minWidth: 360,
              maxWidth: 480,
              borderRadius: '12px',
            },
          },
          backdrop: {
            sx: { backdropFilter: 'blur(8px)' },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontWeight: 600,
          }}
        >
          Restore to v{selectedVersion != null ? String(selectedVersion) : ''}?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-body)',
            }}
          >
            This will create a new version with the content from v
            {selectedVersion != null ? String(selectedVersion) : ''}. The current content will be
            preserved as v{String(currentVersion + 1)}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleRestoreCancel}
            sx={{
              color: 'var(--text-secondary)',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestoreConfirm}
            variant="contained"
            sx={{
              backgroundColor: '#8027FF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#6B1FD6' },
            }}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
