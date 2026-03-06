import { useState } from 'react';
import { NavLink } from 'react-router';
import { Box, Avatar, Typography, Menu, MenuItem } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import type { Role } from '@legalcode/shared';

interface LeftNavUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface LeftNavProps {
  user: LeftNavUser;
  onLogout: () => void;
}

const NAV_WIDTH = 240;
const HEADER_HEIGHT = 64;
const BG_PRIMARY = '#451F61';
const ACCENT = '#8027FF';
const HOVER_BG = '#361850';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItemConfig[] = [
  { to: '/templates', label: 'Templates', icon: <DescriptionIcon sx={{ fontSize: 20 }} /> },
  { to: '/admin', label: 'Admin', icon: <AdminPanelSettingsIcon sx={{ fontSize: 20 }} /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon sx={{ fontSize: 20 }} /> },
];

export function LeftNav({ user, onLogout }: LeftNavProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  const canCreateTemplate = user.role === 'admin' || user.role === 'editor';

  return (
    <Box
      component="nav"
      data-testid="left-nav"
      sx={{
        width: NAV_WIDTH,
        height: '100vh',
        bgcolor: BG_PRIMARY,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Acasus
        </Typography>
      </Box>

      {/* New Template button */}
      {canCreateTemplate && (
        <Box sx={{ px: 2, mb: 2 }}>
          <NavLink
            to="/templates/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 16px',
              backgroundColor: ACCENT,
              color: '#fff',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
            New Template
          </NavLink>
        </Box>
      )}

      {/* Navigation items */}
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, flex: 1 }}>
        {navItems.map((item) => (
          <Box component="li" key={item.to} sx={{ m: 0, p: 0 }}>
            <NavLink
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'background-color 0.15s',
              })}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          </Box>
        ))}
      </Box>

      {/* Footer - User info */}
      <Box
        component="button"
        onClick={handleMenuOpen}
        aria-label="user menu"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          border: 'none',
          bgcolor: 'transparent',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          '&:hover': {
            bgcolor: HOVER_BG,
          },
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: ACCENT,
            border: '2px solid #fff',
            fontSize: '0.875rem',
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontWeight: 500,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(200, 170, 230, 0.9)',
              lineHeight: 1.2,
            }}
          >
            {user.role}
          </Typography>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={handleLogout}>Log Out</MenuItem>
      </Menu>
    </Box>
  );
}
