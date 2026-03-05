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
      <List>
        {sorted.map((v) => (
          <ListItemButton
            key={v.id}
            selected={v.version === currentVersion}
            onClick={() => {
              handleVersionClick(v.version);
            }}
          >
            <Chip label={`v${String(v.version)}`} size="small" sx={{ mr: 2 }} />
            <ListItemText
              primary={v.changeSummary ?? 'Initial version'}
              secondary={new Date(v.createdAt).toLocaleDateString()}
            />
          </ListItemButton>
        ))}
      </List>
      {selectedVersion != null && (
        <Box sx={{ mt: 2 }}>
          <MarkdownEditor defaultValue={selectedVersion.content} readOnly />
        </Box>
      )}
    </Box>
  );
}
