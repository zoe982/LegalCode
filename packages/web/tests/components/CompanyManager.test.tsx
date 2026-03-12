/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { Company } from '@legalcode/shared';

// --- Mocks ---

const mockUseCompanies = vi.fn();
const mockCreateCompany = vi.fn();
let mockCreateCompanyPending = false;
const mockUpdateCompany = vi.fn();
let mockUpdateCompanyPending = false;
const mockDeleteCompany = vi.fn();
let mockDeleteCompanyPending = false;

vi.mock('../../src/hooks/useCompanies.js', () => ({
  useCompanies: (...args: unknown[]) => mockUseCompanies(...args) as unknown,
  useCreateCompany: () => ({
    mutate: mockCreateCompany,
    isPending: mockCreateCompanyPending,
  }),
  useUpdateCompany: () => ({
    mutate: mockUpdateCompany,
    isPending: mockUpdateCompanyPending,
  }),
  useDeleteCompany: () => ({
    mutate: mockDeleteCompany,
    isPending: mockDeleteCompanyPending,
  }),
}));

const { CompanyManager } = await import('../../src/components/CompanyManager.js');

// --- Test Data ---

const company1: Company = {
  id: 'co-1',
  name: 'Acme Corp',
  createdAt: '2026-01-01T00:00:00Z',
};

const company2: Company = {
  id: 'co-2',
  name: 'Globex',
  createdAt: '2026-02-01T00:00:00Z',
};

const allCompanies: Company[] = [company1, company2];

// --- Helpers ---

function renderManager() {
  return render(
    <ThemeProvider theme={theme}>
      <CompanyManager />
    </ThemeProvider>,
  );
}

function setupPopulated() {
  mockUseCompanies.mockReturnValue({
    data: { companies: allCompanies },
    isLoading: false,
    error: null,
  });
}

describe('CompanyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCompanyPending = false;
    mockUpdateCompanyPending = false;
    mockDeleteCompanyPending = false;

    mockUseCompanies.mockReturnValue({
      data: { companies: [] },
      isLoading: false,
      error: null,
    });
  });

  // =====================
  // Loading state
  // =====================

  it('shows loading indicator when companies are loading', () => {
    mockUseCompanies.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderManager();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-busy on loading container', () => {
    mockUseCompanies.mockReturnValue({
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

  it('shows error alert when companies fail to load', () => {
    mockUseCompanies.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch companies'),
    });
    renderManager();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch companies');
  });

  // =====================
  // Empty state
  // =====================

  it('shows empty state when no companies exist', () => {
    renderManager();
    expect(screen.getByText('No companies yet')).toBeInTheDocument();
    expect(screen.getByText('Add a company above to get started.')).toBeInTheDocument();
  });

  // =====================
  // Populated state
  // =====================

  it('renders company table with name and actions columns', () => {
    setupPopulated();
    renderManager();
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Actions');
  });

  it('renders company names in the table', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  // =====================
  // Add Company form
  // =====================

  it('renders add company form with name field and button', () => {
    renderManager();
    const form = screen.getByLabelText('Add company form');
    expect(within(form).getByLabelText(/company name/i)).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('disables Add button when name is empty', () => {
    renderManager();
    const form = screen.getByLabelText('Add company form');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add button when name is filled', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add company form');
    await user.type(within(form).getByLabelText(/company name/i), 'New Company');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeEnabled();
  });

  it('calls createCompany mutation on form submit', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add company form');
    await user.type(within(form).getByLabelText(/company name/i), 'New Company');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(mockCreateCompany).toHaveBeenCalledWith({ name: 'New Company' }, expect.anything());
  });

  it('clears form after successful creation', async () => {
    const user = userEvent.setup();
    mockCreateCompany.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    renderManager();
    const form = screen.getByLabelText('Add company form');
    await user.type(within(form).getByLabelText(/company name/i), 'New Company');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(within(form).getByLabelText(/company name/i)).toHaveValue('');
  });

  it('shows error message on creation failure', async () => {
    const user = userEvent.setup();
    mockCreateCompany.mockImplementation(
      (_data: unknown, opts: { onError?: (err: Error) => void }) => {
        opts.onError?.(new Error('Company already exists'));
      },
    );
    renderManager();
    const form = screen.getByLabelText('Add company form');
    await user.type(within(form).getByLabelText(/company name/i), 'Dup');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(screen.getByText('Company already exists')).toBeInTheDocument();
  });

  it('shows loading in add button when pending', () => {
    mockCreateCompanyPending = true;
    renderManager();
    const form = screen.getByLabelText('Add company form');
    // When pending, button text is replaced by spinner so query by role without name filter
    const buttons = within(form).getAllByRole('button');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test: we know the button exists
    const addButton = buttons[0]!;
    expect(addButton).toBeDisabled();
    expect(addButton.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Edit company
  // =====================

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));
    expect(screen.getByLabelText(/edit name/i)).toHaveValue('Acme Corp');
  });

  it('saves edited company name', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));
    const editInput = screen.getByLabelText(/edit name/i);
    await user.clear(editInput);
    await user.type(editInput, 'Updated Acme Corp');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockUpdateCompany).toHaveBeenCalledWith(
      { id: 'co-1', name: 'Updated Acme Corp' },
      expect.anything(),
    );
  });

  it('cancels edit mode', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));
    expect(screen.getByLabelText(/edit name/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('exits edit mode after successful save', async () => {
    const user = userEvent.setup();
    mockUpdateCompany.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
  });

  it('disables save button when edit name is empty', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));
    const editInput = screen.getByLabelText(/edit name/i);
    await user.clear(editInput);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  // =====================
  // Delete company with confirmation
  // =====================

  it('opens confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('calls deleteCompany on confirm', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));
    expect(mockDeleteCompany).toHaveBeenCalledWith('co-1', expect.anything());
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog after successful deletion', async () => {
    const user = userEvent.setup();
    mockDeleteCompany.mockImplementation((_id: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
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
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows loading in delete button when pending', async () => {
    const user = userEvent.setup();
    mockDeleteCompanyPending = true;
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    const deleteBtn = buttons[buttons.length - 1];
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Accessibility
  // =====================

  it('has accessible form label on add company section', () => {
    renderManager();
    expect(screen.getByLabelText('Add company form')).toBeInTheDocument();
  });

  it('renders semantic table elements', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('has accessible edit and delete buttons for each company', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('button', { name: 'Edit Acme Corp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Acme Corp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Globex' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Globex' })).toBeInTheDocument();
  });

  it('dialog title says "Delete Company"', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Acme Corp' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Company')).toBeInTheDocument();
  });

  it('shows "Company name already exists" error message text', async () => {
    const user = userEvent.setup();
    mockCreateCompany.mockImplementation(
      (_data: unknown, opts: { onError?: (err: Error) => void }) => {
        opts.onError?.(new Error('Company name already exists'));
      },
    );
    renderManager();
    const form = screen.getByLabelText('Add company form');
    await user.type(within(form).getByLabelText(/company name/i), 'Dup');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(screen.getByText('Company name already exists')).toBeInTheDocument();
  });
});
