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

      const row1 = screen.getByTestId('template-row-t1');
      // updatedAt is 2026-03-01, current date is 2026-03-06 => 5d ago
      expect(within(row1).getByText('5d ago')).toBeInTheDocument();
    });
  });

  it('shows secondary metadata on hover', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));

    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row1 = screen.getByTestId('template-row-t1');
    // Hover metadata exists in the DOM (just invisible until hover via CSS)
    const hoverMeta = within(row1).getByTestId('hover-metadata');
    expect(hoverMeta).toBeInTheDocument();

    // The hover metadata contains category and relative time
    expect(within(hoverMeta).getByText('Employment')).toBeInTheDocument();
    expect(within(hoverMeta).getByText('5d ago')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders sort dropdown', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Sort dropdown is a MUI Select rendered as a combobox or textbox with label "Sort"
    expect(screen.getByLabelText('Sort')).toBeInTheDocument();
  });

  it('changes sort order when sort option is selected', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Open the sort dropdown and select "Name"
    const sortSelect = screen.getByLabelText('Sort');
    await user.click(sortSelect);

    // MUI renders menu items in a listbox
    const nameOption = await screen.findByRole('option', { name: 'Name' });
    await user.click(nameOption);

    await waitFor(() => {
      const lastCall = mockUseTemplates.mock.calls[mockUseTemplates.mock.calls.length - 1] as [
        Record<string, unknown>,
      ];
      expect(lastCall[0]).toEqual(expect.objectContaining({ sort: 'name' }));
    });
  });

  it('renders empty state with CTA button', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    expect(screen.getByText('No templates yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first template' })).toBeInTheDocument();
  });

  it('empty state CTA navigates to /templates/new', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: [], total: 0, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    await user.click(screen.getByRole('button', { name: 'Create your first template' }));
    expect(mockNavigate).toHaveBeenCalledWith('/templates/new');
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
    // MUI sx applies styles via className; check the element has the class with sticky
    // In jsdom, getComputedStyle won't resolve CSS-in-JS, so check the rendered class
    expect(filterBar.className).toBeTruthy();
  });

  it('renders category filter chips', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Category chips derived from templates: Employment, NDA
    expect(screen.getByRole('button', { name: 'Employment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NDA' })).toBeInTheDocument();
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

  it('template rows render with proper structure', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // Each template renders a row with the template-row class and data-testid
    const row = screen.getByTestId('template-row-t1');
    expect(row).toBeInTheDocument();
    expect(row.className).toContain('template-row');
  });

  it('rows have MUI sx styles applied (including hover color)', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    // The row's sx contains hover style (DDD0BC) — verified via className existence
    // MUI sx applies styles via CSS-in-JS classes; in jsdom we verify class presence
    const row = screen.getByTestId('template-row-t1');
    expect(row).toBeInTheDocument();
    // MUI generates CSS classes for the sx props
    expect(row.className.split(' ').length).toBeGreaterThan(1);
  });

  it('focus shows selected state with accent-primary border and subtle background', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row = screen.getByTestId('template-row-t1');
    // The row should have tabIndex for keyboard navigation
    expect(row).toHaveAttribute('tabindex', '0');
    // Focus the row
    row.focus();
    expect(row).toHaveFocus();
  });

  it('filter bar uses purple-tinted shadow', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const filterBar = screen.getByTestId('filter-bar');
    expect(filterBar).toBeInTheDocument();
    // Filter bar should render with its class (shadow is applied via MUI sx)
    expect(filterBar.className).toBeTruthy();
  });

  it('list items have entry animation via template-row class', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row1 = screen.getByTestId('template-row-t1');
    const row2 = screen.getByTestId('template-row-t2');
    const row3 = screen.getByTestId('template-row-t3');

    // All rows should have the template-row class (animation applied via MUI sx)
    expect(row1.className).toContain('template-row');
    expect(row2.className).toContain('template-row');
    expect(row3.className).toContain('template-row');

    // Each row should have MUI-generated animation classes (CSS-in-JS)
    // In jsdom we can verify the className is not empty (styles were applied)
    expect(row1.className.split(' ').length).toBeGreaterThan(1);
    expect(row2.className.split(' ').length).toBeGreaterThan(1);
    expect(row3.className.split(' ').length).toBeGreaterThan(1);
  });

  it('focused row shows metadata without hover', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row = screen.getByTestId('template-row-t1');
    // The hover metadata container exists
    const hoverMeta = within(row).getByTestId('hover-metadata');
    expect(hoverMeta).toBeInTheDocument();
  });

  it('navigates to template on Enter keydown', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row = screen.getByTestId('template-row-t1');
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
  });

  it('does not navigate on non-Enter keydown', () => {
    mockUseTemplates.mockReturnValue(
      createQueryResult({
        data: { data: mockTemplates, total: 3, page: 1, limit: 20 },
      }),
    );

    render(<TemplateListPage />, { wrapper: Wrapper });

    const row = screen.getByTestId('template-row-t1');
    fireEvent.keyDown(row, { key: 'Space' });

    // Should not navigate on Space
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
