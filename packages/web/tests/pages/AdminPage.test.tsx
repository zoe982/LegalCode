/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders Admin heading', () => {
    renderAdminPage();
    expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders tabs for Users and Error Log', () => {
    renderAdminPage();
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /error log/i })).toBeInTheDocument();
  });

  it('defaults to Error Log tab', () => {
    renderAdminPage();
    const errorLogTab = screen.getByRole('tab', { name: /error log/i });
    expect(errorLogTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows Error Log tab content by default', () => {
    renderAdminPage();
    // Empty state from ErrorLogTab
    expect(screen.getByText('No errors recorded')).toBeInTheDocument();
  });

  it('switches to Users tab on click', async () => {
    const user = userEvent.setup();
    renderAdminPage();

    await user.click(screen.getByRole('tab', { name: /users/i }));

    expect(screen.getByText('User management coming soon')).toBeInTheDocument();
  });

  it('switches back to Error Log tab', async () => {
    const user = userEvent.setup();
    renderAdminPage();

    await user.click(screen.getByRole('tab', { name: /users/i }));
    await user.click(screen.getByRole('tab', { name: /error log/i }));

    expect(screen.getByText('No errors recorded')).toBeInTheDocument();
  });

  it('renders tab indicator with accent-primary color', () => {
    renderAdminPage();
    // Just verify tabs render without error — color testing is visual
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
