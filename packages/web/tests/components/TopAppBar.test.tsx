/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TopAppBar } from '../../src/components/TopAppBar.js';
import type { Role } from '@legalcode/shared';

interface TestUser {
  name: string;
  email: string;
  role: Role;
}

const mockUser: TestUser = {
  name: 'Alice Smith',
  email: 'alice@acasus.com',
  role: 'editor',
};

function renderAppBar(props?: Partial<React.ComponentProps<typeof TopAppBar>>) {
  const { user = mockUser, onLogout = vi.fn(), ...rest } = props ?? {};
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <TopAppBar user={user} onLogout={onLogout} {...rest} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('TopAppBar', () => {
  it('has data-testid top-app-bar', () => {
    renderAppBar();
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders with 48px height', () => {
    renderAppBar();
    const bar = screen.getByTestId('top-app-bar');
    expect(bar).toHaveStyle({ height: '48px' });
  });

  it('renders with white background', () => {
    renderAppBar();
    const bar = screen.getByTestId('top-app-bar');
    expect(bar).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('renders Breadcrumbs component with Acasus wordmark', () => {
    renderAppBar();
    expect(screen.getByText('Acasus')).toBeInTheDocument();
  });

  it('passes breadcrumbTemplateName to Breadcrumbs', () => {
    renderAppBar({ breadcrumbTemplateName: 'My Document' });
    expect(screen.getByText('My Document')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders panelToggles slot', () => {
    renderAppBar({
      panelToggles: <button>Info</button>,
    });
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument();
  });

  it('renders rightSlot content', () => {
    renderAppBar({
      rightSlot: <span data-testid="right-content">Version</span>,
    });
    expect(screen.getByTestId('right-content')).toBeInTheDocument();
  });

  it('renders AvatarDropdownMenu with user avatar', () => {
    renderAppBar();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('renders avatar with user initial', () => {
    renderAppBar();
    const avatarBtn = screen.getByRole('button', { name: /user menu/i });
    expect(avatarBtn).toHaveTextContent('A');
  });

  it('opens avatar dropdown menu on click', async () => {
    const user = userEvent.setup();
    renderAppBar();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders status badge when provided', () => {
    renderAppBar({
      statusBadge: <span data-testid="status-badge">Draft</span>,
    });
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('does not render status badge when not provided', () => {
    renderAppBar();
    expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
  });

  it('renders all slots together without conflict', () => {
    renderAppBar({
      breadcrumbTemplateName: 'Contract A',
      panelToggles: <button>Toggle</button>,
      rightSlot: <span data-testid="extra">Extra</span>,
      statusBadge: <span data-testid="badge">Active</span>,
    });
    expect(screen.getByText('Contract A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
    expect(screen.getByTestId('extra')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });
});
