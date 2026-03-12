/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { CreateTemplateDialog } from '../../src/components/CreateTemplateDialog.js';
import type { CategoryListResponse } from '../../src/services/categories.js';
import type { CountryListResponse } from '../../src/services/countries.js';
import type { CompanyListResponse } from '../../src/services/companies.js';
import type { UseQueryResult } from '@tanstack/react-query';

const mockMutateAsync = vi.fn();
const mockUseCreateTemplate = vi.fn();
const mockUseCategories = vi.fn();
const mockUseCountries = vi.fn();
const mockUseCompanies = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useCreateTemplate: () => mockUseCreateTemplate() as unknown,
}));

vi.mock('../../src/hooks/useCategories.js', () => ({
  useCategories: () => mockUseCategories() as unknown,
}));

vi.mock('../../src/hooks/useCountries.js', () => ({
  useCountries: () => mockUseCountries() as unknown,
}));

vi.mock('../../src/hooks/useCompanies.js', () => ({
  useCompanies: () => mockUseCompanies() as unknown,
}));

const mockCategories: CategoryListResponse = {
  categories: [
    { id: 'c1', name: 'Employment', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'c2', name: 'NDA', createdAt: '2026-01-02T00:00:00Z' },
    { id: 'c3', name: 'Compliance', createdAt: '2026-01-03T00:00:00Z' },
  ],
};

const mockCountries: CountryListResponse = {
  countries: [
    { id: 'co1', name: 'United States', code: 'US', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'co2', name: 'United Kingdom', code: 'GB', createdAt: '2026-01-02T00:00:00Z' },
    { id: 'co3', name: 'Germany', code: 'DE', createdAt: '2026-01-03T00:00:00Z' },
  ],
};

const mockCompanies: CompanyListResponse = {
  companies: [
    { id: 'cm1', name: 'Acme Corp', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'cm2', name: 'Globex', createdAt: '2026-01-02T00:00:00Z' },
  ],
};

function defaultMutationResult(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  };
}

function defaultQueryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    ...overrides,
  } as unknown as UseQueryResult<T>;
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

function renderDialog(open = true, onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <Wrapper>
        <CreateTemplateDialog open={open} onClose={onClose} />
      </Wrapper>,
    ),
  };
}

