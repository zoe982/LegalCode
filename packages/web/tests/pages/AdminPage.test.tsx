/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';

const mockUseErrorLog = vi.fn();
const mockResolveError = vi.fn();

vi.mock('../../src/hooks/useErrorLog.js', () => ({
  useErrorLog: (...args: unknown[]) => mockUseErrorLog(...args) as unknown,
  useResolveError: () => ({
    mutate: mockResolveError,
    isSuccess: false,
  }),
}));

vi.mock('../../src/utils/generateFixPrompt.js', () => ({
  generateFixPrompt: () => '# Prompt' as string,
}));

const mockMutate = vi.fn();
const mockMutationResult = {
  mutate: mockMutate,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: vi.fn(),
};

vi.mock('../../src/hooks/useUsers.js', () => ({
  useUsers: () => ({ data: { users: [] }, isLoading: false, error: null }),
  useCreateUser: () => mockMutationResult,
  useUpdateUserRole: () => mockMutationResult,
  useRemoveUser: () => mockMutationResult,
  useAllowedEmails: () => ({ data: { emails: [] } }),
  useAddAllowedEmail: () => mockMutationResult,
  useRemoveAllowedEmail: () => mockMutationResult,
}));

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
  }),
}));

const mockSetConfig = vi.fn();
const mockClearConfig = vi.fn();

vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    config: {},
    setConfig: mockSetConfig,
    clearConfig: mockClearConfig,
  }),
}));

const { AdminPage } = await import('../../src/pages/AdminPage.js');

function renderAdminPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AdminPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseErrorLog.mockReturnValue({
      data: { errors: [] },
      isLoading: false,
    });
  });

  it('renders Users section heading as h2', () => {
    renderAdminPage();
    expect(screen.getByRole('heading', { level: 2, name: /users/i })).toBeInTheDocument();
  });

  it('renders Error Log section heading as h2', () => {
    renderAdminPage();
    expect(screen.getByRole('heading', { level: 2, name: /error log/i })).toBeInTheDocument();
  });

  it('renders both sections visible without clicking tabs', () => {
    renderAdminPage();
    // UsersTab renders the "Add new user form" region
    expect(screen.getByLabelText('Add new user form')).toBeInTheDocument();
    // ErrorLogTab renders its content
    expect(screen.getByText('No errors recorded')).toBeInTheDocument();
  });

  it('renders a divider between sections', () => {
    renderAdminPage();
    const dividers = document.querySelectorAll('hr.MuiDivider-root');
    expect(dividers.length).toBeGreaterThanOrEqual(1);
  });

  it('sets breadcrumb page name on mount', () => {
    renderAdminPage();
    expect(mockSetConfig).toHaveBeenCalledWith({ breadcrumbPageName: 'Admin' });
  });

  it('clears config on unmount', () => {
    const { unmount } = renderAdminPage();
    unmount();
    expect(mockClearConfig).toHaveBeenCalled();
  });
});
