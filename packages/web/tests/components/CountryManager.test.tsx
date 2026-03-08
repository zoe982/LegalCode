/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { Country } from '@legalcode/shared';

// --- Mocks ---

const mockUseCountries = vi.fn();
const mockCreateCountry = vi.fn();
let mockCreateCountryPending = false;
const mockUpdateCountry = vi.fn();
let mockUpdateCountryPending = false;
const mockDeleteCountry = vi.fn();
let mockDeleteCountryPending = false;

vi.mock('../../src/hooks/useCountries.js', () => ({
  useCountries: (...args: unknown[]) => mockUseCountries(...args) as unknown,
  useCreateCountry: () => ({
    mutate: mockCreateCountry,
    isPending: mockCreateCountryPending,
  }),
  useUpdateCountry: () => ({
    mutate: mockUpdateCountry,
    isPending: mockUpdateCountryPending,
  }),
  useDeleteCountry: () => ({
    mutate: mockDeleteCountry,
    isPending: mockDeleteCountryPending,
  }),
}));

const { CountryManager } = await import('../../src/components/CountryManager.js');

// --- Test Data ---

const country1: Country = {
  id: 'ctry-1',
  name: 'United States',
  code: 'US',
  createdAt: '2026-01-01T00:00:00Z',
};

const country2: Country = {
  id: 'ctry-2',
  name: 'United Kingdom',
  code: 'UK',
  createdAt: '2026-02-01T00:00:00Z',
};

const allCountries: Country[] = [country1, country2];

// --- Helpers ---

function renderManager() {
  return render(
    <ThemeProvider theme={theme}>
      <CountryManager />
    </ThemeProvider>,
  );
}

function setupPopulated() {
  mockUseCountries.mockReturnValue({
    data: { countries: allCountries },
    isLoading: false,
    error: null,
  });
}

