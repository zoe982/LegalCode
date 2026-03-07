/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { AvatarDropdownMenu } from '../../src/components/AvatarDropdownMenu.js';
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

function renderMenu(props?: { user?: TestUser; onLogout?: () => void }) {
  const { user = mockUser, onLogout = vi.fn() } = props ?? {};
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <AvatarDropdownMenu user={user} onLogout={onLogout} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('AvatarDropdownMenu', () => {
  it('renders avatar button with user initial', () => {
    renderMenu();
    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('A');
  });

  it('renders avatar with first letter of email when name is empty', () => {
    renderMenu({ user: { ...mockUser, name: '' } });
    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toHaveTextContent('A');
  });

  it('opens menu on click', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows user name and email in the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@acasus.com')).toBeInTheDocument();
  });

  it('shows Admin link in the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /admin/i })).toBeInTheDocument();
  });

  it('shows Settings link in the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
  });

  it('shows Log out option in destructive color', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    const logoutItem = screen.getByRole('menuitem', { name: /log out/i });
    expect(logoutItem).toBeInTheDocument();
  });

  it('calls onLogout when Log out is clicked', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onLogout });
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('closes menu after Log out is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders dividers in the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    // MUI Menu renders in a portal, so search the entire document
    const menu = screen.getByRole('menu');
    const dividers = menu.querySelectorAll('hr');
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a 32px avatar button', () => {
    renderMenu();
    const button = screen.getByRole('button', { name: /user menu/i });
    const avatar = button.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
  });

  it('falls back to email initial when name is empty', () => {
    renderMenu({ user: { name: '', email: 'bob@acasus.com', role: 'admin' } });
    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toHaveTextContent('B');
  });
});
