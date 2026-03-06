import { useState, useCallback } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { TemplateVersion } from '@legalcode/shared';
import { useTemplateVersions } from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { MarkdownEditor } from './MarkdownEditor.js';

interface VersionHistoryProps {
  templateId: string;
  currentVersion: number;
}

export function VersionHistory({ templateId, currentVersion }: VersionHistoryProps) {
  const { data: versions, isLoading } = useTemplateVersions(templateId);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);

  const handleVersionClick = useCallback(
    (version: number) => {
      void templateService.getVersion(templateId, version).then((v) => {
        setSelectedVersion(v);
      });
    },
    [templateId],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!versions || versions.length === 0) {
    return <Typography>No versions</Typography>;
  }

  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Box>
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
            backgroundColor: '#D4C5B3',
          },
        }}
      >
        <List disablePadding>
          {sorted.map((v) => {
            const isCurrent = v.version === currentVersion;
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
                      backgroundColor: isCurrent ? '#8027FF' : '#E6D9C6',
                      color: isCurrent ? '#fff' : '#451F61',
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
                          color: '#451F61',
                        },
                      },
                      secondary: {
                        sx: {
                          fontSize: '0.75rem',
                          color: '#9A8DA6',
                        },
                      },
                    }}
                  />
                </ListItemButton>
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
    </Box>
  );
}
