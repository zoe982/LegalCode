import { useState } from 'react';
import { NavLink } from 'react-router';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import type { Role } from '@legalcode/shared';

interface AvatarDropdownUser {
  name: string;
  email: string;
  role: Role;
}

interface AvatarDropdownMenuProps {
  user: AvatarDropdownUser;
  onLogout: () => void;
}

export function AvatarDropdownMenu({ user, onLogout }: AvatarDropdownMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const displayName = user.name || user.email;
  const initial = displayName.charAt(0).toUpperCase();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="user menu" size="small" sx={{ p: 0 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'var(--accent-primary)',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {initial}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 240,
              bgcolor: 'var(--surface-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              mt: 0.5,
            },
          },
        }}
      >
        {/* User info section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <MenuItem
          component={NavLink}
          to="/admin"
          onClick={handleClose}
          sx={{
            fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
            fontSize: '0.875rem',
            color: 'var(--text-body)',
            '&:hover': { bgcolor: 'var(--surface-tertiary)' },
          }}
        >
          Admin
        </MenuItem>

        <MenuItem
          component={NavLink}
          to="/settings"
          onClick={handleClose}
          sx={{
            fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
            fontSize: '0.875rem',
            color: 'var(--text-body)',
            '&:hover': { bgcolor: 'var(--surface-tertiary)' },
          }}
        >
          Settings
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{
            fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
            fontSize: '0.875rem',
            color: 'var(--destructive)',
            '&:hover': { bgcolor: 'var(--surface-tertiary)' },
          }}
        >
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
