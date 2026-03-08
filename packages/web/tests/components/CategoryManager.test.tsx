/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { Category } from '@legalcode/shared';

// --- Mocks ---

const mockUseCategories = vi.fn();
const mockCreateCategory = vi.fn();
let mockCreateCategoryPending = false;
const mockUpdateCategory = vi.fn();
let mockUpdateCategoryPending = false;
const mockDeleteCategory = vi.fn();
let mockDeleteCategoryPending = false;

vi.mock('../../src/hooks/useCategories.js', () => ({
  useCategories: (...args: unknown[]) => mockUseCategories(...args) as unknown,
  useCreateCategory: () => ({
    mutate: mockCreateCategory,
    isPending: mockCreateCategoryPending,
  }),
  useUpdateCategory: () => ({
    mutate: mockUpdateCategory,
    isPending: mockUpdateCategoryPending,
  }),
  useDeleteCategory: () => ({
    mutate: mockDeleteCategory,
    isPending: mockDeleteCategoryPending,
  }),
}));

const { CategoryManager } = await import('../../src/components/CategoryManager.js');

// --- Test Data ---

const category1: Category = {
  id: 'cat-1',
  name: 'Contract',
  createdAt: '2026-01-01T00:00:00Z',
};

const category2: Category = {
  id: 'cat-2',
  name: 'Policy',
  createdAt: '2026-02-01T00:00:00Z',
};

const allCategories: Category[] = [category1, category2];

// --- Helpers ---

function renderManager() {
  return render(
    <ThemeProvider theme={theme}>
      <CategoryManager />
    </ThemeProvider>,
  );
}

function setupPopulated() {
  mockUseCategories.mockReturnValue({
    data: { categories: allCategories },
    isLoading: false,
    error: null,
  });
}

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCategoryPending = false;
    mockUpdateCategoryPending = false;
    mockDeleteCategoryPending = false;

    mockUseCategories.mockReturnValue({
      data: { categories: [] },
      isLoading: false,
      error: null,
    });
  });

  // =====================
  // Loading state
  // =====================

  it('shows loading indicator when categories are loading', () => {
    mockUseCategories.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderManager();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-busy on loading container', () => {
    mockUseCategories.mockReturnValue({
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

  it('shows error alert when categories fail to load', () => {
    mockUseCategories.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch categories'),
    });
    renderManager();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch categories');
  });

  // =====================
  // Empty state
  // =====================

  it('shows empty state when no categories exist', () => {
    renderManager();
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText('Add a category above to get started.')).toBeInTheDocument();
  });

  // =====================
  // Populated state
  // =====================

  it('renders category table with name and actions columns', () => {
    setupPopulated();
    renderManager();
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Actions');
  });

  it('renders category names in the table', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByText('Contract')).toBeInTheDocument();
    expect(screen.getByText('Policy')).toBeInTheDocument();
  });

  // =====================
  // Add Category form
  // =====================

  it('renders add category form with name field and button', () => {
    renderManager();
    const form = screen.getByLabelText('Add category form');
    expect(within(form).getByLabelText(/category name/i)).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('disables Add button when name is empty', () => {
    renderManager();
    const form = screen.getByLabelText('Add category form');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add button when name is filled', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add category form');
    await user.type(within(form).getByLabelText(/category name/i), 'New Category');
    const addButton = within(form).getByRole('button', { name: /add/i });
    expect(addButton).toBeEnabled();
  });

  it('calls createCategory mutation on form submit', async () => {
    const user = userEvent.setup();
    renderManager();
    const form = screen.getByLabelText('Add category form');
    await user.type(within(form).getByLabelText(/category name/i), 'New Category');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'New Category' }, expect.anything());
  });

  it('clears form after successful creation', async () => {
    const user = userEvent.setup();
    mockCreateCategory.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    renderManager();
    const form = screen.getByLabelText('Add category form');
    await user.type(within(form).getByLabelText(/category name/i), 'New Category');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(within(form).getByLabelText(/category name/i)).toHaveValue('');
  });

  it('shows error message on creation failure', async () => {
    const user = userEvent.setup();
    mockCreateCategory.mockImplementation(
      (_data: unknown, opts: { onError?: (err: Error) => void }) => {
        opts.onError?.(new Error('Category already exists'));
      },
    );
    renderManager();
    const form = screen.getByLabelText('Add category form');
    await user.type(within(form).getByLabelText(/category name/i), 'Dup');
    await user.click(within(form).getByRole('button', { name: /add/i }));
    expect(screen.getByText('Category already exists')).toBeInTheDocument();
  });

  it('shows loading in add button when pending', () => {
    mockCreateCategoryPending = true;
    renderManager();
    const form = screen.getByLabelText('Add category form');
    // When pending, button text is replaced by spinner so query by role without name filter
    const buttons = within(form).getAllByRole('button');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test: we know the button exists
    const addButton = buttons[0]!;
    expect(addButton).toBeDisabled();
    expect(addButton.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Edit category
  // =====================

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Contract' }));
    expect(screen.getByLabelText(/edit name/i)).toHaveValue('Contract');
  });

  it('saves edited category name', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Contract' }));
    const editInput = screen.getByLabelText(/edit name/i);
    await user.clear(editInput);
    await user.type(editInput, 'Updated Contract');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockUpdateCategory).toHaveBeenCalledWith(
      { id: 'cat-1', name: 'Updated Contract' },
      expect.anything(),
    );
  });

  it('cancels edit mode', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Contract' }));
    expect(screen.getByLabelText(/edit name/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
    expect(screen.getByText('Contract')).toBeInTheDocument();
  });

  it('exits edit mode after successful save', async () => {
    const user = userEvent.setup();
    mockUpdateCategory.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Contract' }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument();
  });

  it('disables save button when edit name is empty', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Edit Contract' }));
    const editInput = screen.getByLabelText(/edit name/i);
    await user.clear(editInput);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  // =====================
  // Delete category with confirmation
  // =====================

  it('opens confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Contract/)).toBeInTheDocument();
  });

  it('calls deleteCategory on confirm', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));
    expect(mockDeleteCategory).toHaveBeenCalledWith('cat-1', expect.anything());
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog after successful deletion', async () => {
    const user = userEvent.setup();
    mockDeleteCategory.mockImplementation((_id: string, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
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
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows loading in delete button when pending', async () => {
    const user = userEvent.setup();
    mockDeleteCategoryPending = true;
    setupPopulated();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Delete Contract' }));
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    const deleteBtn = buttons[buttons.length - 1];
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn?.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // =====================
  // Accessibility
  // =====================

  it('has accessible form label on add category section', () => {
    renderManager();
    expect(screen.getByLabelText('Add category form')).toBeInTheDocument();
  });

  it('renders semantic table elements', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('has accessible edit and delete buttons for each category', () => {
    setupPopulated();
    renderManager();
    expect(screen.getByRole('button', { name: 'Edit Contract' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Contract' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Policy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Policy' })).toBeInTheDocument();
  });
});
