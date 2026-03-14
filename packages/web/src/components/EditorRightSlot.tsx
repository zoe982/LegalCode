import { useMemo, useCallback, memo } from 'react';
import { Box, IconButton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { QueryClient } from '@tanstack/react-query';
import { useCollaboration } from '../hooks/useCollaboration.js';
import type { CollaborationUser } from '../hooks/useCollaboration.js';
import { PresenceAvatars } from './PresenceAvatars.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import type { ConnectionStatusType } from './ConnectionStatus.js';

interface EditorRightSlotProps {
  collaborationUser: CollaborationUser | null;
  draftSaveStatus: ConnectionStatusType | null;
  onExport: () => void;
  queryClient: QueryClient;
  id: string | undefined;
  onSuggestionEvent?: (() => void) | undefined;
}

const priority: ConnectionStatusType[] = [
  'error',
  'saving',
  'reconnecting',
  'connecting',
  'disconnected',
  'saved',
  'connected',
];

export const EditorRightSlot = memo(function EditorRightSlot({
  collaborationUser,
  draftSaveStatus,
  onExport,
  queryClient,
  id,
  onSuggestionEvent,
}: EditorRightSlotProps) {
  const isCreateMode = id === undefined;

  const onCommentEvent = useCallback(() => {
    /* v8 ignore next -- callback invoked by WebSocket message handler, tested in useCollaboration.test.ts */
    void queryClient.invalidateQueries({ queryKey: ['comments', id] });
  }, [queryClient, id]);

  const collaboration = useCollaboration(!isCreateMode ? id : null, collaborationUser, {
    onCommentEvent,
    onSuggestionEvent,
  });

  const unifiedStatus: ConnectionStatusType | null = useMemo(() => {
    const statuses: ConnectionStatusType[] = [];
    if (draftSaveStatus != null) statuses.push(draftSaveStatus);
    if (!isCreateMode && collaboration.status !== 'disconnected') {
      statuses.push(collaboration.status as ConnectionStatusType);
    }
    if (statuses.length === 0) return null;

    for (const p of priority) {
      if (statuses.includes(p)) return p;
      /* v8 ignore next -- fallback unreachable; priority array covers all ConnectionStatusType values */
    }
    return statuses[0] ?? null;
  }, [draftSaveStatus, isCreateMode, collaboration.status]);

  if (!isCreateMode) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {unifiedStatus != null && <ConnectionStatus status={unifiedStatus} autoHide />}
        {collaboration.status !== 'disconnected' && (
          <PresenceAvatars users={collaboration.connectedUsers} />
        )}
        <IconButton onClick={onExport} aria-label="export">
          <DownloadIcon />
        </IconButton>
      </Box>
    );
  }

  if (draftSaveStatus != null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ConnectionStatus status={draftSaveStatus} autoHide />
      </Box>
    );
  }

  return null;
});