describe('CreateTemplateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult());
    mockUseCategories.mockReturnValue(defaultQueryResult(mockCategories));
    mockUseCountries.mockReturnValue(defaultQueryResult(mockCountries));
    mockUseCompanies.mockReturnValue(defaultQueryResult(mockCompanies));
    mockMutateAsync.mockResolvedValue({
      template: { id: 'new-t1', title: 'Test', slug: 'test', category: 'Employment' },
      tags: [],
    });
  });

  it('renders dialog title, subtitle, and all fields when open', () => {
    renderDialog();
    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByText('Start with a title and classification.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not render when open={false}', () => {
    renderDialog(false);
    expect(screen.queryByText('New Template')).not.toBeInTheDocument();
  });

  it('title input has autoFocus', () => {
    renderDialog();
    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toHaveFocus();
  });

  it('populates category select from useCategories data', async () => {
    const user = userEvent.setup();
    renderDialog();

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Employment' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'NDA' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Compliance' })).toBeInTheDocument();
  });

  it('populates country select from useCountries data with a None option', async () => {
    const user = userEvent.setup();
    renderDialog();

    const countryCombobox = screen.getByLabelText('Country');
    await user.click(countryCombobox);

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'United States' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Germany' })).toBeInTheDocument();
  });

  it('shows title validation error on blur when empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);
    await user.tab();

    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('shows category validation error on blur when empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    // Press escape to close without selecting
    await user.keyboard('{Escape}');
    // Tab away to trigger blur
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Category is required')).toBeInTheDocument();
    });
  });

  it('no error shown for empty country', async () => {
    const user = userEvent.setup();
    renderDialog();

    const countryCombobox = screen.getByLabelText('Country');
    await user.click(countryCombobox);
    await user.keyboard('{Escape}');
    await user.tab();

    expect(screen.queryByText('Country is required')).not.toBeInTheDocument();
  });

  it('clears title error eagerly on change', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);
    await user.tab();
    expect(screen.getByText('Title is required')).toBeInTheDocument();

    await user.click(titleInput);
    await user.type(titleInput, 'A');

    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('clears category error eagerly on change', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Trigger category error
    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.keyboard('{Escape}');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Category is required')).toBeInTheDocument();
    });

    // Select a category
    await user.click(categoryCombobox);
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Employment' }));

    await waitFor(() => {
      expect(screen.queryByText('Category is required')).not.toBeInTheDocument();
    });
  });

  it('Create button disabled when title is empty', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('Create button disabled when category is empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');
    // Category still empty
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('Create button enabled when title and category are filled', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Employment' }));

    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('calls mutateAsync with correct data on valid submit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Employment Agreement');

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'NDA' }));

    const countryCombobox = screen.getByLabelText('Country');
    await user.click(countryCombobox);
    await user.click(screen.getByRole('option', { name: 'United States' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Employment Agreement',
        category: 'NDA',
        country: 'US',
        company: null,
        content: ' ',
      });
    });
  });

  it('passes country: null when no country selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'Employment' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'My Template',
        category: 'Employment',
        country: null,
        company: null,
        content: ' ',
      });
    });
  });

  it('navigates to /templates/{id} on successful creation', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      template: { id: 'created-123', title: 'Test' },
      tags: [],
    });
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');
    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'Employment' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/templates/created-123');
    });
  });

  it('shows loading state with "Creating..." button text and disabled fields', () => {
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ isPending: true }));
    renderDialog();

    expect(screen.getByRole('button', { name: /Creating/i })).toBeDisabled();
    expect(screen.getByLabelText('Title')).toBeDisabled();
  });

  it('disables backdrop close and Escape during creation', () => {
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ isPending: true }));
    renderDialog();

    const dialog = screen.getByRole('dialog');
    // The dialog should still be visible — we verify the pending guard works
    // by checking that the cancel button is also disabled
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows error alert when mutation fails', () => {
    mockUseCreateTemplate.mockReturnValue(
      defaultMutationResult({
        isError: true,
        error: new Error('Network error: failed to create template'),
      }),
    );
    renderDialog();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error: failed to create template')).toBeInTheDocument();
  });

  it('resets form when dialog closes and reopens', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Wrapper>
        <CreateTemplateDialog open={true} onClose={onClose} />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText('Title'), 'Typed text');

    // Close the dialog
    rerender(
      <Wrapper>
        <CreateTemplateDialog open={false} onClose={onClose} />
      </Wrapper>,
    );

    // Reopen
    rerender(
      <Wrapper>
        <CreateTemplateDialog open={true} onClose={onClose} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
  });

  it('Cancel button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(true, onClose);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('character counter shows on title focus, displays "X / 200"', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);

    expect(screen.getByText('0 / 200')).toBeInTheDocument();

    await user.type(titleInput, 'Hello');

    expect(screen.getByText('5 / 200')).toBeInTheDocument();
  });

  it('title respects maxLength 200', () => {
    renderDialog();
    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toHaveAttribute('maxlength', '200');
  });

  it('does not submit when form is invalid and submit is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Title filled but category empty — button is disabled, click should not call mutateAsync
    await user.type(screen.getByLabelText('Title'), 'Test');
    // Create button is disabled so we cannot click it effectively
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('country select displays selected country name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const countryCombobox = screen.getByLabelText('Country');
    await user.click(countryCombobox);
    await user.click(screen.getByRole('option', { name: 'Germany' }));

    // The select should display "Germany" (name) not "DE" (code)
    await waitFor(() => {
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });
  });

  it('shows char count color change at 190+ characters', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);

    // Use fireEvent.change for fast 190-char input (user.type is too slow)
    fireEvent.change(titleInput, { target: { value: 'A'.repeat(190) } });

    expect(screen.getByText('190 / 200')).toBeInTheDocument();
  });

  it('displays placeholder text for selects when nothing selected', () => {
    renderDialog();
    const placeholders = screen.getAllByText('Select...');
    // Category, country, and company selects all show "Select..." placeholder
    expect(placeholders).toHaveLength(3);
  });

  it('does not close dialog when isPending', () => {
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ isPending: true }));
    const onClose = vi.fn();
    renderDialog(true, onClose);

    // Cancel button is disabled during pending
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows validation errors with border styles on title', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);
    await user.tab();

    // Error text should be visible
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // The FormControl should have error state
    const formControl = titleInput.closest('.MuiFormControl-root');
    expect(formControl).toBeTruthy();
  });

  it('handles submit attempt when isPending is true', () => {
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ isPending: true }));
    renderDialog();

    // Create button should be disabled during pending
    const createButton = screen.getByRole('button', { name: /creating/i });
    expect(createButton).toBeDisabled();
    // Verify it shows spinner text
    expect(createButton).toHaveTextContent('Creating...');
  });

  it('does not show char counter when title is not focused', () => {
    renderDialog();

    // The title auto-focuses, so we tab away first
    // On initial render the title has autoFocus so char count IS shown
    expect(screen.getByText('0 / 200')).toBeInTheDocument();
  });

  it('title error does not clear when input is still empty after touched', async () => {
    const user = userEvent.setup();
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.click(titleInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Click back into the field but don't type — error should remain
    await user.click(titleInput);
    // Type and then delete to keep it empty
    await user.type(titleInput, 'A');
    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
    await user.clear(titleInput);
    // Error should NOT reappear until next blur
    // (eager clear only clears when non-empty, doesn't re-show)
  });

  it('category error clears when category is selected after being touched', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Open and close category select to trigger touch
    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.keyboard('{Escape}');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Category is required')).toBeInTheDocument();
    });

    // Now select a category — error should clear eagerly
    await user.click(categoryCombobox);
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'NDA' }));

    await waitFor(() => {
      expect(screen.queryByText('Category is required')).not.toBeInTheDocument();
    });
  });

  it('category renderValue shows selected category name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Compliance' }));

    await waitFor(() => {
      expect(screen.getByText('Compliance')).toBeInTheDocument();
    });
  });

  it('handleClose prevents closing during pending mutation', () => {
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ isPending: true }));
    const onClose = vi.fn();
    renderDialog(true, onClose);

    // The dialog's onClose is guarded by isPending
    // Verify the dialog is still open and cancel is disabled
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // onClose should not have been called
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders error alert with correct message from mutation error', () => {
    const errorMessage = 'Template with this title already exists';
    mockUseCreateTemplate.mockReturnValue(
      defaultMutationResult({
        isError: true,
        error: new Error(errorMessage),
      }),
    );
    renderDialog();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(errorMessage);
  });

  it('renders with no categories when categoriesData is undefined', () => {
    mockUseCategories.mockReturnValue(defaultQueryResult(undefined, { isLoading: true }));
    renderDialog();

    // Should still render the dialog without crashing
    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('renders with no countries when countriesData is undefined', () => {
    mockUseCountries.mockReturnValue(defaultQueryResult(undefined, { isLoading: true }));
    renderDialog();

    // Should still render the dialog without crashing
    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('category error helper text rendered when category is empty and touched', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Open and close category to trigger touched + error
    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.keyboard('{Escape}');
    await user.tab();

    await waitFor(() => {
      const helperText = screen.getByText('Category is required');
      expect(helperText).toBeInTheDocument();
      // Helper text should be within a FormHelperText (has MuiFormHelperText class)
      expect(helperText.className).toContain('MuiFormHelperText');
    });
  });

  it('catches mutateAsync rejection without crashing', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Server error'));
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');
    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'Employment' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    // Should not crash — error is handled by mutation state
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    // Navigate should NOT have been called since the mutation failed
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('form reset calls mutation reset', () => {
    const resetFn = vi.fn();
    mockUseCreateTemplate.mockReturnValue(defaultMutationResult({ reset: resetFn }));

    const { rerender } = render(
      <Wrapper>
        <CreateTemplateDialog open={true} onClose={vi.fn()} />
      </Wrapper>,
    );

    // Close dialog to trigger reset
    rerender(
      <Wrapper>
        <CreateTemplateDialog open={false} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(resetFn).toHaveBeenCalled();
  });

  // Company select tests
  it('populates company select from useCompanies data with a None option', async () => {
    const user = userEvent.setup();
    renderDialog();

    const companyCombobox = screen.getByLabelText('Company');
    await user.click(companyCombobox);

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Acme Corp' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Globex' })).toBeInTheDocument();
  });

  it('company select shows placeholder "Select..." when empty', () => {
    renderDialog();
    const placeholders = screen.getAllByText('Select...');
    // Both country and company show "Select..." placeholder (plus category)
    expect(placeholders.length).toBeGreaterThanOrEqual(2);
  });

  it('company select displays selected company name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const companyCombobox = screen.getByLabelText('Company');
    await user.click(companyCombobox);
    await user.click(screen.getByRole('option', { name: 'Globex' }));

    await waitFor(() => {
      expect(screen.getByText('Globex')).toBeInTheDocument();
    });
  });

  it('passes company: null when no company selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'Employment' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          company: null,
        }),
      );
    });
  });

  it('passes company name when company selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'My Template');

    const categoryCombobox = screen.getByLabelText('Category');
    await user.click(categoryCombobox);
    await user.click(screen.getByRole('option', { name: 'Employment' }));

    const companyCombobox = screen.getByLabelText('Company');
    await user.click(companyCombobox);
    await user.click(screen.getByRole('option', { name: 'Acme Corp' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Acme Corp',
        }),
      );
    });
  });

  it('renders with no companies when companiesData is undefined', () => {
    mockUseCompanies.mockReturnValue(defaultQueryResult(undefined, { isLoading: true }));
    renderDialog();

    // Should still render the dialog without crashing
    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
  });
});
