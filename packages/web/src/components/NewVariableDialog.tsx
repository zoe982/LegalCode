import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Box,
  FormControl,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { VariableType } from '@legalcode/shared';
import {
  TYPE_ICONS,
  TYPE_LABELS,
  VARIABLE_COLORS,
  ALL_VARIABLE_TYPES,
} from '../constants/variables.js';

export interface NewVariableDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateVariable: (name: string, type: VariableType, customType?: string) => void;
}

export function NewVariableDialog({ open, onClose, onCreateVariable }: NewVariableDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<VariableType>('text');
  const [customType, setCustomType] = useState('');

  const resetForm = () => {
    setName('');
    setType('text');
    setCustomType('');
  };

  const handleCreate = () => {
    /* v8 ignore next -- defensive guard; Create button is disabled when name is empty */
    if (!name.trim()) return;
    onCreateVariable(name.trim(), type, type === 'custom' ? customType || undefined : undefined);
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleTypeChange = (e: SelectChangeEvent<VariableType>) => {
    setType(e.target.value as VariableType);
  };

  const isNameEmpty = name.trim() === '';

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      transitionDuration={{ enter: 200, exit: 150 }}
      slotProps={{
        paper: {
          sx: {
            width: '360px',
            maxWidth: '100%',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#12111A',
          pb: 1,
        }}
        component="h2"
      >
        New Variable
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}
      >
        {/* Name field */}
        <TextField
          label="Name"
          autoFocus
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="e.g. Party Name"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              '& fieldset': { borderColor: '#D1D2DE' },
              '&.Mui-focused fieldset': {
                borderColor: '#8027FF',
                boxShadow: '0 0 0 3px rgba(128,39,255,0.15)',
              },
            },
          }}
        />

        {/* Type select */}
        <FormControl fullWidth>
          <InputLabel id="new-var-type-label">Type</InputLabel>
          <Select
            labelId="new-var-type-label"
            label="Type"
            value={type}
            onChange={handleTypeChange}
            input={
              <OutlinedInput
                label="Type"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D2DE' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#8027FF',
                    boxShadow: '0 0 0 3px rgba(128,39,255,0.15)',
                  },
                }}
              />
            }
            renderValue={(selected) => {
              const colors = VARIABLE_COLORS[selected];
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '3px',
                      backgroundColor: colors.color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_ICONS[selected]}
                  </Box>
                  {TYPE_LABELS[selected]}
                </Box>
              );
            }}
          >
            {ALL_VARIABLE_TYPES.map((vt) => {
              const colors = VARIABLE_COLORS[vt];
              return (
                <MenuItem key={vt} value={vt} aria-label={TYPE_LABELS[vt]}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '3px',
                        backgroundColor: colors.color,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {TYPE_ICONS[vt]}
                    </Box>
                    {TYPE_LABELS[vt]}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Custom type label — only shown when type is 'custom' */}
        {type === 'custom' && (
          <TextField
            label="Custom Type Label"
            fullWidth
            value={customType}
            onChange={(e) => {
              setCustomType(e.target.value);
            }}
            placeholder="e.g. Internal Reference"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& fieldset': { borderColor: '#D1D2DE' },
                '&.Mui-focused fieldset': {
                  borderColor: '#8027FF',
                  boxShadow: '0 0 0 3px rgba(128,39,255,0.15)',
                },
              },
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleCancel} sx={{ color: '#12111A' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={isNameEmpty}
          onClick={handleCreate}
          sx={{
            backgroundColor: '#8027FF',
            color: '#FFFFFF',
            borderRadius: '12px',
            '&:hover': { backgroundColor: '#6B1FDB' },
            '&.Mui-disabled': { opacity: 0.5 },
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
