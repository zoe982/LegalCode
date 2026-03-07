/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { User } from '@legalcode/shared';

// --- Mocks ---

const mockUseUsers = vi.fn();
const mockCreateUser = vi.fn();
let mockCreateUserPending = false;
const mockUpdateUserRole = vi.fn();
let mockUpdateRolePending = false;
const mockRemoveUser = vi.fn();
let mockRemoveUserPending = false;

const mockUseAllowedEmails = vi.fn();
const mockAddAllowedEmail = vi.fn();
let mockAddEmailPending = false;
const mockRemoveAllowedEmail = vi.fn();
let mockRemoveEmailPending = false;

vi.mock('../../src/hooks/useUsers.js', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args) as unknown,
  useCreateUser: () => ({
    mutate: mockCreateUser,
    isPending: mockCreateUserPending,
  }),
  useUpdateUserRole: () => ({
    mutate: mockUpdateUserRole,
    isPending: mockUpdateRolePending,
  }),
  useRemoveUser: () => ({
    mutate: mockRemoveUser,
    isPending: mockRemoveUserPending,
  }),
  useAllowedEmails: (...args: unknown[]) => mockUseAllowedEmails(...args) as unknown,
  useAddAllowedEmail: () => ({
    mutate: mockAddAllowedEmail,
    isPending: mockAddEmailPending,
  }),
  useRemoveAllowedEmail: () => ({
    mutate: mockRemoveAllowedEmail,
    isPending: mockRemoveEmailPending,
  }),
}));

const mockUseAuth = vi.fn();
vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args) as unknown,
}));

const { UsersTab } = await import('../../src/components/UsersTab.js');

// --- Test Data ---

const currentUser = {
  id: 'user-1',
  email: 'admin@acasus.com',
  name: 'Admin User',
  role: 'admin' as const,
  createdAt: '2025-06-15T10:00:00Z',
};

const editorUser: User = {
  id: 'user-2',
  email: 'editor@acasus.com',
  name: 'Editor User',
  role: 'editor',
  createdAt: '2025-08-20T14:30:00Z',
  updatedAt: '2025-08-20T14:30:00Z',
};

const viewerUser: User = {
  id: 'user-3',
  email: 'viewer@acasus.com',
  name: 'Viewer User',
  role: 'viewer',
  createdAt: '2025-10-01T09:00:00Z',
  updatedAt: '2025-10-01T09:00:00Z',
};

const adminUser: User = {
  id: 'user-1',
  email: 'admin@acasus.com',
  name: 'Admin User',
  role: 'admin',
  createdAt: '2025-06-15T10:00:00Z',
  updatedAt: '2025-06-15T10:00:00Z',
};

const allUsers: User[] = [adminUser, editorUser, viewerUser];

// --- Helpers ---

function renderTab() {
  return render(
    <ThemeProvider theme={theme}>
      <UsersTab />
    </ThemeProvider>,
  );
}

function setupPopulated() {
  mockUseUsers.mockReturnValue({
    data: { users: allUsers },
    isLoading: false,
    error: null,
  });
  mockUseAllowedEmails.mockReturnValue({
    data: { emails: ['allowed1@acasus.com', 'allowed2@acasus.com'] },
    isLoading: false,
    error: null,
  });
}

