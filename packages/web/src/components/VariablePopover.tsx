import { useState, useEffect, useRef } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Select,
  InputAdornment,
  Divider,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import type { VariableDefinition, VariableType } from '@legalcode/shared';
import {
  TYPE_ICONS,
  VARIABLE_COLORS,
  TYPE_LABELS,
  ALL_VARIABLE_TYPES,
} from '../constants/variables.js';
import { NewVariableDialog } from './NewVariableDialog.js';

// ---------------------------------------------------------------------------
// KebabMenuItems — separate component for the kebab context menu.
// Handlers receive no ID parameter; they read the active ID from a ref
// in the parent to handle the case where MUI fires Menu.onClose before
// MenuItem.onClick.
// ---------------------------------------------------------------------------

interface KebabMenuItemsProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onRename: () => void;
  onChangeType: () => void;
  onDelete: () => void;
}

function KebabMenuItems({
  anchorEl,
  open,
  onClose,
  onRename,
  onChangeType,
  onDelete,
}: KebabMenuItemsProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            border: '1px solid #E5E6F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            minWidth: 140,
          },
        },
      }}
    >
      <MenuItem
        onClick={onRename}
        sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.875rem' }}
      >
        Rename
      </MenuItem>
      <MenuItem
        onClick={onChangeType}
        sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.875rem' }}
      >
        Change Type
      </MenuItem>
      <Divider />
      <MenuItem
        onClick={onDelete}
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.875rem',
          color: '#DC2626',
        }}
      >
        Delete
      </MenuItem>
    </Menu>
  );
}

export interface VariablePopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  variables: VariableDefinition[];
  onInsertVariable: (variableId: string) => void;
  onRenameVariable: (id: string, newName: string) => void;
  onRetypeVariable: (id: string, newType: VariableType, customType?: string) => void;
  onDeleteVariable: (id: string) => void;
  onAddVariable: (name: string, type: VariableType, customType?: string) => void;
  getUsageCount: (variableId: string) => number;
}

interface KebabMenuState {
  anchorEl: HTMLElement | null;
  variableId: string | null;
}

interface InlineEditState {
  variableId: string | null;
  value: string;
}

interface InlineRetypeState {
  variableId: string | null;
}

