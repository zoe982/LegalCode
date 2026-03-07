import { useEffect, useRef, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const DISMISS_KEY = 'legalcode:install-dismissed';

export const InstallPrompt: React.FC = () => {
  const [showInstall, setShowInstall] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    deferredPrompt.current = e as BeforeInstallPromptEvent;
    setShowInstall(true);
  }, []);

  const handleAppInstalled = useCallback(() => {
    setShowInstall(false);
    deferredPrompt.current = null;
  }, []);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) {
      return;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled]);

  const handleInstall = () => {
    if (deferredPrompt.current) {
      void deferredPrompt.current.prompt();
    }
    setShowInstall(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShowInstall(false);
  };

  if (!showInstall) {
    return null;
  }

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      message="Install LegalCode for quick access"
      action={
        <>
          <Button size="small" onClick={handleInstall} sx={{ color: '#8027FF', fontWeight: 600 }}>
            Install
          </Button>
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    />
  );
};
