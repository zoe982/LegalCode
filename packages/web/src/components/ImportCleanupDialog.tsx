import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Checkbox,
  Chip,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import type { DetectedConversion } from '../editor/importCleanup.js';

export interface ImportCleanupDialogProps {
  open: boolean;
  onClose: () => void;
  conversions: DetectedConversion[];
  onApply: (selected: DetectedConversion[]) => void;
}

const TRUNCATE_LENGTH = 60;

function truncate(text: string): string {
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.slice(0, TRUNCATE_LENGTH) + '…';
}

function confidenceColor(
  confidence: DetectedConversion['confidence'],
): 'success' | 'warning' | 'default' {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'warning';
  return 'default';
}

export function ImportCleanupDialog({
  open,
  onClose,
  conversions,
  onApply,
}: ImportCleanupDialogProps) {
  // Local state for checkbox selection — initialised from prop `selected` field
  const [selections, setSelections] = useState<boolean[]>(() => conversions.map((c) => c.selected));

  // Reset selections whenever the dialog opens or conversions change
  useEffect(() => {
    setSelections(conversions.map((c) => c.selected));
  }, [conversions, open]);

  const selectedCount = selections.filter(Boolean).length;
  const totalCount = conversions.length;

  const handleToggle = (index: number) => {
    setSelections((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSelectAll = () => {
    setSelections(conversions.map(() => true));
  };

  const handleDeselectAll = () => {
    setSelections(conversions.map(() => false));
  };

  const handleApply = () => {
    const selected = conversions
      /* v8 ignore next -- selections always in sync with conversions; ?? false is a noUncheckedIndexedAccess guard */
      .map((conv, i) => ({ ...conv, selected: selections[i] ?? false }))
      .filter((c) => c.selected);
    onApply(selected);
  };

  const subtitleText =
    totalCount === 1 ? '1 item detected' : `${String(totalCount)} items detected`;

  const applyLabel = `Apply ${String(selectedCount)} conversion${selectedCount === 1 ? '' : 's'}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="import-cleanup-title"
      slotProps={{
        paper: {
          sx: {
            maxWidth: 520,
            minWidth: 400,
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
      <DialogTitle
        id="import-cleanup-title"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary, #12111A)',
          pb: 0,
        }}
      >
        Import Cleanup
        <Typography
          component="p"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary, #6B6D82)',
            mt: 0.5,
            fontWeight: 400,
          }}
        >
          {subtitleText}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 0 }}>
        {/* Select All / Deselect All */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 1,
            borderBottom: '1px solid var(--border-primary, #E8E8EC)',
            pb: 1,
          }}
        >
          <Button
            size="small"
            onClick={handleSelectAll}
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              textTransform: 'none',
              color: 'var(--text-secondary, #6B6D82)',
              minWidth: 0,
              px: 1,
            }}
          >
            Select All
          </Button>
          <Button
            size="small"
            onClick={handleDeselectAll}
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              textTransform: 'none',
              color: 'var(--text-secondary, #6B6D82)',
              minWidth: 0,
              px: 1,
            }}
          >
            Deselect All
          </Button>
        </Box>

        {/* Conversion list */}
        <List dense disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {conversions.map((conv, index) => (
            <ListItem
              key={conv.pos}
              disablePadding
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                px: 0,
                '&:hover': {
                  backgroundColor: 'var(--surface-secondary, #F9F9FB)',
                  borderRadius: '6px',
                },
              }}
            >
              <Checkbox
                /* v8 ignore next -- selections always in sync with conversions; ?? false is a noUncheckedIndexedAccess guard */
                checked={selections[index] ?? false}
                onChange={() => {
                  handleToggle(index);
                }}
                size="small"
                sx={{ p: 0.5 }}
              />

              {/* Original text */}
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary, #12111A)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={conv.originalText}
              >
                {truncate(conv.originalText)}
              </Typography>

              {/* Arrow */}
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary, #9B9DB0)',
                  flexShrink: 0,
                }}
              >
                →
              </Typography>

              {/* Heading level badge */}
              <Box
                sx={{
                  backgroundColor: 'var(--surface-tertiary, #F3F3F7)',
                  color: 'var(--text-secondary, #6B6D82)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  px: 0.75,
                  py: 0.25,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}
              >
                {`H${String(conv.headingLevel)}`}
              </Box>

              {/* Confidence chip */}
              <Chip
                label={conv.confidence}
                color={confidenceColor(conv.confidence)}
                size="small"
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.6875rem',
                  height: 20,
                  flexShrink: 0,
                  '& .MuiChip-label': {
                    px: 0.75,
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            color: 'var(--text-secondary, #6B6D82)',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          disabled={selectedCount === 0}
          variant="contained"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '10px',
            backgroundColor: '#8027FF',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#6B1FD9',
            },
            '&.Mui-disabled': {
              backgroundColor: '#8027FF',
              color: '#FFFFFF',
              opacity: 0.4,
            },
          }}
        >
          {applyLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
