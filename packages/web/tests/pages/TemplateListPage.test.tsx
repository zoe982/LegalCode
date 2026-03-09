/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TemplateListPage } from '../../src/pages/TemplateListPage.js';
import type { Template } from '@legalcode/shared';
import type { TemplateListResponse } from '../../src/services/templates.js';
import type { CategoryListResponse } from '../../src/services/categories.js';
import type { CountryListResponse } from '../../src/services/countries.js';
import type { UseQueryResult } from '@tanstack/react-query';

const mockUseTemplates = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUseDeleteTemplate = vi.fn();
const mockUseCategories = vi.fn();
const mockUseCountries = vi.fn();
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
  useDeleteTemplate: () => mockUseDeleteTemplate() as unknown,
}));

vi.mock('../../src/hooks/useCategories.js', () => ({
  useCategories: () => mockUseCategories() as unknown,
}));

vi.mock('../../src/hooks/useCountries.js', () => ({
  useCountries: () => mockUseCountries() as unknown,
}));

vi.mock('../../src/components/CreateTemplateDialog.js', () => ({
  CreateTemplateDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="create-template-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const mockTemplates: Template[] = [
  {
    id: 't1',
    title: 'Employment Agreement',
    slug: 'employment-agreement-abc123',
    category: 'Employment',
    description: null,
    country: 'US',
    currentVersion: 2,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 't2',
    title: 'Mutual NDA',
    slug: 'mutual-nda-def456',
    category: 'NDA',
    description: null,
    country: null,
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 't3',
    title: 'Offer Letter',
    slug: 'offer-letter-ghi789',
    category: 'Employment',
    description: null,
    country: 'UK',
    currentVersion: 1,
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    deletedAt: null,
    deletedBy: null,
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

const mockCategories = [
  { id: 'c1', name: 'Employment', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'c2', name: 'NDA', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'c3', name: 'Compliance', createdAt: '2026-01-01T00:00:00Z' },
];

const mockCountriesList = [
  { id: 'co1', name: 'Argentina', code: 'AR', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'co2', name: 'United Kingdom', code: 'UK', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'co3', name: 'United States', code: 'US', createdAt: '2026-01-01T00:00:00Z' },
];

function createCategoryQueryResult(
  overrides: Partial<UseQueryResult<CategoryListResponse>>,
): UseQueryResult<CategoryListResponse> {
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
    promise: Promise.resolve({ categories: [] }),
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
  } as UseQueryResult<CategoryListResponse>;
}

function createCountryQueryResult(
  overrides: Partial<UseQueryResult<CountryListResponse>>,
): UseQueryResult<CountryListResponse> {
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
    promise: Promise.resolve({ countries: [] }),
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
  } as UseQueryResult<CountryListResponse>;
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
    mockUseDeleteTemplate.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
    mockUseCategories.mockReturnValue(
      createCategoryQueryResult({
        data: { categories: mockCategories },
      }),
    );
    mockUseCountries.mockReturnValue(
      createCountryQueryResult({
        data: { countries: mockCountriesList },
      }),
    );
  });

  it('shows 6 skeleton cards while fetching', () => {
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
    const skeletonCards = screen.getAllByTestId('skeleton-card');
    expect(skeletonCards).toHaveLength(6);
  });

  it('shows skeleton cards in a grid layout while loading', () => {
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
    const grid = screen.getByTestId('skeleton-grid');
    expect(grid).toBeInTheDocument();
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

  it('empty state shows subtext', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByText('Create your first template to get started.')).toBeInTheDocument();
  });

  it('empty state has "Create template" button', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: 'Create template' })).toBeInTheDocument();
  });

  it('empty state CTA opens create dialog', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'Create template' }));
    expect(screen.getByTestId('create-template-dialog')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "Clear filters" button when filters active with no results', async () => {
    const user = userEvent.setup();

    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'Employment' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    });
  });

  it('"Clear filters" button resets all filters', async () => {
    const user = userEvent.setup();

    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'Employment' }));

    await waitFor(async () => {
      const clearBtn = screen.getByRole('button', { name: 'Clear filters' });
      await user.click(clearBtn);
    });

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual({ sort: 'updated' });
    });
  });

  it('shows "No templates yet" when truly empty with no filters', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByText('No templates yet')).toBeInTheDocument();
    expect(screen.queryByText('No templates match your filters')).not.toBeInTheDocument();
  });

  it('renders template cards (not rows) with correct data-testids', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('template-card-t1')).toBeInTheDocument();
    expect(screen.getByTestId('template-card-t2')).toBeInTheDocument();
    expect(screen.getByTestId('template-card-t3')).toBeInTheDocument();

    // Old row testids should NOT exist
    expect(screen.queryByTestId('template-row-t1')).not.toBeInTheDocument();
  });

  it('each card shows title', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const card1 = screen.getByTestId('template-card-t1');
    expect(within(card1).getByText('Employment Agreement')).toBeInTheDocument();

    const card2 = screen.getByTestId('template-card-t2');
    expect(within(card2).getByText('Mutual NDA')).toBeInTheDocument();

    const card3 = screen.getByTestId('template-card-t3');
    expect(within(card3).getByText('Offer Letter')).toBeInTheDocument();
  });

  it('cards show version info', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const card1 = screen.getByTestId('template-card-t1');
    expect(within(card1).getByText('v2')).toBeInTheDocument();
  });

  it('renders card grid container', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const grid = screen.getByTestId('card-grid');
    expect(grid).toBeInTheDocument();
    // MUI sx applies display: grid via CSS classes
    expect(grid.className).toBeTruthy();
  });

  it('renders search input with placeholder', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    const searchInput = screen.getByPlaceholderText('Search templates...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders "New template" button', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
  });

  it('"New template" button opens create dialog', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: /new template/i }));
    expect(screen.getByTestId('create-template-dialog')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/templates/new');
  });

  it('closes create dialog when onClose is called', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: /new template/i }));
    expect(screen.getByTestId('create-template-dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('create-template-dialog')).not.toBeInTheDocument();
  });

  it('does not render status filter chips (removed)', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    // Category "All" button should be present
    const allButtons = screen.getAllByRole('button', { name: 'All' });
    expect(allButtons.length).toBeGreaterThanOrEqual(1);
    // Status filter chips should no longer exist
    expect(screen.queryByRole('button', { name: 'Draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Active' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archived' })).not.toBeInTheDocument();
  });

  it('navigates to template detail when card is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    const card = screen.getByTestId('template-card-t1');
    await user.click(card);
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

    const searchField = screen.getByPlaceholderText('Search templates...');
    await user.type(searchField, 'employment');

    // Before debounce fires, useTemplates should have been called
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

  describe('relative timestamps', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders relative timestamp for updatedAt', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));

      mockUseTemplates.mockReturnValue(
        createQueryResult({
          data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
        }),
      );

      render(<TemplateListPage />, { wrapper: Wrapper });

      const card1 = screen.getByTestId('template-card-t1');
      // updatedAt is 2026-03-01, current date is 2026-03-06 => 5d ago
      expect(within(card1).getByText('5d ago')).toBeInTheDocument();
    });
  });

  it('renders sort button with "Recently edited" text', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /recently edited/i })).toBeInTheDocument();
  });

  it('opens sort dropdown and changes sort order', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Click the sort button to open dropdown
    await user.click(screen.getByRole('button', { name: /recently edited/i }));

    // Click "Alphabetical" option
    const alphaOption = await screen.findByRole('menuitem', { name: /alphabetical/i });
    await user.click(alphaOption);

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ sort: 'name' }));
    });
  });

  it('closes sort dropdown when pressing Escape', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: /recently edited/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('renders sticky filter bar', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const filterBar = screen.getByTestId('filter-bar');
    expect(filterBar).toBeInTheDocument();
    expect(filterBar.className).toBeTruthy();
  });

  it('renders category filter chips from API', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Category chips from useCategories API hook
    expect(screen.getByRole('button', { name: 'Employment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NDA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compliance' })).toBeInTheDocument();
  });

  it('filters by category when category chip is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'Employment' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ category: 'Employment' }));
    });
  });

  it('navigates to template on Enter keydown', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const card = screen.getByTestId('template-card-t1');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
  });

  it('does not navigate on non-Enter keydown', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const card = screen.getByTestId('template-card-t1');
    fireEvent.keyDown(card, { key: 'Space' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('content area has max-width 1120px', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const container = screen.getByTestId('template-list-container');
    expect(container).toBeInTheDocument();
    // MUI sx applies maxWidth via CSS classes
    expect(container.className).toBeTruthy();
  });

  it('card metadata shows category as uppercase text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));

    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const card1 = screen.getByTestId('template-card-t1');
    // Category is displayed as uppercase text
    expect(within(card1).getByText('Employment')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('"All" category chip is shown and active by default', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const allCategoryChip = screen.getByTestId('category-chip-all');
    expect(allCategoryChip).toBeInTheDocument();
    // "All" category chip should appear as a button
    expect(allCategoryChip).toHaveAttribute('role', 'button');
  });

  it('clicking a category chip filters templates by category', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'NDA' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ category: 'NDA' }));
    });
  });

  it('clicking "All" category chip clears category filter', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // First select a category
    await user.click(screen.getByRole('button', { name: 'Employment' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ category: 'Employment' }));
    });

    // Then click "All" to clear the category filter
    await user.click(screen.getByTestId('category-chip-all'));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).not.toHaveProperty('category');
    });
  });

  it('categories from API with no matching templates still show as chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // 'Compliance' has no templates but should still appear as a filter chip
    expect(screen.getByRole('button', { name: 'Compliance' })).toBeInTheDocument();
  });

  it('visual divider separates category chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const divider = screen.getByTestId('category-divider');
    expect(divider).toBeInTheDocument();
  });

  it('renders country filter chips from API', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: 'Argentina' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'United Kingdom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'United States' })).toBeInTheDocument();
  });

  it('filters by country when country chip is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole('button', { name: 'Argentina' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ country: 'AR' }));
    });
  });

  it('"Clear filters" resets country filter', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Click a country to activate filter
    await user.click(screen.getByRole('button', { name: 'Argentina' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).not.toHaveProperty('country');
    });
  });

  it('clicking "All" country chip clears country filter', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // First select a country
    await user.click(screen.getByRole('button', { name: 'Argentina' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ country: 'AR' }));
    });

    // Then click "All" country chip to clear
    await user.click(screen.getByTestId('country-chip-all'));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).not.toHaveProperty('country');
    });
  });

  it('clicking active country chip toggles it off', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Click Argentina to activate
    await user.click(screen.getByRole('button', { name: 'Argentina' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ country: 'AR' }));
    });

    // Click Argentina again to deactivate
    await user.click(screen.getByRole('button', { name: 'Argentina' }));

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).not.toHaveProperty('country');
    });
  });

  it('country divider separates category and country chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const divider = screen.getByTestId('country-divider');
    expect(divider).toBeInTheDocument();
  });

  describe('Delete template flow', () => {
    beforeEach(() => {
      mockUseTemplates.mockReturnValue(
        createQueryResult({
          data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
        }),
      );
    });

    it('opens delete dialog when Delete is clicked from card menu', async () => {
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      // Click "Delete" in the context menu
      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // Delete confirmation dialog should appear
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Employment Agreement?')).toBeInTheDocument();
    });

    it('closes delete dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Click Cancel to close
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('calls deleteMutation.mutate when delete is confirmed', async () => {
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      expect(mockDeleteMutate).toHaveBeenCalledWith('t1', expect.anything());
    });

    it('closes delete dialog on successful deletion', async () => {
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('uses template title as fallback when template not found in list', async () => {
      // Use a modified templates array where the template to delete is t2
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      const card2 = screen.getByTestId('template-card-t2');
      const menuButton = within(card2).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // The dialog should show the title of t2
      expect(screen.getByText('Delete Mutual NDA?')).toBeInTheDocument();
    });

    it('closes delete dialog via Escape key (exercises onClose callback)', async () => {
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Press Escape to close via MUI Dialog onClose handler
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('does not call mutate when deleteTarget is null (onConfirm guard)', async () => {
      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // Confirm deletion — this should call mutate with 't1'
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Verify mutate was called exactly once with the correct ID
      expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          onSuccess: expect.any(Function) as unknown,
        }),
      );
    });

    it('resets deleteTarget to null on successful deletion via onSuccess', async () => {
      // Mock mutate to invoke the onSuccess callback
      mockDeleteMutate.mockImplementation((_id: string, opts: { onSuccess: () => void }) => {
        opts.onSuccess();
      });

      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      // Confirm deletion — onSuccess fires synchronously, closing the dialog
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Dialog should be closed because onSuccess set deleteTarget to null
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      // Verify the template title is cleared (dialog shows empty title when re-opened)
      expect(mockDeleteMutate).toHaveBeenCalledWith('t1', expect.anything());
    });

    it('shows isDeleting state when delete mutation is pending', async () => {
      mockUseDeleteTemplate.mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: true,
      });

      const user = userEvent.setup();
      render(<TemplateListPage />, { wrapper: Wrapper });

      // Open the card's action menu and trigger delete
      const card1 = screen.getByTestId('template-card-t1');
      const menuButton = within(card1).getByRole('button', { name: /template actions/i });
      await user.click(menuButton);

      const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      // The delete button should be disabled when isPending is true.
      // When isPending, the button text is replaced by a spinner, so we
      // locate it via the alertdialog's buttons (Cancel + confirm).
      const dialog = screen.getByRole('alertdialog');
      const dialogButtons = within(dialog).getAllByRole('button');
      const confirmButton = dialogButtons.find((btn) => btn.textContent !== 'Cancel');
      expect(confirmButton).toBeDefined();
      expect(confirmButton).toBeDisabled();
    });
  });
});