describe('UsersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUserPending = false;
    mockUpdateRolePending = false;
    mockRemoveUserPending = false;
    mockAddEmailPending = false;
    mockRemoveEmailPending = false;

    mockUseAuth.mockReturnValue({
      user: currentUser,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseUsers.mockReturnValue({
      data: { users: [] },
      isLoading: false,
      error: null,
    });
    mockUseAllowedEmails.mockReturnValue({
      data: { emails: [] },
      isLoading: false,
      error: null,
    });
  });

  // =====================
  // Loading state
  // =====================

  it('shows loading indicator when users are loading', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderTab();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-busy on loading container', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderTab();
    const loadingContainer = screen.getByRole('progressbar').closest('[aria-busy]');
    expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
  });

  // =====================
  // Error state
  // =====================

  it('shows error alert when users fail to load', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch users'),
    });
    renderTab();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch users');
  });

  // =====================
  // Empty state
  // =====================

  it('shows empty state when no users exist', () => {
    renderTab();
    expect(screen.getByText('No users yet')).toBeInTheDocument();
    expect(screen.getByText('Add a user above to get started.')).toBeInTheDocument();
  });

  // =====================
  // Populated state
  // =====================

  it('renders user table with all columns', () => {
    setupPopulated();
    renderTab();
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Email');
    expect(headers[2]).toHaveTextContent('Role');
    expect(headers[3]).toHaveTextContent('Member Since');
    expect(headers[4]).toHaveTextContent('Actions');
  });

  it('renders user names and emails in the table', () => {
    setupPopulated();
    renderTab();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@acasus.com')).toBeInTheDocument();
    expect(screen.getByText('Editor User')).toBeInTheDocument();
    expect(screen.getByText('editor@acasus.com')).toBeInTheDocument();
    expect(screen.getByText('Viewer User')).toBeInTheDocument();
    expect(screen.getByText('viewer@acasus.com')).toBeInTheDocument();
  });

  it('shows user count badge', () => {
    setupPopulated();
    renderTab();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('formats member since dates correctly', () => {
    setupPopulated();
    renderTab();
    // June 2025
    expect(screen.getByText('June 2025')).toBeInTheDocument();
    // August 2025
    expect(screen.getByText('August 2025')).toBeInTheDocument();
    // October 2025
    expect(screen.getByText('October 2025')).toBeInTheDocument();
  });

  // =====================
  // Role chip colors
  // =====================

  it('renders admin role chip with filled purple background', () => {
    setupPopulated();
    renderTab();
    const adminChip = screen.getByText('ADMIN');
    expect(adminChip.closest('.MuiChip-root')).toHaveStyle({
      backgroundColor: '#8027FF',
    });
  });

  it('renders editor role chip with outlined style', () => {
    setupPopulated();
    renderTab();
    const editorChip = screen.getByText('EDITOR');
    const chipRoot = editorChip.closest('.MuiChip-root');
    expect(chipRoot).toHaveClass('MuiChip-outlined');
  });

  it('renders viewer role chip with outlined style', () => {
    setupPopulated();
    renderTab();
    const viewerChip = screen.getByText('VIEWER');
    const chipRoot = viewerChip.closest('.MuiChip-root');
    expect(chipRoot).toHaveClass('MuiChip-outlined');
  });

  // =====================
  // Add User form
  // =====================

  it('renders add user form with email, name, role fields and button', () => {
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    expect(within(form).getByLabelText(/email/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Select role for new user')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  it('disables Add User button when email is empty', () => {
    renderTab();
    const addButton = screen.getByRole('button', { name: /add user/i });
    expect(addButton).toBeDisabled();
  });

  it('disables Add User button when name is empty', async () => {
    const user = userEvent.setup();
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'test@acasus.com');
    const addButton = screen.getByRole('button', { name: /add user/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add User button when both email and name are filled', async () => {
    const user = userEvent.setup();
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'test@acasus.com');
    await user.type(within(form).getByLabelText(/name/i), 'Test User');
    const addButton = screen.getByRole('button', { name: /add user/i });
    expect(addButton).toBeEnabled();
  });

  it('calls createUser mutation on form submit', async () => {
    const user = userEvent.setup();
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'new@acasus.com');
    await user.type(within(form).getByLabelText(/name/i), 'New User');
    await user.click(screen.getByRole('button', { name: /add user/i }));
    expect(mockCreateUser).toHaveBeenCalledWith(
      {
        email: 'new@acasus.com',
        name: 'New User',
        role: 'viewer',
      },
      expect.anything(),
    );
  });

  it('clears form after successful user creation', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'new@acasus.com');
    await user.type(within(form).getByLabelText(/name/i), 'New User');
    await user.click(screen.getByRole('button', { name: /add user/i }));
    expect(within(form).getByLabelText(/email/i)).toHaveValue('');
    expect(within(form).getByLabelText(/name/i)).toHaveValue('');
  });

  // =====================
  // Self-protection
  // =====================

  it('disables role select for current user', () => {
    setupPopulated();
    renderTab();
    const roleSelect = screen.getByLabelText('Change role for Admin User');
    expect(roleSelect.closest('.Mui-disabled') ?? roleSelect).toBeTruthy();
  });

  it('disables delete button for current user', () => {
    setupPopulated();
    renderTab();
    const deleteButton = screen.getByRole('button', { name: 'Remove Admin User' });
    expect(deleteButton).toBeDisabled();
  });

  it('shows tooltip on disabled self-protection controls', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    const deleteButton = screen.getByRole('button', { name: 'Remove Admin User' });
    const tooltipWrapper = deleteButton.closest('span');
    if (tooltipWrapper) {
      await user.hover(tooltipWrapper);
    }
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'You cannot modify your own account',
      );
    });
  });

  it('enables role select for other users', () => {
    setupPopulated();
    renderTab();
    const roleSelect = screen.getByLabelText('Change role for Editor User');
    expect(roleSelect.closest('.Mui-disabled')).toBeNull();
  });

  it('enables delete button for other users', () => {
    setupPopulated();
    renderTab();
    const deleteButton = screen.getByRole('button', { name: 'Remove Editor User' });
    expect(deleteButton).toBeEnabled();
  });

  // =====================
  // Role change
  // =====================

  it('calls updateUserRole when role is changed for another user', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    const nativeSelect = screen.getByLabelText('Change role for Editor User');
    const selectContainer = nativeSelect.closest('.MuiSelect-root')
      ?? nativeSelect.closest('.MuiInputBase-root');
    const trigger = selectContainer?.querySelector('[role="combobox"]');
    expect(trigger).toBeInstanceOf(HTMLElement);
    await user.click(trigger as HTMLElement);
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    const adminOption = options.find((opt) => opt.textContent === 'Admin');
    expect(adminOption).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- asserted above
    await user.click(adminOption!);
    expect(mockUpdateUserRole).toHaveBeenCalledWith({
      id: 'user-2',
      role: 'admin',
    });
  });

  // =====================
  // Delete user with confirmation
  // =====================

  it('opens confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Editor User/)).toBeInTheDocument();
    expect(within(dialog).getByText(/editor@acasus.com/)).toBeInTheDocument();
  });

  it('calls removeUser on confirm', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /remove/i }));
    expect(mockRemoveUser).toHaveBeenCalledWith('user-2', expect.anything());
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // =====================
  // Allowed Emails section
  // =====================

  it('renders allowed emails section', () => {
    setupPopulated();
    renderTab();
    expect(screen.getByText('Allowed Emails')).toBeInTheDocument();
  });

  it('lists allowed emails', () => {
    setupPopulated();
    renderTab();
    expect(screen.getByText('allowed1@acasus.com')).toBeInTheDocument();
    expect(screen.getByText('allowed2@acasus.com')).toBeInTheDocument();
  });

  it('shows empty state for allowed emails when none exist', () => {
    mockUseUsers.mockReturnValue({
      data: { users: allUsers },
      isLoading: false,
      error: null,
    });
    mockUseAllowedEmails.mockReturnValue({
      data: { emails: [] },
      isLoading: false,
      error: null,
    });
    renderTab();
    expect(screen.getByText('No allowed emails configured.')).toBeInTheDocument();
  });

  it('adds an allowed email', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    const emailInput = screen.getByLabelText(/add email/i);
    await user.type(emailInput, 'new@acasus.com');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(mockAddAllowedEmail).toHaveBeenCalledWith('new@acasus.com', expect.anything());
  });

  it('disables Add email button when email input is empty', () => {
    setupPopulated();
    renderTab();
    const addButton = screen.getByRole('button', { name: /^add$/i });
    expect(addButton).toBeDisabled();
  });

  it('opens confirmation dialog when removing allowed email', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/Remove allowed1@acasus.com from the allowed list/),
    ).toBeInTheDocument();
  });

  it('calls removeAllowedEmail on confirm', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /remove/i }));
    expect(mockRemoveAllowedEmail).toHaveBeenCalledWith('allowed1@acasus.com', expect.anything());
  });

  // =====================
  // Accessibility
  // =====================

  it('has accessible form label on add user section', () => {
    renderTab();
    expect(screen.getByLabelText('Add new user form')).toBeInTheDocument();
  });

  it('renders semantic table elements', () => {
    setupPopulated();
    renderTab();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
  });

  // =====================
  // Avatar in name column
  // =====================

  it('renders avatar with user initials in the name column', () => {
    setupPopulated();
    renderTab();
    // Admin User -> AU, Editor User -> EU, Viewer User -> VU
    expect(screen.getByText('AU')).toBeInTheDocument();
    expect(screen.getByText('EU')).toBeInTheDocument();
    expect(screen.getByText('VU')).toBeInTheDocument();
  });

  // =====================
  // onSuccess callbacks
  // =====================

  it('clears allowed email input after successful add', async () => {
    const user = userEvent.setup();
    mockAddAllowedEmail.mockImplementation((_email: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderTab();
    const emailInput = screen.getByLabelText(/add email/i);
    await user.type(emailInput, 'new@acasus.com');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(emailInput).toHaveValue('');
  });

  it('closes dialog after successful user removal', async () => {
    const user = userEvent.setup();
    mockRemoveUser.mockImplementation((_id: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /remove/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog after successful email removal', async () => {
    const user = userEvent.setup();
    mockRemoveAllowedEmail.mockImplementation((_email: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /remove/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes email removal dialog on cancel', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // =====================
  // Pending state for remove operations
  // =====================

  it('shows loading in remove user button when pending', async () => {
    const user = userEvent.setup();
    mockRemoveUserPending = true;
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    // The second button (after Cancel) is the remove/confirm button
    const removeBtn = buttons[buttons.length - 1];
    expect(removeBtn).toBeDisabled();
    expect(removeBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('shows loading in remove email button when pending', async () => {
    const user = userEvent.setup();
    mockRemoveEmailPending = true;
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    const removeBtn = buttons[buttons.length - 1];
    expect(removeBtn).toBeDisabled();
    expect(removeBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Add user error and success feedback
  // =====================

  it('closes remove user dialog via escape key', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'Remove Editor User' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes remove email dialog via escape key', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderTab();
    await user.click(screen.getByLabelText('Remove allowed1@acasus.com from allowed list'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('allows changing role in add user form', async () => {
    const user = userEvent.setup();
    renderTab();
    const roleSelect = screen.getByLabelText('Select role for new user');
    const selectContainer = roleSelect.closest('.MuiSelect-root')
      ?? roleSelect.closest('.MuiInputBase-root');
    const trigger = selectContainer?.querySelector('[role="combobox"]');
    expect(trigger).toBeInstanceOf(HTMLElement);
    await user.click(trigger as HTMLElement);
    const listbox = await screen.findByRole('listbox');
    const editorOption = within(listbox).getAllByRole('option').find((opt) => opt.textContent === 'Editor');
    expect(editorOption).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- asserted above
    await user.click(editorOption!);
  });

  it('shows loading in add user button when pending', () => {
    mockCreateUserPending = true;
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    // When pending, button shows spinner instead of "Add User" text
    const buttons = within(form).getAllByRole('button');
    const submitBtn = buttons[buttons.length - 1];
    expect(submitBtn).toBeDisabled();
    expect(submitBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('shows error message on add user failure', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockImplementation((_data: unknown, opts: { onError?: (err: Error) => void }) => {
      opts.onError?.(new Error('Email already exists'));
    });
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'dup@acasus.com');
    await user.type(within(form).getByLabelText(/name/i), 'Dup User');
    await user.click(screen.getByRole('button', { name: /add user/i }));
    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('shows success feedback after adding user', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    renderTab();
    const form = screen.getByLabelText('Add new user form');
    await user.type(within(form).getByLabelText(/email/i), 'new@acasus.com');
    await user.type(within(form).getByLabelText(/name/i), 'New User');
    await user.click(screen.getByRole('button', { name: /add user/i }));
    // Success alert should appear
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
