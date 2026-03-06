/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TemplateListPage } from '../../src/pages/TemplateListPage.js';
import type { Template } from '@legalcode/shared';
import type { TemplateListResponse } from '../../src/services/templates.js';
import type { UseQueryResult } from '@tanstack/react-query';

const mockUseTemplates = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplates: (...args: unknown[]) => mockUseTemplates(...args) as unknown,
}));

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth() as unknown,
}));

const mockTemplates: Template[] = [
  {
    id: 't1',
    title: 'Employment Agreement',
    slug: 'employment-agreement-abc123',
    category: 'Employment',
    country: 'US',
    status: 'active',
    currentVersion: 2,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 't2',
    title: 'Mutual NDA',
    slug: 'mutual-nda-def456',
    category: 'NDA',
    country: null,
    status: 'active',
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 't3',
    title: 'Offer Letter',
    slug: 'offer-letter-ghi789',
    category: 'Employment',
    country: 'UK',
    status: 'draft',
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

function createQueryResult(
  overrides: Partial<UseQueryResult<TemplateListResponse>>,
): UseQueryResult<TemplateListResponse> {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    promise: Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
  } as UseQueryResult<TemplateListResponse>;
}

const editorAuth = {
  user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' as const },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  isLoggingOut: false,
};

const viewerAuth = {
  user: { id: '2', email: 'bob@acasus.com', name: 'Bob', role: 'viewer' as const },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  isLoggingOut: false,
};

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TemplateListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(editorAuth);
  });

  it('shows loading spinner while fetching', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: undefined,
        isLoading: true,
        isPending: true,
        isSuccess: false,
        status: 'pending',
        fetchStatus: 'fetching',
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByText('No templates yet')).toBeInTheDocument();
  });

  it('groups templates by category', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Both category accordion headers should be present
    expect(screen.getByText('Employment')).toBeInTheDocument();
    expect(screen.getByText('NDA')).toBeInTheDocument();
  });

  it('each row shows title, version, country, status', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Employment Agreement row
    expect(screen.getByText('Employment Agreement')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();

    // Mutual NDA row (country is null, should show dash)
    expect(screen.getByText('Mutual NDA')).toBeInTheDocument();
    // Both Mutual NDA and Offer Letter are v1
    const v1Elements = screen.getAllByText('v1');
    expect(v1Elements).toHaveLength(2);

    // Offer Letter row
    expect(screen.getByText('Offer Letter')).toBeInTheDocument();
    expect(screen.getByText('UK')).toBeInTheDocument();

    // StatusChip renders chip labels (2 from table rows + 1 from filter chip = 3)
    const activeChips = screen.getAllByText('Active');
    expect(activeChips.length).toBeGreaterThanOrEqual(2);
    // "Draft" appears both as filter chip and as StatusChip in table
    const draftChips = screen.getAllByText('Draft');
    expect(draftChips.length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash for null country', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          data: [mockTemplates[1]!],
          total: 1,
          page: 1,
          limit: 20,
        },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // The NDA row should show an em dash for null country
    const mutualNdaCell = screen.getByText('Mutual NDA');
    const row = mutualNdaCell.closest('tr');
    if (row === null) {
      throw new Error('Expected row element to exist');
    }
    expect(within(row).getByText('\u2014')).toBeInTheDocument();
  });

  it('FAB visible for editor role', () => {
    mockUseAuth.mockReturnValue(editorAuth);
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /add template/i })).toBeInTheDocument();
  });

  it('FAB hidden for viewer role', () => {
    mockUseAuth.mockReturnValue(viewerAuth);
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /add template/i })).not.toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    // "Draft" and "Active" also appear in the table as StatusChip labels,
    // so look specifically in the filter area
    const filterChipDraft = screen.getByRole('button', { name: 'Draft' });
    expect(filterChipDraft).toBeInTheDocument();
    const filterChipActive = screen.getByRole('button', { name: 'Active' });
    expect(filterChipActive).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archived' })).toBeInTheDocument();
  });

  it('renders search field', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
  });

  it('navigates to template detail when row is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Click on Employment Agreement row
    const row = screen.getByText('Employment Agreement').closest('tr');
    if (!row) throw new Error('Expected row element');
    await user.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
  });

  it('navigates to /templates/new when FAB is clicked', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue(editorAuth);
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const fab = screen.getByRole('button', { name: /add template/i });
    await user.click(fab);

    expect(mockNavigate).toHaveBeenCalledWith('/templates/new');
  });

  it('debounces search input', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const searchField = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchField, 'employment');

    // Before debounce fires, useTemplates should have been called with empty filters
    expect(mockUseTemplates).toHaveBeenCalled();

    // Advance timers to trigger debounce
    vi.advanceTimersByTime(300);

    // After debounce, it should be called with search filter
    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'employment' }));
    });

    vi.useRealTimers();
  });

  it('filters by status when status chip is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Click the Draft filter chip
    await user.click(screen.getByRole('button', { name: 'Draft' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ status: 'draft' }));
    });
  });
});
