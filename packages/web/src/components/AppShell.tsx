import { Outlet } from 'react-router';
import { Box } from '@mui/material';
import { LeftNav } from './LeftNav.js';
import { TopAppBar } from './TopAppBar.js';
import { useAuth } from '../hooks/useAuth.js';

export function AppShell() {
  const { user, logout } = useAuth();

  // user should always be present inside AppShell (behind AuthGuard)
  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Nav — full height */}
      <LeftNav user={user} onLogout={logout} />

      {/* Right side: app bar + workspace */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Top App Bar */}
        <TopAppBar title="LegalCode" />

        {/* Central Workspace */}
        <Box
          data-testid="workspace"
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#EFE3D3',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