export function VariablePopover({
  anchorEl,
  open,
  onClose,
  variables,
  onInsertVariable,
  onRenameVariable,
  onRetypeVariable,
  onDeleteVariable,
  onAddVariable,
  getUsageCount,
}: VariablePopoverProps) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kebabMenu, setKebabMenu] = useState<KebabMenuState>({ anchorEl: null, variableId: null });
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>({ variableId: null, value: '' });
  const [inlineRetype, setInlineRetype] = useState<InlineRetypeState>({ variableId: null });
  // Stable ref for the kebab variableId — survives state resets caused by
  // MUI firing Menu.onClose before MenuItem.onClick in some environments.
  const activeKebabId = useRef<string | null>(null);

  // Reset search when popover closes/opens
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const filtered =
    search.trim() === ''
      ? variables
      : variables.filter((v) => v.name.toLowerCase().includes(search.trim().toLowerCase()));

  // Kebab menu handlers
  const handleKebabOpen = (event: React.MouseEvent<HTMLElement>, variableId: string) => {
    event.stopPropagation();
    activeKebabId.current = variableId;
    setKebabMenu({ anchorEl: event.currentTarget, variableId });
  };

  const handleKebabClose = () => {
    // Do NOT clear activeKebabId here. MUI fires Menu.onClose (this handler)
    // before the MenuItem onClick in some environments. Action handlers read
    // the ref and clear it themselves.
    setKebabMenu({ anchorEl: null, variableId: null });
  };

  const handleRenameStart = () => {
    const varId = activeKebabId.current;
    activeKebabId.current = null;
    /* v8 ignore next -- defensive guard; activeKebabId always set by handleKebabOpen before menu item click */
    if (!varId) return;
    const variable = variables.find((v) => v.id === varId);
    /* v8 ignore next -- defensive fallback; variable always found since kebab is only shown for existing variables */
    setInlineEdit({ variableId: varId, value: variable?.name ?? '' });
    setKebabMenu({ anchorEl: null, variableId: null });
  };

  const handleRenameCommit = (variableId: string) => {
    const trimmed = inlineEdit.value.trim();
    if (trimmed) {
      onRenameVariable(variableId, trimmed);
    }
    setInlineEdit({ variableId: null, value: '' });
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, variableId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameCommit(variableId);
    } else if (e.key === 'Escape') {
      setInlineEdit({ variableId: null, value: '' });
    }
  };

  const handleChangeTypeStart = () => {
    const varId = activeKebabId.current;
    activeKebabId.current = null;
    /* v8 ignore next -- defensive guard; activeKebabId always set by handleKebabOpen before menu item click */
    if (!varId) return;
    setInlineRetype({ variableId: varId });
    setKebabMenu({ anchorEl: null, variableId: null });
  };

  const handleRetypeChange = (e: SelectChangeEvent<VariableType>, variableId: string) => {
    const newType = e.target.value as VariableType;
    onRetypeVariable(variableId, newType, undefined);
    setInlineRetype({ variableId: null });
  };

  const handleDeleteClick = () => {
    const varId = activeKebabId.current;
    activeKebabId.current = null;
    /* v8 ignore next -- defensive guard; activeKebabId always set by handleKebabOpen before menu item click */
    if (!varId) return;
    onDeleteVariable(varId);
    setKebabMenu({ anchorEl: null, variableId: null });
  };

  const handleAddVariable = (name: string, type: VariableType, customType?: string) => {
    onAddVariable(name, type, customType);
    setDialogOpen(false);
  };

  const hasVariables = variables.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: '320px',
              borderRadius: '12px',
              border: '1px solid #E5E6F0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            pt: 2,
            pb: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", serif',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#12111A',
            }}
          >
            Variables
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="close" sx={{ color: '#6B6D82' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Search bar */}
        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search variables..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search variables' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: '#9B9DB0' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: '#F3F3F7',
                '& fieldset': { border: 'none' },
                '&.Mui-focused fieldset': {
                  border: '1px solid #8027FF',
                  boxShadow: '0 0 0 2px rgba(128,39,255,0.12)',
                },
              },
              '& .MuiInputBase-input': {
                fontSize: '0.8125rem',
                py: '6px',
              },
            }}
          />
        </Box>

        <Divider />

        {/* Variable list */}
        <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
          {!hasVariables ? (
            /* Empty state */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                px: 2,
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#12111A',
                  textAlign: 'center',
                }}
              >
                No variables yet. Create one to get started.
              </Typography>
            </Box>
          ) : !hasResults ? (
            /* No search results */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 3,
                px: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  color: '#6B6D82',
                  textAlign: 'center',
                }}
              >
                No matching variables
              </Typography>
            </Box>
          ) : (
            <List disablePadding component="ul">
              {filtered.map((variable) => {
                const colors = VARIABLE_COLORS[variable.type];
                const usageCount = getUsageCount(variable.id);
                const isRenaming = inlineEdit.variableId === variable.id;
                const isRetyping = inlineRetype.variableId === variable.id;

                return (
                  <li key={variable.id} role="listitem">
                    <ListItemButton
                      onClick={() => {
                        if (!isRenaming && !isRetyping) {
                          onInsertVariable(variable.id);
                        }
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        '&:hover': { backgroundColor: '#F9F9FB' },
                      }}
                      component="div"
                    >
                      {/* Type icon */}
                      {!isRetyping && (
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '5px',
                            backgroundColor: colors.color,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {TYPE_ICONS[variable.type]}
                        </Box>
                      )}

                      {/* Inline retype select */}
                      {isRetyping && (
                        <Select
                          value={variable.type}
                          size="small"
                          onChange={(e) => {
                            handleRetypeChange(e as SelectChangeEvent<VariableType>, variable.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          sx={{ minWidth: 100, fontSize: '0.8125rem' }}
                        >
                          {ALL_VARIABLE_TYPES.map((vt) => (
                            <MenuItem key={vt} value={vt}>
                              {TYPE_LABELS[vt]}
                            </MenuItem>
                          ))}
                        </Select>
                      )}

                      {/* Name or rename input */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {isRenaming ? (
                          <TextField
                            size="small"
                            value={inlineEdit.value}
                            onChange={(e) => {
                              setInlineEdit((prev) => ({ ...prev, value: e.target.value }));
                            }}
                            onKeyDown={(e) => {
                              handleRenameKeyDown(e, variable.id);
                            }}
                            onBlur={() => {
                              handleRenameCommit(variable.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              '& .MuiInputBase-input': { fontSize: '0.8125rem', py: '2px' },
                            }}
                          />
                        ) : (
                          <Typography
                            sx={{
                              fontFamily: '"DM Sans", sans-serif',
                              fontSize: '0.875rem',
                              color: '#12111A',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {variable.name}
                          </Typography>
                        )}
                      </Box>

                      {/* Usage count */}
                      {!isRenaming && !isRetyping && (
                        <Typography
                          sx={{
                            fontFamily: '"DM Sans", sans-serif',
                            fontSize: '0.75rem',
                            color: '#9B9DB0',
                            flexShrink: 0,
                          }}
                        >
                          {usageCount}
                        </Typography>
                      )}

                      {/* Kebab menu button */}
                      {!isRenaming && !isRetyping && (
                        <IconButton
                          size="small"
                          aria-label="more options"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleKebabOpen(e, variable.id);
                          }}
                          sx={{ color: '#9B9DB0', flexShrink: 0 }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItemButton>
                  </li>
                );
              })}
            </List>
          )}
        </Box>

        <Divider />

        {/* New variable button */}
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => {
              setDialogOpen(true);
            }}
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              color: '#8027FF',
              justifyContent: 'flex-start',
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { backgroundColor: 'rgba(128,39,255,0.06)' },
            }}
          >
            + New variable
          </Button>
        </Box>
      </Popover>

      {/* Kebab context menu — handlers read activeKebabId ref to get the
          variable ID, ensuring correctness even when MUI fires Menu.onClose
          before MenuItem.onClick. */}
      <KebabMenuItems
        anchorEl={kebabMenu.anchorEl}
        open={Boolean(kebabMenu.anchorEl)}
        onClose={handleKebabClose}
        onRename={handleRenameStart}
        onChangeType={handleChangeTypeStart}
        onDelete={handleDeleteClick}
      />

      {/* New Variable Dialog */}
      <NewVariableDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
        }}
        onCreateVariable={handleAddVariable}
      />
    </>
  );
}
