import { useState, useCallback } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import type { TemplateVersion } from '@legalcode/shared';
import { useTemplateVersions } from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { MarkdownEditor } from './MarkdownEditor.js';

interface VersionHistoryProps {
  templateId: string;
  currentVersion: number;
  onNavigateDiff?: ((fromVersion: number, toVersion: number) => void) | undefined;
  onRestore?: ((version: number) => void) | undefined;
}

export function VersionHistory({
  templateId,
  currentVersion,
  onNavigateDiff,
  onRestore,
}: VersionHistoryProps) {
  const { data: versions, isLoading } = useTemplateVersions(templateId);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);

  const handleVersionClick = useCallback(
    (version: number) => {
      void templateService.getVersion(templateId, version).then((v) => {
        setSelectedVersion(v);
      });
    },
    [templateId],
  );

  const handleRestoreClick = useCallback((version: number) => {
    setRestoreVersion(version);
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (restoreVersion != null && onRestore) {
      onRestore(restoreVersion);
    }
    setRestoreDialogOpen(false);
    setRestoreVersion(null);
  }, [restoreVersion, onRestore]);

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialogOpen(false);
    setRestoreVersion(null);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#12111A',
            mb: 0.5,
          }}
        >
          No versions yet
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            color: '#9B9DB0',
            lineHeight: 1.5,
          }}
        >
          Your version history will build automatically as you work.
        </Typography>
      </Box>
    );
  }

  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Box>
      {/* Compare versions button — only when 2+ versions exist */}
      {sorted.length >= 2 && onNavigateDiff != null && (
        <Button
          aria-label="Compare versions"
          startIcon={<CompareArrowsIcon />}
          onClick={() => {
            const newest = sorted[0];
            const secondNewest = sorted[1];
            if (newest && secondNewest) {
              onNavigateDiff(secondNewest.version, newest.version);
            }
          }}
          sx={{
            mb: 1.5,
            color: '#8027FF',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
          }}
          size="small"
        >
          Compare versions
        </Button>
      )}

      <Box
        sx={{
          position: 'relative',
          pl: 3,
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 12,
            top: 8,
            bottom: 8,
            width: 2,
            backgroundColor: '#E4E5ED',
          },
        }}
      >
        <List disablePadding>
          {sorted.map((v, idx) => {
            const isCurrent = v.version === currentVersion;
            const prevVersion = sorted[idx + 1];
            return (
              <Box key={v.id} sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: -20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#8027FF' : '#D4C5B3',
                    zIndex: 1,
                  }}
                />
                <ListItemButton
                  selected={isCurrent}
                  onClick={() => {
                    handleVersionClick(v.version);
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(128, 39, 255, 0.06)',
                      '&:hover': {
                        backgroundColor: 'rgba(128, 39, 255, 0.1)',
                      },
                    },
                  }}
                >
                  <Chip
                    label={`v${String(v.version)}`}
                    size="small"
                    sx={{
                      mr: 2,
                      backgroundColor: isCurrent ? '#8027FF' : '#F3F3F7',
                      color: isCurrent ? '#fff' : '#12111A',
                      fontWeight: 600,
                    }}
                  />
                  <ListItemText
                    primary={v.changeSummary ?? 'Initial version'}
                    secondary={new Date(v.createdAt).toLocaleDateString()}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#12111A',
                          fontFamily: '"DM Sans", sans-serif',
                        },
                      },
                      secondary: {
                        sx: {
                          fontSize: '0.75rem',
                          color: '#9B9DB0',
                          fontFamily: '"DM Sans", sans-serif',
                        },
                      },
                    }}
                  />
                </ListItemButton>

                {/* Action buttons below each version item */}
                <Box sx={{ display: 'flex', gap: 1, ml: 1, mb: 1 }}>
                  {/* View diff — only when there's a previous version */}
                  {prevVersion != null && onNavigateDiff != null && (
                    <Button
                      aria-label="View diff"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateDiff(prevVersion.version, v.version);
                      }}
                      sx={{
                        color: '#8027FF',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        minWidth: 0,
                        py: 0,
                      }}
                    >
                      View diff
                    </Button>
                  )}

                  {/* Restore — only for non-current versions */}
                  {!isCurrent && onRestore != null && (
                    <Button
                      aria-label="Restore"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreClick(v.version);
                      }}
                      sx={{
                        color: '#6B6D82',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        minWidth: 0,
                        py: 0,
                      }}
                    >
                      Restore
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}
        </List>
      </Box>
      {selectedVersion != null && (
        <Box sx={{ mt: 2 }}>
          <MarkdownEditor defaultValue={selectedVersion.content} readOnly />
        </Box>
      )}

      {/* Restore confirmation dialog */}
      <Dialog open={restoreDialogOpen} onClose={handleRestoreCancel}>
        <DialogTitle>Restore this version?</DialogTitle>
        <DialogContent>
          <Typography>
            This will create a new version with the content from version{' '}
            {restoreVersion != null ? String(restoreVersion) : ''}. The current content will not be
            lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRestoreCancel} sx={{ color: '#12111A' }}>
            Cancel
          </Button>
          <Button
            onClick={handleRestoreConfirm}
            aria-label="Confirm"
            variant="contained"
            sx={{
              backgroundColor: '#8027FF',
              '&:hover': { backgroundColor: '#6B1FD6' },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
