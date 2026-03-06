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

  it('each row shows title, version, country, status', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Each template has a row with data-testid
    const row1 = screen.getByTestId('template-row-t1');
    expect(within(row1).getByText('Employment Agreement')).toBeInTheDocument();
    expect(within(row1).getByText('v2')).toBeInTheDocument();
    expect(within(row1).getByText('US')).toBeInTheDocument();

    const row2 = screen.getByTestId('template-row-t2');
    expect(within(row2).getByText('Mutual NDA')).toBeInTheDocument();
    expect(within(row2).getByText('v1')).toBeInTheDocument();

    const row3 = screen.getByTestId('template-row-t3');
    expect(within(row3).getByText('Offer Letter')).toBeInTheDocument();
    expect(within(row3).getByText('UK')).toBeInTheDocument();

    // StatusChip renders "Published" for active status
    const publishedChips = screen.getAllByText('Published');
    expect(publishedChips.length).toBeGreaterThanOrEqual(1);
    // "Draft" appears both as filter chip and as StatusChip in row
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
    const row = screen.getByTestId('template-row-t2');
    expect(within(row).getByText('\u2014')).toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
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

    // Click on Employment Agreement row by testid
    const row = screen.getByTestId('template-row-t1');
    await user.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
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
