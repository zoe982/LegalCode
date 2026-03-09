import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  IconButton,
  Select,
  MenuItem,
  Button,
  Popover,
  Typography,
  Tooltip,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { useNavigate } from 'react-router';
import { StatusChip } from './StatusChip.js';
import { useCategories } from '../hooks/useCategories.js';
import { useCountries } from '../hooks/useCountries.js';
import type { TemplateStatus } from '@legalcode/shared';
import type { SelectChangeEvent } from '@mui/material/Select';

export interface DocumentHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  country: string;
  onCountryChange: (country: string) => void;
  status?: TemplateStatus | undefined;
  editorMode: 'source' | 'review';
  onModeChange: (mode: 'source' | 'review') => void;
  onPublish?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
  onUnarchive?: (() => void) | undefined;
  templateId?: string | undefined;
  isCreateMode: boolean;
  readOnly: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  createdBy?: string | undefined;
  currentVersion?: number | undefined;
  rightSlot?: ReactNode | undefined;
}

const compactIconButtonStyle = {
  width: '32px',
  height: '32px',
  color: 'var(--text-secondary)',
  borderRadius: '6px',
  '&:hover': {
    backgroundColor: 'var(--surface-tertiary)',
    color: 'var(--text-primary)',
  },
} as const;

const compactSelectStyle = {
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  minWidth: 100,
  maxWidth: 160,
  height: '28px',
  '& .MuiSelect-select': {
    padding: '4px 8px',
    paddingRight: '28px !important',
  },
  '& .MuiInput-underline:before, & .MuiInput-underline:after': {
    display: 'none',
  },
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  '&:hover': {
    borderColor: 'var(--border-hover)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '16px',
    color: 'var(--text-tertiary)',
  },
} as const;

const modeSegmentStyle = {
  border: 'none',
  cursor: 'pointer',
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.8125rem',
  padding: '4px 12px',
  borderRadius: '6px',
  backgroundColor: 'transparent',
  position: 'relative' as const,
  zIndex: 1,
} as const;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays < 7) return `${String(diffDays)}d ago`;
  return formatDate(dateString);
}

