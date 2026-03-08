import { Box, keyframes } from '@mui/material';

export type ConnectionStatusType =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'saving'
  | 'saved'
  | 'error';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onRetry?: (() => void) | undefined;
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
  connected: { label: 'All changes saved', dotColor: '#059669', pulsing: false },
  connecting: { label: 'Connecting...', dotColor: '#D97706', pulsing: false },
  disconnected: { label: 'Offline — changes saved locally', dotColor: '#DC2626', pulsing: false },
  reconnecting: { label: 'Reconnecting...', dotColor: '#D97706', pulsing: true },
  saving: { label: 'Saving...', dotColor: '#D97706', pulsing: true },
  saved: { label: 'All changes saved', dotColor: '#059669', pulsing: false },
  error: { label: 'Save failed — retrying...', dotColor: '#DC2626', pulsing: true },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onRetry }) => {
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
          transition: 'background-color 0.3s ease',
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
      {status === 'disconnected' && onRetry != null && (
        <Box
          component="button"
          onClick={onRetry}
          aria-label="Retry connection"
          sx={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            color: '#8027FF',
            lineHeight: 1,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          Retry
        </Box>
      )}
    </Box>
  );
};
