/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { ReactNode } from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { mockCategoriesData, mockCountriesData } = vi.hoisted(() => ({
  mockCategoriesData: vi.fn(),
  mockCountriesData: vi.fn(),
}));

vi.mock('../../src/hooks/useCategories.js', () => ({
  useCategories: () => mockCategoriesData() as unknown,
}));

vi.mock('../../src/hooks/useCountries.js', () => ({
  useCountries: () => mockCountriesData() as unknown,
}));

const { DocumentHeader } = await import('../../src/components/DocumentHeader.js');

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

const defaultCategories = {
  data: {
    categories: [
      { id: 'c1', name: 'Employment', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'c2', name: 'Compliance', createdAt: '2026-01-02T00:00:00Z' },
    ],
  },
  isLoading: false,
  isError: false,
  isSuccess: true,
};

const defaultCountries = {
  data: {
    countries: [
      { id: 'co1', name: 'United States', code: 'US', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'co2', name: 'United Kingdom', code: 'GB', createdAt: '2026-01-02T00:00:00Z' },
    ],
  },
  isLoading: false,
  isError: false,
  isSuccess: true,
};

interface RenderProps {
  title?: string;
  onTitleChange?: (title: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  country?: string;
  onCountryChange?: (country: string) => void;
  editorMode?: 'source' | 'review';
  onModeChange?: (mode: 'source' | 'review') => void;
  templateId?: string | undefined;
  isCreateMode?: boolean;
  readOnly?: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  createdBy?: string | undefined;
  currentVersion?: number | undefined;
  rightSlot?: ReactNode;
  onDelete?: (() => void) | undefined;
}

function renderHeader(props: RenderProps = {}) {
  const defaultProps = {
    title: 'Employment Agreement',
    onTitleChange: vi.fn(),
    category: 'Employment',
    onCategoryChange: vi.fn(),
    country: 'US',
    onCountryChange: vi.fn(),
    editorMode: 'source' as const,
    onModeChange: vi.fn(),
    templateId: 't1',
    isCreateMode: false,
    readOnly: false,
    ...props,
  };
  return render(
    <Wrapper>
      <DocumentHeader {...defaultProps} />
    </Wrapper>,
  );
}

describe('DocumentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCategoriesData.mockReturnValue(defaultCategories);
    mockCountriesData.mockReturnValue(defaultCountries);
  });

  // Back button
  it('renders back button that navigates to /templates', async () => {
    const user = userEvent.setup();
    renderHeader();
    const backButton = screen.getByRole('button', { name: 'Back to templates' });
    expect(backButton).toBeInTheDocument();
    await user.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/templates');
  });

  // Title input
  it('renders editable title input', () => {
    renderHeader({ title: 'My Template' });
    const titleInput = screen.getByRole('textbox', { name: 'Template title' });
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('My Template');
  });

  it('calls onTitleChange when title is edited', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    renderHeader({ title: '', onTitleChange });
    const titleInput = screen.getByRole('textbox', { name: 'Template title' });
    await user.type(titleInput, 'New Title');
    expect(onTitleChange).toHaveBeenCalled();
  });

  it('title input shows placeholder "Untitled"', () => {
    renderHeader({ title: '' });
    const titleInput = screen.getByRole('textbox', { name: 'Template title' });
    expect(titleInput).toHaveAttribute('placeholder', 'Untitled');
  });

  // Category dropdown
  it('renders category select with correct label', () => {
    renderHeader({ category: 'Employment' });
    const categorySelect = screen.getByLabelText('Template category');
    expect(categorySelect).toBeInTheDocument();
  });

  it('renders category select placeholder when empty', () => {
    renderHeader({ category: '' });
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  // Country dropdown
  it('renders country select with correct label', () => {
    renderHeader({ country: 'US' });
    const countrySelect = screen.getByLabelText('Template country');
    expect(countrySelect).toBeInTheDocument();
  });

  it('renders country select placeholder when empty', () => {
    renderHeader({ country: '' });
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  // Status chip removed — no longer part of DocumentHeader
  it('does not render a status chip', () => {
    renderHeader();
    expect(screen.queryByTestId('status-chip')).not.toBeInTheDocument();
  });

  // Mode toggle
  it('renders Source and Review mode toggle', () => {
    renderHeader({ editorMode: 'source' });
    expect(screen.getByRole('radio', { name: 'Source' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Review' })).toBeInTheDocument();
  });

  it('mode toggle switches between Source and Review', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderHeader({ editorMode: 'source', onModeChange });
    await user.click(screen.getByRole('radio', { name: 'Review' }));
    expect(onModeChange).toHaveBeenCalledWith('review');
  });

  it('active mode segment is marked as checked', () => {
    renderHeader({ editorMode: 'source' });
    expect(screen.getByRole('radio', { name: 'Source' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Review' })).toHaveAttribute('aria-checked', 'false');
  });

  // No publish/archive/unarchive buttons (removed in soft-delete refactor)
  it('does not render Publish, Archive, or Unarchive buttons', () => {
    renderHeader();
    expect(screen.queryByRole('button', { name: 'Publish template' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive template' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unarchive template' })).not.toBeInTheDocument();
  });

  // More button / MetadataPopover
  it('"..." popover opens and shows dates/created-by info', async () => {
    const user = userEvent.setup();
    renderHeader({
      createdAt: '2026-03-03T00:00:00Z',
      updatedAt: '2026-03-07T10:00:00Z',
      createdBy: 'Joseph Marsico',
      currentVersion: 12,
    });
    const moreButton = screen.getByRole('button', { name: 'Template details' });
    expect(moreButton).toBeInTheDocument();
    await user.click(moreButton);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText(/Joseph Marsico/)).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('v12')).toBeInTheDocument();
  });

  // History button
  it('history button navigates to /templates/:id/history', async () => {
    const user = userEvent.setup();
    renderHeader({ templateId: 't1' });
    const historyButton = screen.getByRole('button', { name: 'Version history' });
    expect(historyButton).toBeInTheDocument();
    await user.click(historyButton);
    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1/history');
  });

  // Create mode
  it('create mode: no status chip', () => {
    renderHeader({ isCreateMode: true });
    expect(screen.queryByTestId('status-chip')).not.toBeInTheDocument();
  });

  it('create mode: no history button', () => {
    renderHeader({ isCreateMode: true });
    expect(screen.queryByRole('button', { name: 'Version history' })).not.toBeInTheDocument();
  });

  it('create mode: no more button', () => {
    renderHeader({ isCreateMode: true });
    expect(screen.queryByRole('button', { name: 'Template details' })).not.toBeInTheDocument();
  });

  it('create mode: no mode toggle', () => {
    renderHeader({ isCreateMode: true });
    expect(screen.queryByRole('radio', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Review' })).not.toBeInTheDocument();
  });

  it('create mode: does not render Save Draft button', () => {
    renderHeader({ isCreateMode: true });
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  });

  // Viewer role
  it('viewer role: title is read-only', () => {
    renderHeader({ readOnly: true });
    const titleInput = screen.getByRole('textbox', { name: 'Template title' });
    expect(titleInput).toHaveAttribute('readOnly');
  });

  it('viewer role: no action buttons', () => {
    renderHeader({ readOnly: true });
    expect(screen.queryByRole('button', { name: 'Publish template' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive template' })).not.toBeInTheDocument();
  });

  // rightSlot
  it('renders rightSlot content', () => {
    renderHeader({
      rightSlot: <span data-testid="right-slot-content">Connection</span>,
    });
    expect(screen.getByTestId('right-slot-content')).toBeInTheDocument();
  });

  // Delete button in popover
  it('shows Delete template button in popover when onDelete provided', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Delete template')).toBeInTheDocument();
  });

  it('calls onDelete when Delete template is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    await user.click(screen.getByText('Delete template'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('does not show Delete template when onDelete not provided', async () => {
    const user = userEvent.setup();
    renderHeader({ onDelete: undefined });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.queryByText('Delete template')).not.toBeInTheDocument();
  });

  // Mode toggle: click Source (covers onModeChange('source') branch)
  it('clicking Source mode calls onModeChange with source', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderHeader({ editorMode: 'review', onModeChange });
    await user.click(screen.getByRole('radio', { name: 'Source' }));
    expect(onModeChange).toHaveBeenCalledWith('source');
  });

  // Popover without optional metadata fields
  it('popover hides created section when createdAt is not provided', async () => {
    const user = userEvent.setup();
    renderHeader({ createdAt: undefined, updatedAt: undefined, currentVersion: undefined });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    expect(screen.queryByText('Version')).not.toBeInTheDocument();
  });

  it('popover shows version when provided', async () => {
    const user = userEvent.setup();
    renderHeader({ currentVersion: 3 });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
  });

  it('popover shows modified time', async () => {
    const user = userEvent.setup();
    renderHeader({ updatedAt: '2026-03-07T00:00:00Z' });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('popover hides createdBy when not provided', async () => {
    const user = userEvent.setup();
    renderHeader({ createdAt: '2026-01-01T00:00:00Z', createdBy: undefined });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
  });

  // History button not rendered without templateId
  it('history button not shown without templateId', () => {
    renderHeader({ templateId: undefined });
    expect(screen.queryByRole('button', { name: 'Version history' })).not.toBeInTheDocument();
  });

  // Renders without rightSlot
  it('does not render rightSlot area when not provided', () => {
    renderHeader();
    // No specific right slot content
    expect(screen.queryByTestId('right-slot-content')).not.toBeInTheDocument();
  });

  // Review mode style
  it('review mode marks Review radio as checked', () => {
    renderHeader({ editorMode: 'review' });
    const reviewRadio = screen.getByRole('radio', { name: 'Review' });
    expect(reviewRadio).toHaveAttribute('aria-checked', 'true');
    const sourceRadio = screen.getByRole('radio', { name: 'Source' });
    expect(sourceRadio).toHaveAttribute('aria-checked', 'false');
  });

  // formatRelativeTime branches via popover with updatedAt
  it('shows "just now" for very recent updates', async () => {
    const user = userEvent.setup();
    renderHeader({ updatedAt: new Date().toISOString() });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('shows minutes ago for recent updates', async () => {
    const user = userEvent.setup();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    renderHeader({ updatedAt: fiveMinAgo });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('shows hours ago for updates within a day', async () => {
    const user = userEvent.setup();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    renderHeader({ updatedAt: threeHoursAgo });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('shows days ago for updates within a week', async () => {
    const user = userEvent.setup();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    renderHeader({ updatedAt: twoDaysAgo });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });

  it('shows formatted date for updates older than a week', async () => {
    const user = userEvent.setup();
    renderHeader({ updatedAt: '2025-01-15T00:00:00Z' });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
  });

  // Category renderValue branch: non-empty shows the value
  it('category select shows value when category is set', () => {
    renderHeader({ category: 'Employment' });
    // The Select renderValue should show the category name
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  // Country renderValue branch: non-empty shows the value
  it('country select shows value when country is set', () => {
    renderHeader({ country: 'US' });
    expect(screen.queryByText('Country')).not.toBeInTheDocument();
  });

  // Country select displays country name for code value
  it('country select displays country name for code value', () => {
    renderHeader({ country: 'US' });
    expect(screen.getByText('United States')).toBeInTheDocument();
  });

  // Country select sends code via onCountryChange
  it('onCountryChange receives country code when selected', () => {
    const onCountryChange = vi.fn();
    renderHeader({ country: '', onCountryChange });
    // MUI Select: the clickable trigger has role="combobox"
    const comboboxes = screen.getAllByRole('combobox');
    // Country select is the second combobox (after category)
    expect(comboboxes).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length asserted above
    fireEvent.mouseDown(comboboxes[1]!);
    const listbox = within(screen.getByRole('listbox'));
    const option = listbox.getByText('United States');
    fireEvent.click(option);
    expect(onCountryChange).toHaveBeenCalledWith('US');
  });

  // Title input editable affordance (hover/focus border styles)
  it('title input has transparent bottom border with hover and focus styles', () => {
    renderHeader({ title: 'My Template' });
    const titleInput = screen.getByRole('textbox', { name: 'Template title' });
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveStyle({ border: 'none' });
  });

  // Delete option in popover
  it('shows Delete template option in popover when onDelete is provided', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.getByText('Delete template')).toBeInTheDocument();
  });

  it('calls onDelete when Delete template is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    await user.click(screen.getByText('Delete template'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not show Delete template option when onDelete is not provided', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.queryByText('Delete template')).not.toBeInTheDocument();
  });

  it('does not show Delete template option when readOnly', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ readOnly: true, onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    expect(screen.queryByText('Delete template')).not.toBeInTheDocument();
  });

  // Delete template via keyboard (Enter key on delete button in popover)
  it('calls onDelete when Enter is pressed on Delete template button', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    const deleteButton = screen.getByRole('button', { name: 'Delete template' });
    fireEvent.keyDown(deleteButton, { key: 'Enter' });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call onDelete when non-Enter key is pressed on Delete template button', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderHeader({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Template details' }));
    const deleteButton = screen.getByRole('button', { name: 'Delete template' });
    fireEvent.keyDown(deleteButton, { key: 'Space' });
    expect(onDelete).not.toHaveBeenCalled();
  });

  // Country select: code not matching any country falls back to raw code value
  it('country select shows raw code when no matching country found', () => {
    mockCountriesData.mockReturnValue({
      data: { countries: [] },
      isLoading: false,
      isError: false,
      isSuccess: true,
    });
    renderHeader({ country: 'ZZ' });
    expect(screen.getByText('ZZ')).toBeInTheDocument();
  });
});
