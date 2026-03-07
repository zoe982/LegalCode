import { Box, keyframes } from '@mui/material';

export type ConnectionStatusType = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
`;

const statusConfig: Record<
  ConnectionStatusType,
  { label: string; dotColor: string; pulsing: boolean }
> = {
  connected: { label: 'Saved', dotColor: '#059669', pulsing: false },
  connecting: { label: 'Connecting...', dotColor: '#D97706', pulsing: false },
  disconnected: { label: 'Offline — changes saved locally', dotColor: '#DC2626', pulsing: false },
  reconnecting: { label: 'Reconnecting...', dotColor: '#D97706', pulsing: true },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Box
        data-testid="status-dot"
        sx={{
          width: '8px',
          height: '8px',
          borderRadius: '9999px',
          backgroundColor: config.dotColor,
          flexShrink: 0,
          ...(config.pulsing && {
            animation: `${pulse} 1.5s infinite`,
          }),
        }}
      />
      <Box
        component="span"
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.75rem',
          color: '#9B9DB0',
          lineHeight: 1,
        }}
      >
        {config.label}
      </Box>
    </Box>
  );
};
