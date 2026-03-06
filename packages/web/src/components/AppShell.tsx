import { Outlet, useLocation } from 'react-router';
import { Box } from '@mui/material';
import { LeftNav } from './LeftNav.js';
import { TopAppBar } from './TopAppBar.js';
import { ResponsiveGuard } from './ResponsiveGuard.js';
import { PageTransition } from './PageTransition.js';
import { useAuth } from '../hooks/useAuth.js';
import { TopAppBarProvider, useTopAppBarConfig } from '../contexts/TopAppBarContext.js';

function AppShellInner() {
  const { user, logout } = useAuth();
  const { config } = useTopAppBarConfig();
  const location = useLocation();

  // user should always be present inside AppShell (behind AuthGuard)
  if (!user) return null;

  return (
    <ResponsiveGuard>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left Nav — full height */}
        <LeftNav user={user} onLogout={logout} />

        {/* Right side: app bar + workspace */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {/* Top App Bar */}
          <TopAppBar
            title="LegalCode"
            editableTitle={config.editableTitle}
            onTitleChange={config.onTitleChange}
            statusBadge={config.statusBadge}
          >
            {config.rightSlot}
          </TopAppBar>

          {/* Central Workspace */}
          <Box
            data-testid="workspace"
            sx={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </Box>
        </Box>
      </Box>
    </ResponsiveGuard>
  );
}

export function AppShell() {
  return (
    <TopAppBarProvider>
      <AppShellInner />
    </TopAppBarProvider>
  );
}
