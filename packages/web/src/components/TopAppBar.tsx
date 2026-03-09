import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { Breadcrumbs } from './Breadcrumbs.js';
import { AvatarDropdownMenu } from './AvatarDropdownMenu.js';
import type { Role } from '@legalcode/shared';

interface TopAppBarUser {
  name: string;
  email: string;
  role: Role;
}

interface TopAppBarProps {
  breadcrumbTemplateName?: string | undefined;
  breadcrumbPageName?: string | undefined;
  panelToggles?: ReactNode | undefined;
  rightSlot?: ReactNode | undefined;
  statusBadge?: ReactNode | undefined;
  documentHeader?: ReactNode | undefined;
  user: TopAppBarUser;
  onLogout: () => void;
}

/**
 * Top app bar — v3 design: 48px height, white background, bottom border.
 * No sidebar companion. Full-width across the viewport.
 *
 * Left: Breadcrumbs (LegalCode wordmark + optional template path)
 * Center-right: panelToggles slot (editor toggle buttons)
 * Right: rightSlot (presence, version button) + AvatarDropdownMenu
 */
export function TopAppBar({
  breadcrumbTemplateName,
  breadcrumbPageName,
  panelToggles,
  rightSlot,
  statusBadge,
  documentHeader,
  user,
  onLogout,
}: TopAppBarProps) {
  return (
    <Box
      data-testid="top-app-bar"
      sx={{
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-primary)',
        zIndex: 30,
      }}
    >
      {documentHeader != null ? (
        /* Document header replaces default layout in editor */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {documentHeader}
          </Box>
          <AvatarDropdownMenu user={user} onLogout={onLogout} />
        </>
      ) : (
        <>
          {/* Left: Breadcrumbs + optional status badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            <Breadcrumbs templateName={breadcrumbTemplateName} pageName={breadcrumbPageName} />
            {statusBadge != null && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>{statusBadge}</Box>
            )}
          </Box>

          {/* Right section: panel toggles + right slot + avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {panelToggles != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{panelToggles}</Box>
            )}
            {rightSlot != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{rightSlot}</Box>
            )}
            <AvatarDropdownMenu user={user} onLogout={onLogout} />
          </Box>
        </>
      )}
    </Box>
  );
}
