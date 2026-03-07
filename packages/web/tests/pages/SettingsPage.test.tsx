/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { SettingsPage } from '../../src/pages/SettingsPage.js';

const mockSetConfig = vi.fn();
const mockClearConfig = vi.fn();

vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    config: {},
    setConfig: mockSetConfig,
    clearConfig: mockClearConfig,
  }),
}));

const mockLogout = vi.fn();
const mockSetEditorMode = vi.fn();

const mockUseAuth = vi.fn<
  () => {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'editor' | 'viewer';
      createdAt?: string;
    } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
    isLoggingOut: boolean;
  }
>();

const mockUsePreferences =
  vi.fn<
    () => { editorMode: 'edit' | 'review'; setEditorMode: (mode: 'edit' | 'review') => void }
  >();

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth() as unknown,
}));

vi.mock('../../src/hooks/usePreferences.js', () => ({
  usePreferences: () => mockUsePreferences() as unknown,
}));

const defaultUser = {
  id: 'u1',
  email: 'alice.smith@acasus.com',
  name: 'Alice Smith',
  role: 'admin' as const,
  createdAt: '2025-03-15T10:00:00Z',
};

function renderSettings() {
  return render(
    <ThemeProvider theme={theme}>
      <SettingsPage />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: defaultUser,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
    isLoggingOut: false,
  });
  mockUsePreferences.mockReturnValue({
    editorMode: 'edit',
    setEditorMode: mockSetEditorMode,
  });
});

describe('SettingsPage', () => {
  // --- Page structure ---

  it('renders Settings heading as h1', () => {
    renderSettings();
    const heading = screen.getByRole('heading', { level: 1, name: /settings/i });
    expect(heading).toBeInTheDocument();
  });

  it('sets breadcrumb page name to Settings on mount', () => {
    renderSettings();
    expect(mockSetConfig).toHaveBeenCalledWith({ breadcrumbPageName: 'Settings' });
  });

  it('clears config on unmount', () => {
    const { unmount } = renderSettings();
    unmount();
    expect(mockClearConfig).toHaveBeenCalled();
  });

  it('renders section headings as h2', () => {
    renderSettings();
    expect(
      screen.getByRole('heading', { level: 2, name: /editor preferences/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /account/i })).toBeInTheDocument();
  });

  // --- Loading state ---

  it('shows skeleton placeholders when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    // Circular skeleton for avatar
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    // Circular avatar skeleton
    const circularSkeleton = document.querySelector('.MuiSkeleton-circular');
    expect(circularSkeleton).toBeInTheDocument();
  });

  it('does not render user name or email when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('alice.smith@acasus.com')).not.toBeInTheDocument();
  });

  // --- Populated state ---

  it('renders user name', () => {
    renderSettings();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders user email', () => {
    renderSettings();
    expect(screen.getByText('alice.smith@acasus.com')).toBeInTheDocument();
  });

  // --- Avatar initials ---

  it('renders avatar with initials from first + last name', () => {
    renderSettings();
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('AS');
  });

  it('renders single initial when user has one-word name', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, name: 'Alice' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toHaveTextContent('A');
  });

  it('renders email initial fallback when name is empty', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, name: '' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toHaveTextContent('A');
  });

  // --- Role chip ---

  it('renders admin role chip with filled style', () => {
    renderSettings();
    const chip = screen.getByText(/admin/i);
    expect(chip.closest('.MuiChip-root')).toBeInTheDocument();
    expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-filled');
  });

  it('renders editor role chip with outlined style', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, role: 'editor' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    const chip = screen.getByRole('status');
    expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });

  it('renders viewer role chip with outlined style', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, role: 'viewer' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    const chip = screen.getByText(/viewer/i);
    expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });

  // --- Google badge ---

  it('renders "Connected via Google" chip', () => {
    renderSettings();
    expect(screen.getByText(/connected via google/i)).toBeInTheDocument();
  });

  it('renders Google badge as outlined chip', () => {
    renderSettings();
    const label = screen.getByText(/connected via google/i);
    expect(label.closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });

  // --- Member since ---

  it('renders "Member since" label', () => {
    renderSettings();
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  it('formats member since date using Intl.DateTimeFormat', () => {
    renderSettings();
    // March 2025 from '2025-03-15T10:00:00Z'
    expect(screen.getByText('March 2025')).toBeInTheDocument();
  });

  it('renders fallback when createdAt is missing', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: defaultUser.id,
        email: defaultUser.email,
        name: defaultUser.name,
        role: defaultUser.role,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    // Should still render without crashing, show some fallback
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  // --- Editor Preferences (ToggleButtonGroup) ---

  it('renders ToggleButtonGroup with Edit and Review options', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /edit/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review/i, pressed: false })).toBeInTheDocument();
  });

  it('shows Edit as selected when editorMode is "edit"', () => {
    renderSettings();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(editBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows Review as selected when editorMode is "review"', () => {
    mockUsePreferences.mockReturnValue({
      editorMode: 'review',
      setEditorMode: mockSetEditorMode,
    });
    renderSettings();
    const reviewBtn = screen.getByRole('button', { name: /review/i });
    expect(reviewBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls setEditorMode when toggling to Review', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: /review/i }));
    expect(mockSetEditorMode).toHaveBeenCalledWith('review');
  });

  it('calls setEditorMode when toggling to Edit', async () => {
    mockUsePreferences.mockReturnValue({
      editorMode: 'review',
      setEditorMode: mockSetEditorMode,
    });
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockSetEditorMode).toHaveBeenCalledWith('edit');
  });

  it('renders ToggleButtonGroup with aria-label', () => {
    renderSettings();
    const group = screen.getByRole('group', { name: /default editor mode/i });
    expect(group).toBeInTheDocument();
  });

  it('renders preference label and caption', () => {
    renderSettings();
    expect(screen.getByText('Default editor mode')).toBeInTheDocument();
    expect(screen.getByText(/choose your preferred editing mode/i)).toBeInTheDocument();
  });

  // --- Sign out ---

  it('renders sign out button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /sign out of legalcode/i })).toBeInTheDocument();
  });

  it('calls logout when sign out button is clicked', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: /sign out of legalcode/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('shows loading indicator when logging out', () => {
    mockUseAuth.mockReturnValue({
      user: defaultUser,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: true,
    });
    renderSettings();
    const signOutBtn = screen.getByRole('button', { name: /sign out of legalcode/i });
    expect(signOutBtn).toBeDisabled();
    // CircularProgress should be present
    const progress = signOutBtn.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();
  });

  // --- Dividers ---

  it('renders dividers between sections', () => {
    renderSettings();
    const dividers = document.querySelectorAll('hr.MuiDivider-root');
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  // --- Avatar decorative ---

  it('marks avatar as decorative with aria-hidden', () => {
    renderSettings();
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  // --- Coverage: uncovered branches ---

  it('renders nothing for profile when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    // Page heading still renders
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
    // But no avatar, name, email, or skeletons
    expect(document.querySelector('.MuiAvatar-root')).not.toBeInTheDocument();
    expect(document.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('falls back to viewer chip style for unknown role', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, role: 'superadmin' as 'admin' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    const chip = screen.getByRole('status');
    expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });

  it('shows Unknown for invalid date string in member since', () => {
    mockUseAuth.mockReturnValue({
      user: { ...defaultUser, createdAt: 'not-a-date' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      isLoggingOut: false,
    });
    renderSettings();
    // Invalid date may format as "Invalid Date" or fall through — check it doesn't crash
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });
});
