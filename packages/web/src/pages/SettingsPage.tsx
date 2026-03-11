import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { usePreferences } from '../hooks/usePreferences.js';
import { useTopAppBarSetters } from '../contexts/TopAppBarContext.js';

/* v8 ignore start -- defensive fallbacks for strict index access */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    const char = email[0];
    return char ? char.toUpperCase() : '?';
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}
/* v8 ignore stop */

function formatMemberSince(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return 'Unknown';
  }
}

const roleChipProps: Record<
  string,
  {
    variant: 'filled' | 'outlined';
    sx: Record<string, unknown>;
  }
> = {
  admin: {
    variant: 'filled',
    sx: {
      backgroundColor: '#8027FF',
      color: '#FFFFFF',
      borderRadius: '9999px',
      fontFamily: '"DM Sans", sans-serif',
      fontSize: '0.6875rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      lineHeight: '1rem',
      px: '10px',
      py: '3px',
      height: 'auto',
    },
  },
  editor: {
    variant: 'outlined',
    sx: {
      backgroundColor: 'transparent',
      color: '#12111A',
      border: '1px solid #E4E5ED',
      borderRadius: '9999px',
      fontFamily: '"DM Sans", sans-serif',
      fontSize: '0.6875rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      lineHeight: '1rem',
      px: '10px',
      py: '3px',
      height: 'auto',
    },
  },
  viewer: {
    variant: 'outlined',
    sx: {
      backgroundColor: 'transparent',
      color: '#6B6D82',
      border: '1px solid #F3F3F7',
      borderRadius: '9999px',
      fontFamily: '"DM Sans", sans-serif',
      fontSize: '0.6875rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      lineHeight: '1rem',
      px: '10px',
      py: '3px',
      height: 'auto',
    },
  },
};

const defaultChipProps: { variant: 'filled' | 'outlined'; sx: Record<string, unknown> } = {
  variant: 'outlined',
  sx: {
    backgroundColor: 'transparent',
    color: '#6B6D82',
    border: '1px solid #F3F3F7',
    borderRadius: '9999px',
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    px: '10px',
    py: '3px',
    height: 'auto',
  },
};

function getRoleChipProps(role: string): {
  variant: 'filled' | 'outlined';
  sx: Record<string, unknown>;
} {
  return roleChipProps[role] ?? defaultChipProps;
}

