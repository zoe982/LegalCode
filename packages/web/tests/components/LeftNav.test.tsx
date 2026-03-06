/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { LeftNav } from '../../src/components/LeftNav.js';
import type { Role } from '@legalcode/shared';

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const mockUser: TestUser = { id: 'u1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' };

function renderLeftNav(props?: { currentPath?: string; user?: TestUser; onLogout?: () => void }) {
  const { currentPath = '/templates', user = mockUser, onLogout = vi.fn() } = props ?? {};
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[currentPath]}>
        <LeftNav user={user} onLogout={onLogout} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('LeftNav', () => {
  it('renders with data-testid left-nav', () => {
    renderLeftNav();
    expect(screen.getByTestId('left-nav')).toBeInTheDocument();
  });

  it('renders "New Template" button for editors', () => {
    renderLeftNav();
    expect(screen.getByRole('link', { name: /new template/i })).toBeInTheDocument();
  });

  it('hides "New Template" button for viewers', () => {
    renderLeftNav({ user: { ...mockUser, role: 'viewer' } });
    expect(screen.queryByRole('link', { name: /new template/i })).not.toBeInTheDocument();
  });

  it('renders Templates, Admin, and Settings navigation links', () => {
    renderLeftNav();
    expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('marks the active route with aria-current', () => {
    renderLeftNav({ currentPath: '/templates' });
    const link = screen.getByRole('link', { name: /templates/i });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive routes with aria-current', () => {
    renderLeftNav({ currentPath: '/templates' });
    const adminLink = screen.getByRole('link', { name: /admin/i });
    expect(adminLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('renders user name and role in footer', () => {
    renderLeftNav();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  it('opens menu with Log Out on footer button click', async () => {
    const user = userEvent.setup();
    renderLeftNav();
    const menuButton = screen.getByRole('button', { name: /user menu/i });
    await user.click(menuButton);
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls onLogout when Log Out is clicked', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    renderLeftNav({ onLogout });
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('shows "New Template" button for admins', () => {
    renderLeftNav({ user: { ...mockUser, role: 'admin' } });
    expect(screen.getByRole('link', { name: /new template/i })).toBeInTheDocument();
  });

  it('marks Admin link as active when on /admin path', () => {
    renderLeftNav({ currentPath: '/admin' });
    const adminLink = screen.getByRole('link', { name: /admin/i });
    expect(adminLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks Settings link as active when on /settings path', () => {
    renderLeftNav({ currentPath: '/settings' });
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders Acasus header text', () => {
    renderLeftNav();
    expect(screen.getByText('Acasus')).toBeInTheDocument();
  });

  it('renders user avatar with first letter of name', () => {
    renderLeftNav();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to email when name is empty', () => {
    renderLeftNav({ user: { ...mockUser, name: '' } });
    // Avatar shows first char of email, uppercased
    const avatar = screen
      .getByRole('button', { name: /user menu/i })
      .querySelector('.MuiAvatar-root');
    expect(avatar).toHaveTextContent('A');
    // Display name falls back to email
    expect(screen.getByText('alice@acasus.com')).toBeInTheDocument();
  });

  it('renders two dividers (hr elements)', () => {
    renderLeftNav();
    const dividers = screen.getByTestId('left-nav').querySelectorAll('hr');
    expect(dividers).toHaveLength(2);
  });

  it('applies hover background on mouse enter and removes on mouse leave', async () => {
    const user = userEvent.setup();
    renderLeftNav();
    const templatesLink = screen.getByRole('link', { name: /templates/i });
    await user.hover(templatesLink);
    expect(templatesLink.style.backgroundColor).toBe('rgb(54, 24, 80)');
    await user.unhover(templatesLink);
    expect(templatesLink.style.backgroundColor).toBe('transparent');
  });
});
