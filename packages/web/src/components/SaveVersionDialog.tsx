import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface SaveVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (changeSummary: string) => void;
  saving: boolean;
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  open,
  onClose,
  onSave,
  saving,
}) => {
  const [summary, setSummary] = useState('');

  const handleSave = () => {
    onSave(summary);
    setSummary('');
  };

  const handleClose = () => {
    setSummary('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      transitionDuration={{ enter: 200, exit: 150 }}
      slotProps={{
        paper: {
          sx: {
            maxWidth: '480px',
            borderRadius: '16px',
            backgroundColor: '#F7F0E6',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(239, 227, 211, 0.5)',
            backdropFilter: 'blur(8px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#451F61',
        }}
      >
        Create Version
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Change Summary"
          fullWidth
          multiline
          rows={3}
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
          }}
          sx={{
            mt: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              '& fieldset': {
                borderColor: '#D4C5B2',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: '12px 16px',
            },
          }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={saving}
          sx={{
            color: '#451F61',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{
            backgroundColor: '#8027FF',
            color: '#FFFFFF',
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: '#6B1FDB',
            },
          }}
        >
          {saving ? 'Creating...' : 'Create Version'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
