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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Version</DialogTitle>
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
          sx={{ mt: 1 }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