export function SettingsPage() {
  const { user, isLoading, logout, isLoggingOut } = useAuth();
  const { editorMode, setEditorMode } = usePreferences();
  const { setConfig, clearConfig } = useTopAppBarSetters();

  useEffect(() => {
    setConfig({ breadcrumbPageName: 'Settings' });
    return () => {
      clearConfig();
    };
  }, [setConfig, clearConfig]);

  const handleToggle = (_event: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (value === 'edit' || value === 'review') {
      setEditorMode(value);
    }
  };

  const handleSignOut = () => {
    logout();
  };

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      {/* Page Title */}
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          lineHeight: '2rem',
          color: '#12111A',
          mb: 0,
        }}
      >
        Settings
      </Typography>

      {/* Profile Section */}
      <Box sx={{ mt: 4 }}>
        {isLoading ? (
          /* Loading state */
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box>
              <Skeleton variant="text" width={120} sx={{ fontSize: '1.125rem' }} />
              <Skeleton variant="text" width={160} sx={{ fontSize: '0.875rem' }} />
              <Skeleton variant="text" width={200} sx={{ fontSize: '0.75rem' }} />
            </Box>
          </Box>
        ) : user ? (
          <>
            {/* Profile header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar
                aria-hidden="true"
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: '#8027FF',
                  color: '#FFFFFF',
                  fontFamily: '"DM Sans", sans-serif',
                  fontWeight: 600,
                  fontSize: '1.5rem',
                }}
              >
                {getInitials(user.name, user.email)}
              </Avatar>
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    lineHeight: '1.5rem',
                    color: '#12111A',
                  }}
                >
                  {user.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    lineHeight: '1.5rem',
                    color: '#6B6D82',
                    mt: 0.5,
                  }}
                >
                  {user.email}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                  <Chip
                    label={user.role.toUpperCase()}
                    role="status"
                    variant={getRoleChipProps(user.role).variant}
                    sx={getRoleChipProps(user.role).sx}
                  />
                  <Chip
                    label="Connected via Google"
                    variant="outlined"
                    avatar={
                      <Box
                        component="span"
                        sx={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: '#4285F4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        G
                      </Box>
                    }
                    sx={{
                      backgroundColor: '#F9F9FB',
                      border: '1px solid #E4E5ED',
                      borderRadius: '9999px',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      lineHeight: '1rem',
                      color: '#6B6D82',
                      height: 'auto',
                      py: '3px',
                      '& .MuiChip-avatar': {
                        width: 16,
                        height: 16,
                        margin: 0,
                        marginLeft: '4px',
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Member since row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5 }}>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  lineHeight: '1rem',
                  color: '#6B6D82',
                }}
              >
                Member since
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  lineHeight: '1.5rem',
                  color: '#12111A',
                }}
              >
                {formatMemberSince(user.createdAt)}
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Editor Preferences Section */}
      <Box>
        <Typography
          variant="subtitle2"
          component="h2"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: '1.25rem',
            color: '#12111A',
            mb: 2.5,
          }}
        >
          Editor Preferences
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                lineHeight: '1.5rem',
                color: '#12111A',
              }}
            >
              Default editor mode
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 400,
                lineHeight: '1rem',
                color: '#6B6D82',
                mt: 0.25,
              }}
            >
              Choose your preferred editing mode
            </Typography>
          </Box>

          <ToggleButtonGroup
            exclusive
            value={editorMode}
            onChange={handleToggle}
            aria-label="Default editor mode"
            sx={{
              backgroundColor: '#F3F3F7',
              border: '1px solid #E4E5ED',
              borderRadius: '8px',
              p: '3px',
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                borderRadius: '6px !important',
                px: 2,
                py: '6px',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.8125rem',
                lineHeight: '1.125rem',
                textTransform: 'none',
                transition: 'all 200ms ease',
                '&.Mui-selected': {
                  backgroundColor: '#FFFFFF',
                  color: '#12111A',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                  },
                },
                '&:not(.Mui-selected)': {
                  backgroundColor: 'transparent',
                  color: '#6B6D82',
                  fontWeight: 500,
                  '&:hover': {
                    color: '#12111A',
                  },
                },
              },
            }}
          >
            <ToggleButton value="edit">Edit</ToggleButton>
            <ToggleButton value="review">Review</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Account Section */}
      <Box>
        <Typography
          variant="subtitle2"
          component="h2"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: '1.25rem',
            color: '#12111A',
            mb: 2.5,
          }}
        >
          Account
        </Typography>

        <Button
          variant="outlined"
          onClick={handleSignOut}
          disabled={isLoggingOut}
          aria-label="Sign out of LegalCode"
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 600,
            lineHeight: '1.125rem',
            textTransform: 'none',
            color: '#DC2626',
            borderColor: 'rgba(220, 38, 38, 0.4)',
            borderRadius: '8px',
            height: 36,
            '&:hover': {
              backgroundColor: '#FEE2E2',
              borderColor: '#DC2626',
              color: '#DC2626',
            },
            '&:active': {
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
            },
            '&:focus-visible': {
              boxShadow: '0 0 0 3px #8027FF33',
            },
            '&.Mui-disabled': {
              color: '#DC2626',
              borderColor: 'rgba(220, 38, 38, 0.4)',
              opacity: 0.7,
            },
          }}
        >
          {isLoggingOut ? <CircularProgress size={16} color="inherit" /> : 'Sign out'}
        </Button>
      </Box>
    </Box>
  );
}
