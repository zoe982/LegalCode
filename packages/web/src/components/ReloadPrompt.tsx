import { useRegisterSW } from 'virtual:pwa-register/react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (needRefresh) {
    return (
      <Snackbar
        open
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        message="A new version is available"
        action={
          <>
            <Button
              size="small"
              onClick={() => {
                void updateServiceWorker(true);
              }}
              sx={{ color: '#8027FF', fontWeight: 600 }}
            >
              Reload
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => {
                setNeedRefresh(false);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />
    );
  }

  if (offlineReady) {
    return (
      <Snackbar
        open
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        message="App ready for offline use"
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={() => {
              setOfflineReady(false);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    );
  }

  return null;
};
