import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, Typography, Snackbar } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  action?: ReactNode | undefined;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

let toastId = 0;

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircleOutline sx={{ color: '#2D6A4F', fontSize: 20 }} />,
  error: <ErrorOutline sx={{ color: '#D32F2F', fontSize: 20 }} />,
  info: <InfoOutlined sx={{ color: '#8027FF', fontSize: 20 }} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ReactNode) => {
    toastId += 1;
    setToast({ id: toastId, message, type, action });
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setOpen(false);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [open, toast?.id]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-testid="toast-container"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: '#F7F0E6',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(69,31,97,0.14)',
            px: 2.5,
            py: 1.5,
            minWidth: 280,
          }}
        >
          {toast != null && icons[toast.type]}
          <Typography sx={{ fontSize: '0.875rem', color: '#451F61', flex: 1 }}>
            {toast?.message}
          </Typography>
          {toast?.action}
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}
