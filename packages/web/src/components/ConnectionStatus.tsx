import { Chip } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';

export type ConnectionStatusType = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

const statusConfig: Record<
  ConnectionStatusType,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  connected: { label: 'Connected', color: 'success' },
  connecting: { label: 'Connecting...', color: 'default' },
  disconnected: { label: 'Offline', color: 'error' },
  reconnecting: { label: 'Reconnecting...', color: 'warning' },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <Chip
      icon={<CircleIcon sx={{ fontSize: 10 }} />}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ ml: 1 }}
    />
  );
};
