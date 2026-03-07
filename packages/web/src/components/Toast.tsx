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
  success: <CheckCircleOutline sx={{ color: '#059669', fontSize: 20 }} />,
  error: <ErrorOutline sx={{ color: '#DC2626', fontSize: 20 }} />,
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
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E4E5ED',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
            px: 2.5,
            py: 1.5,
            minWidth: 280,
          }}
        >
          {toast != null && icons[toast.type]}
          <Typography sx={{ fontSize: '0.875rem', color: '#12111A', flex: 1 }}>
            {toast?.message}
          </Typography>
          {toast?.action}
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}