describe('CountryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCountryPending = false;
    mockUpdateCountryPending = false;
    mockDeleteCountryPending = false;

    mockUseCountries.mockReturnValue({
      data: { countries: [] },
      isLoading: false,
      error: null,
    });
  });

  // =====================
  // Loading state
  // =====================

  it('shows loading indicator when countries are loading', () => {
    mockUseCountries.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderManager();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-busy on loading container', () => {
    mockUseCountries.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderManager();
    const loadingContainer = screen.getByRole('progressbar').closest('[aria-busy]');
    expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
  });

  // =====================
  // Error state
  // =====================

  it('shows error alert when countries fail to load', () => {
    mockUseCountries.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch countries'),
    });
    renderManager();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch countries');
  });

  // =====================
  // Empty state
  // =====================

  it('shows empty state when no countries exist', () => {
    renderManager();
    expect(screen.getByText('No countries yet')).toBeInTheDocument();
    expect(screen.getByText('Add a country above to get started.')).toBeInTheDocument();
  });

  // =====================
  // Populated state
  // =====================

  it('renders country table with name, code, and actions columns', () => {
    setupPopulated();
    renderManager();
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Code');
    expect(headers[2]).toHaveTextContent('Actions');
  });

  it('renders country names and codes in the table', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('UK')).toBeInTheDocument();
  });

  // =====================
  // Add Country form
  // =====================

  it('renders add country form with name, code fields and button', () => {
    renderManager();
    const form = screen.getByLabelText('Add country form');
    expect(within(form).getByLabelText(/country name/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/country code/i)).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('disables Add button when name is empty', () => {
    renderManager();
    const form = screen.getByLabelText('Add country form');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it('disables Add button when code is empty', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add country form');
    await user.type(within(form).getByLabelText(/country name/i), 'France');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add button when both name and code are filled', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add country form');
    await user.type(within(form).getByLabelText(/country name/i), 'France');
    await user.type(within(form).getByLabelText(/country code/i), 'FR');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeEnabled();
  });

  it('calls createCountry mutation on form submit', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add country form');
    await user.type(within(form).getByLabelText(/country name/i), 'France');
    await user.type(within(form).getByLabelText(/country code/i), 'FR');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(mockCreateCountry).toHaveBeenCalledWith(
      { name: 'France', code: 'FR' },
      expect.anything(),
    );
  });

  it('clears form after successful creation', async () => {
    const user = userEvent.setup();
    mockCreateCountry.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    renderManager();
    const form = screen.getByLabelText('Add country form');
    await user.type(within(form).getByLabelText(/country name/i), 'France');
    await user.type(within(form).getByLabelText(/country code/i), 'FR');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(within(form).getByLabelText(/country name/i)).toHaveValue('');
    expect(within(form).getByLabelText(/country code/i)).toHaveValue('');
  });

  it('shows error message on creation failure', async () => {
    const user = userEvent.setup();
    mockCreateCountry.mockImplementation(
      (_data: unknown, opts: { onError?: (err: Error) => void }) => {
        opts.onError?.(new Error('Country already exists'));
      },
    );
    renderManager();
    const form = screen.getByLabelText('Add country form');
    await user.type(within(form).getByLabelText(/country name/i), 'Dup');
    await user.type(within(form).getByLabelText(/country code/i), 'DU');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(screen.getByText('Country already exists')).toBeInTheDocument();
  });

  it('shows loading in add button when pending', () => {
    mockCreateCountryPending = true;
    renderManager();
    const form = screen.getByLabelText('Add country form');
    // When pending, button text is replaced by spinner so query by role without name filter
    const buttons = within(form).getAllByRole('button');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test: we know the button exists
    const addButton = buttons[0]!;
    expect(addButton).toBeDisabled();
    expect(addButton.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Edit country
  // =====================

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    expect(screen.getByLabelText(/edit name/i)).toHaveValue('United States');
    expect(screen.getByLabelText(/edit code/i)).toHaveValue('US');
  });

  it('saves edited country', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    const editNameInput = screen.getByLabelText(/edit name/i);
    await user.clear(editNameInput);
    await user.type(editNameInput, 'USA');
    const editCodeInput = screen.getByLabelText(/edit code/i);
    await user.clear(editCodeInput);
    await user.type(editCodeInput, 'USA');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockUpdateCountry).toHaveBeenCalledWith(
      { id: 'ctry-1', name: 'USA', code: 'USA' },
      expect.anything(),
    );
  });

  it('cancels edit mode', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    expect(screen.getByLabelText(/edit name/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
  });

  it('exits edit mode after successful save', async () => {
    const user = userEvent.setup();
    mockUpdateCountry.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
  });

  it('disables save button when edit name is empty', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    const editNameInput = screen.getByLabelText(/edit name/i);
    await user.clear(editNameInput);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('disables save button when edit code is empty', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit United States' }));
    const editCodeInput = screen.getByLabelText(/edit code/i);
    await user.clear(editCodeInput);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  // =====================
  // Delete country with confirmation
  // =====================

  it('opens confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/United States/)).toBeInTheDocument();
    expect(within(dialog).getByText(/US/)).toBeInTheDocument();
  });

  it('calls deleteCountry on confirm', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));
    expect(mockDeleteCountry).toHaveBeenCalledWith('ctry-1', expect.anything());
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog after successful deletion', async () => {
    const user = userEvent.setup();
    mockDeleteCountry.mockImplementation((_id: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog via escape key', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows loading in delete button when pending', async () => {
    const user = userEvent.setup();
    mockDeleteCountryPending = true;
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete United States' }));
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    const deleteBtn = buttons[buttons.length - 1];
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Accessibility
  // =====================

  it('has accessible form label on add country section', () => {
    renderManager();
    expect(screen.getByLabelText('Add country form')).toBeInTheDocument();
  });

  it('renders semantic table elements', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  });

  it('has accessible edit and delete buttons for each country', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('button', { name: 'Edit United States' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete United States' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit United Kingdom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete United Kingdom' })).toBeInTheDocument();
  });
});
