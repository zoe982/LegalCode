import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';

export interface DeleteTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateTitle: string;
  isDeleting: boolean;
  variant?: 'soft-delete' | 'permanent' | undefined;
}

export function DeleteTemplateDialog({
  open,
  onClose,
  onConfirm,
  templateTitle,
  isDeleting,
  variant,
}: DeleteTemplateDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resolvedVariant = variant ?? 'soft-delete';

  useEffect(() => {
    if (open) {
      // Focus cancel button on open
      const timer = setTimeout(() => {
        cancelRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [open]);

  const title =
    resolvedVariant === 'permanent'
      ? `Permanently delete ${templateTitle}?`
      : `Delete ${templateTitle}?`;

  const body =
    resolvedVariant === 'permanent'
      ? 'This action cannot be undone. The template and all its versions will be permanently removed.'
      : 'This template will be moved to trash and permanently deleted after 30 days. An admin can restore it before then.';

  const confirmLabel = resolvedVariant === 'permanent' ? 'Delete permanently' : 'Delete';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      aria-labelledby="delete-dialog-title"
      slotProps={{
        paper: {
          sx: {
            maxWidth: 400,
            minWidth: 360,
            borderRadius: '16px',
          },
        },
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
          },
        },
      }}
    >
      <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
        {/* Red circular icon */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <DeleteOutlineRounded sx={{ fontSize: 24, color: '#DC2626' }} />
        </Box>

        <Typography
          id="delete-dialog-title"
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#12111A',
            mb: 1,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            color: '#6B6D82',
            lineHeight: 1.6,
          }}
        >
          {body}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
        <Button
          ref={cancelRef}
          onClick={onClose}
          sx={{
            color: '#6B6D82',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDeleting}
          variant="contained"
          sx={{
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: '#B91C1C',
            },
            '&.Mui-disabled': {
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              opacity: 0.7,
            },
          }}
        >
          {isDeleting ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
