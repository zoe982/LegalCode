import { Outlet, useLocation } from 'react-router';
import { Box } from '@mui/material';
import { TopAppBar } from './TopAppBar.js';
import { ResponsiveGuard } from './ResponsiveGuard.js';
import { PageTransition } from './PageTransition.js';
import { useAuth } from '../hooks/useAuth.js';
import { TopAppBarProvider, useTopAppBarConfig } from '../contexts/TopAppBarContext.js';

function AppShellInner() {
  const { user, logout } = useAuth();
  const { config } = useTopAppBarConfig();
  // Subscribe to location changes so AppShellInner re-renders on navigation,
  // ensuring the Outlet updates. Do NOT use as a key — that prevents commits.
  useLocation();

  // user should always be present inside AppShell (behind AuthGuard)
  if (!user) return null;

  return (
    <ResponsiveGuard>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top App Bar */}
        <TopAppBar
          breadcrumbTemplateName={config.breadcrumbTemplateName}
          breadcrumbPageName={config.breadcrumbPageName}
          panelToggles={config.panelToggles}
          rightSlot={config.rightSlot}
          statusBadge={config.statusBadge}
          documentHeader={config.documentHeader}
          user={user}
          onLogout={logout}
        />

        {/* Central Workspace */}
        <Box
          data-testid="workspace"
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: 'var(--surface-primary)',
          }}
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
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