export function DocumentHeader({
  title,
  onTitleChange,
  category,
  onCategoryChange,
  country,
  onCountryChange,
  status,
  editorMode,
  onModeChange,
  onPublish,
  onArchive,
  onUnarchive,
  templateId,
  isCreateMode,
  readOnly,
  createdAt,
  updatedAt,
  createdBy,
  currentVersion,
  rightSlot,
}: DocumentHeaderProps) {
  const navigate = useNavigate();
  const categoriesQuery = useCategories();
  const countriesQuery = useCountries();

  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLButtonElement | null>(null);
  const moreOpen = Boolean(moreAnchorEl);

  const handleBack = useCallback(() => {
    void navigate('/templates');
  }, [navigate]);

  const handleMoreOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setMoreAnchorEl(event.currentTarget);
  }, []);

  const handleMoreClose = useCallback(() => {
    setMoreAnchorEl(null);
  }, []);

  const handleHistoryClick = useCallback(() => {
    if (templateId) {
      void navigate(`/templates/${templateId}/history`);
    }
  }, [navigate, templateId]);

  const handleCategoryChange = useCallback(
    (event: SelectChangeEvent) => {
      onCategoryChange(event.target.value);
    },
    [onCategoryChange],
  );

  const handleCountryChange = useCallback(
    (event: SelectChangeEvent) => {
      onCountryChange(event.target.value);
    },
    [onCountryChange],
  );

  const categories = categoriesQuery.data?.categories ?? [];
  const countries = countriesQuery.data?.countries ?? [];

  return (
    <Box
      data-testid="document-header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: 1,
        minWidth: 0,
      }}
    >
      {/* Back button */}
      <Tooltip title="Back to templates" enterDelay={400}>
        <IconButton
          aria-label="Back to templates"
          onClick={handleBack}
          sx={{ ...compactIconButtonStyle, mr: '8px' }}
        >
          <ArrowBackRounded sx={{ fontSize: '20px' }} />
        </IconButton>
      </Tooltip>

      {/* Title input */}
      <Box
        component="input"
        type="text"
        aria-label="Template title"
        placeholder="Untitled"
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onTitleChange(e.target.value);
        }}
        readOnly={readOnly}
        sx={{
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          borderBottom: '1px solid transparent',
          transition: 'border-color 0.2s ease',
          '&:hover': {
            borderBottom: '1px solid var(--border-primary)',
          },
          '&:focus': {
            borderBottom: '1px solid var(--accent-primary)',
          },
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          minWidth: '120px',
          maxWidth: '300px',
          padding: '4px 0',
          mr: '12px',
          textOverflow: 'ellipsis',
          '&::placeholder': {
            color: 'var(--text-tertiary)',
          },
        }}
      />

      {/* Category select */}
      <Select
        value={category}
        onChange={handleCategoryChange}
        displayEmpty
        variant="standard"
        disableUnderline
        size="small"
        aria-label="Template category"
        disabled={readOnly}
        IconComponent={ExpandMoreRounded}
        renderValue={(value: string) =>
          value || (
            <Typography
              component="span"
              sx={{
                color: 'var(--text-tertiary)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.8125rem',
              }}
            >
              Category
            </Typography>
          )
        }
        sx={{ ...compactSelectStyle, mr: '8px' }}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: '10px',
                boxShadow: 'var(--shadow-md)',
              },
            },
          },
        }}
      >
        {categories.map((cat) => (
          <MenuItem key={cat.id} value={cat.name} sx={{ height: '36px', fontSize: '0.875rem' }}>
            {cat.name}
          </MenuItem>
        ))}
      </Select>

      {/* Country select */}
      <Select
        value={country}
        onChange={handleCountryChange}
        displayEmpty
        variant="standard"
        disableUnderline
        size="small"
        aria-label="Template country"
        disabled={readOnly}
        IconComponent={ExpandMoreRounded}
        renderValue={(value: string) => {
          if (!value) {
            return (
              <Typography
                component="span"
                sx={{
                  color: 'var(--text-tertiary)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.8125rem',
                }}
              >
                Country
              </Typography>
            );
          }
          const match = countries.find((c) => c.code === value);
          return match?.name ?? value;
        }}
        sx={{ ...compactSelectStyle, mr: '12px' }}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: '10px',
                boxShadow: 'var(--shadow-md)',
              },
            },
          },
        }}
      >
        {countries.map((co) => (
          <MenuItem key={co.id} value={co.code} sx={{ height: '36px', fontSize: '0.875rem' }}>
            {co.name}
          </MenuItem>
        ))}
      </Select>

      {/* Status chip */}
      {!isCreateMode && status != null && (
        <Box sx={{ mr: '12px' }}>
          <StatusChip status={status} />
        </Box>
      )}

      {/* Mode toggle */}
      {!isCreateMode && (
        <Box
          role="radiogroup"
          aria-label="Editor mode"
          sx={{
            backgroundColor: 'var(--surface-tertiary)',
            borderRadius: '8px',
            padding: '2px',
            display: 'inline-flex',
            position: 'relative',
            border: '1px solid var(--border-primary)',
            ml: '12px',
            mr: '8px',
          }}
        >
          {/* Sliding pill indicator */}
          <Box
            data-testid="mode-toggle-indicator"
            sx={{
              position: 'absolute',
              top: '2px',
              bottom: '2px',
              width: '50%',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-xs)',
              transition: 'transform cubic-bezier(0.2, 0, 0, 1) 200ms',
            }}
            style={{
              transform: editorMode === 'source' ? 'translateX(0)' : 'translateX(100%)',
            }}
          />
          <Box
            component="button"
            role="radio"
            aria-checked={editorMode === 'source'}
            aria-label="Source"
            onClick={() => {
              onModeChange('source');
            }}
            sx={{
              ...modeSegmentStyle,
              color: editorMode === 'source' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: editorMode === 'source' ? 600 : 500,
            }}
          >
            Source
          </Box>
          <Box
            component="button"
            role="radio"
            aria-checked={editorMode === 'review'}
            aria-label="Review"
            onClick={() => {
              onModeChange('review');
            }}
            sx={{
              ...modeSegmentStyle,
              color: editorMode === 'review' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: editorMode === 'review' ? 600 : 500,
            }}
          >
            Review
          </Box>
        </Box>
      )}

      {/* More button — not in create mode */}
      {!isCreateMode && (
        <Tooltip title="Template details" enterDelay={400}>
          <IconButton
            aria-label="Template details"
            aria-haspopup="true"
            aria-expanded={moreOpen}
            onClick={handleMoreOpen}
            sx={compactIconButtonStyle}
          >
            <MoreHorizRounded sx={{ fontSize: '20px' }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Metadata Popover */}
      <Popover
        open={moreOpen}
        anchorEl={moreAnchorEl}
        onClose={handleMoreClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              padding: '20px',
              zIndex: 50,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {createdAt != null && (
            <Box>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                Created
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                {formatDate(createdAt)}
              </Typography>
              {createdBy != null && (
                <Typography
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    mt: '2px',
                  }}
                >
                  by {createdBy}
                </Typography>
              )}
            </Box>
          )}

          {updatedAt != null && (
            <Box>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                Modified
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                {formatRelativeTime(updatedAt)}
              </Typography>
            </Box>
          )}

          {currentVersion != null && (
            <Box>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                Version
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                v{String(currentVersion)}
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Spacer to push action buttons right */}
      <Box sx={{ flex: 1 }} />

      {/* Right slot (connection status, presence avatars, export) */}
      {rightSlot != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>{rightSlot}</Box>
      )}

      {/* Action buttons */}
      {!readOnly && !isCreateMode && status === 'draft' && onPublish != null && (
        <Button
          aria-label="Publish template"
          onClick={onPublish}
          variant="contained"
          size="small"
          sx={{
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--text-on-purple)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
            mr: '8px',
            '&:hover': {
              backgroundColor: 'var(--accent-primary-hover)',
            },
          }}
        >
          Publish
        </Button>
      )}

      {!readOnly && !isCreateMode && status === 'active' && onArchive != null && (
        <Button
          aria-label="Archive template"
          onClick={onArchive}
          variant="outlined"
          size="small"
          sx={{
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
            mr: '8px',
            '&:hover': {
              backgroundColor: 'var(--surface-tertiary)',
              borderColor: 'var(--border-hover)',
            },
          }}
        >
          Archive
        </Button>
      )}

      {!readOnly && !isCreateMode && status === 'archived' && onUnarchive != null && (
        <Button
          aria-label="Unarchive template"
          onClick={onUnarchive}
          variant="outlined"
          size="small"
          sx={{
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
            mr: '8px',
            '&:hover': {
              backgroundColor: 'var(--surface-tertiary)',
              borderColor: 'var(--border-hover)',
            },
          }}
        >
          Unarchive
        </Button>
      )}

      {/* History button — not in create mode */}
      {!isCreateMode && templateId != null && (
        <Tooltip title="Version history" enterDelay={400}>
          <IconButton
            aria-label="Version history"
            onClick={handleHistoryClick}
            sx={{ ...compactIconButtonStyle, mr: '8px' }}
          >
            <ScheduleRounded sx={{ fontSize: '20px' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
