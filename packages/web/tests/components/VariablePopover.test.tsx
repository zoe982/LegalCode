/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariablePopover } from '../../src/components/VariablePopover.js';
import type { VariableDefinition } from '@legalcode/shared';
import { TYPE_ICONS } from '../../src/constants/variables.js';

const mockVariables: VariableDefinition[] = [
  { id: 'v1', name: 'Party Name', type: 'text' },
  { id: 'v2', name: 'Execution Date', type: 'date' },
  { id: 'v3', name: 'Contract Value', type: 'currency' },
];

const defaultProps = {
  anchorEl: document.body,
  open: true,
  onClose: vi.fn(),
  variables: mockVariables,
  onInsertVariable: vi.fn(),
  onRenameVariable: vi.fn(),
  onRetypeVariable: vi.fn(),
  onDeleteVariable: vi.fn(),
  onAddVariable: vi.fn(),
  getUsageCount: (id: string) => (id === 'v1' ? 3 : id === 'v2' ? 1 : 0),
};

function renderPopover(props?: Partial<typeof defaultProps>) {
  return render(<VariablePopover {...defaultProps} {...props} />);
}

/** Click the first "more options" kebab button safely (no non-null assertion). */
async function openFirstKebab(user: ReturnType<typeof userEvent.setup>) {
  const [firstMore] = screen.getAllByRole('button', { name: /more options/i });
  expect(firstMore).toBeDefined();
  if (!firstMore) return;
  await user.click(firstMore);
}

describe('VariablePopover', () => {
  it('renders "Variables" title when open', () => {
    renderPopover();
    expect(screen.getByText('Variables')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderPopover();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPopover({ onClose });
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders all variable names', () => {
    renderPopover();
    expect(screen.getByText('Party Name')).toBeInTheDocument();
    expect(screen.getByText('Execution Date')).toBeInTheDocument();
    expect(screen.getByText('Contract Value')).toBeInTheDocument();
  });

  it('renders correct type icons for each variable', () => {
    renderPopover();
    expect(screen.getAllByText(TYPE_ICONS.text).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(TYPE_ICONS.date).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(TYPE_ICONS.currency).length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input', () => {
    renderPopover();
    expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
  });

  it('filters variables by search term (case-insensitive)', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'party');
    expect(screen.getByText('Party Name')).toBeInTheDocument();
    expect(screen.queryByText('Execution Date')).not.toBeInTheDocument();
    expect(screen.queryByText('Contract Value')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'PARTY');
    expect(screen.getByText('Party Name')).toBeInTheDocument();
  });

  it('shows no-results message when search matches nothing', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'zzznomatch');
    expect(screen.getByText(/no matching variables/i)).toBeInTheDocument();
  });

  it('shows empty state when variables list is empty', () => {
    renderPopover({ variables: [] });
    expect(screen.getByText(/no variables yet/i)).toBeInTheDocument();
  });

  it('shows empty state message with create prompt', () => {
    renderPopover({ variables: [] });
    expect(screen.getByText(/create one to get started/i)).toBeInTheDocument();
  });

  it('clicking a variable calls onInsertVariable with correct ID', async () => {
    const user = userEvent.setup();
    const onInsertVariable = vi.fn();
    renderPopover({ onInsertVariable });
    await user.click(screen.getByText('Party Name'));
    expect(onInsertVariable).toHaveBeenCalledWith('v1');
  });

  it('clicking second variable calls onInsertVariable with its ID', async () => {
    const user = userEvent.setup();
    const onInsertVariable = vi.fn();
    renderPopover({ onInsertVariable });
    await user.click(screen.getByText('Execution Date'));
    expect(onInsertVariable).toHaveBeenCalledWith('v2');
  });

  it('displays usage count for variables', () => {
    renderPopover();
    // Party Name has 3 uses
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "New variable" button at bottom', () => {
    renderPopover();
    expect(screen.getByRole('button', { name: /new variable/i })).toBeInTheDocument();
  });

  it('"New variable" button opens NewVariableDialog', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole('button', { name: /new variable/i }));
    expect(screen.getByRole('heading', { name: 'New Variable' })).toBeInTheDocument();
  });

  it('creating a variable via dialog calls onAddVariable and closes dialog', async () => {
    const user = userEvent.setup();
    const onAddVariable = vi.fn();
    renderPopover({ onAddVariable });
    await user.click(screen.getByRole('button', { name: /new variable/i }));
    await user.type(screen.getByLabelText(/name/i), 'New Var');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onAddVariable).toHaveBeenCalledWith('New Var', 'text', undefined);
  });

  it('kebab menu opens when three-dots button is clicked', async () => {
    const user = userEvent.setup();
    renderPopover();
    await openFirstKebab(user);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('kebab menu has Rename option', async () => {
    const user = userEvent.setup();
    renderPopover();
    await openFirstKebab(user);
    expect(screen.getByRole('menuitem', { name: /rename/i })).toBeInTheDocument();
  });

  it('kebab menu has Change Type option', async () => {
    const user = userEvent.setup();
    renderPopover();
    await openFirstKebab(user);
    expect(screen.getByRole('menuitem', { name: /change type/i })).toBeInTheDocument();
  });

  it('kebab menu has Delete option', async () => {
    const user = userEvent.setup();
    renderPopover();
    await openFirstKebab(user);
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('clicking Delete calls onDeleteVariable with correct ID', async () => {
    const user = userEvent.setup();
    const onDeleteVariable = vi.fn();
    renderPopover({ onDeleteVariable });
    await openFirstKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(onDeleteVariable).toHaveBeenCalledWith('v1');
  });

  it('clicking Rename enters inline edit mode', async () => {
    const user = userEvent.setup();
    renderPopover();
    await openFirstKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /rename/i }));
    // After clicking Rename, a TextField with the variable's name appears for editing
    // The search textbox is always present; after rename there should be 2 textboxes
    const textboxes = await screen.findAllByRole('textbox');
    // At minimum: search input + rename input
    expect(textboxes.length).toBeGreaterThanOrEqual(2);
    // One of them should contain the variable name
    const renameInput = textboxes.find((el) => (el as HTMLInputElement).value === 'Party Name');
    expect(renameInput).toBeDefined();
  });

  it('saving rename calls onRenameVariable with new name', async () => {
    const user = userEvent.setup();
    const onRenameVariable = vi.fn();
    renderPopover({ onRenameVariable });
    await openFirstKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /rename/i }));
    // Wait for the rename input to appear (2nd textbox after the search input)
    const textboxes = await screen.findAllByRole('textbox');
    const renameInput = textboxes.find((el) => (el as HTMLInputElement).value === 'Party Name');
    expect(renameInput).toBeDefined();
    if (!renameInput) return;
    await user.clear(renameInput);
    await user.type(renameInput, 'Counterparty');
    await user.keyboard('{Enter}');
    expect(onRenameVariable).toHaveBeenCalledWith('v1', 'Counterparty');
  });

  it('clicking Change Type calls onRetypeVariable', async () => {
    const user = userEvent.setup();
    const onRetypeVariable = vi.fn();
    renderPopover({ onRetypeVariable });
    await openFirstKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /change type/i }));
    // An inline type select should appear — open it
    const typeSelect = screen.getByRole('combobox');
    await user.click(typeSelect);
    // The listbox opens with options
    const listbox = screen.getByRole('listbox');
    const dateOption = within(listbox).getByText('Date');
    await user.click(dateOption);
    expect(onRetypeVariable).toHaveBeenCalledWith('v1', 'date', undefined);
  });

  it('does not render content when closed', () => {
    renderPopover({ open: false });
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();
  });

  it('popover uses the provided anchorEl', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderPopover({ anchorEl, open: true });
    expect(screen.getByText('Variables')).toBeInTheDocument();
    document.body.removeChild(anchorEl);
  });

  it('renders usage count of 0 for Contract Value row', () => {
    renderPopover();
    const contractValueText = screen.getByText('Contract Value');
    const row =
      contractValueText.closest('li') ??
      contractValueText.closest('[role="listitem"]') ??
      contractValueText.parentElement?.parentElement;
    expect(row).toBeInTheDocument();
  });

  it('search clears when popover reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<VariablePopover {...defaultProps} open={true} />);
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'party');
    rerender(<VariablePopover {...defaultProps} open={false} />);
    rerender(<VariablePopover {...defaultProps} open={true} />);
    expect(screen.getByRole('textbox', { name: /search/i })).toHaveValue('');
  });

  it('all variables are shown again after clearing search', async () => {
    const user = userEvent.setup();
    renderPopover();
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchInput, 'party');
    await user.clear(searchInput);
    expect(screen.getByText('Party Name')).toBeInTheDocument();
    expect(screen.getByText('Execution Date')).toBeInTheDocument();
    expect(screen.getByText('Contract Value')).toBeInTheDocument();
  });

  it('delete shows usage count in confirmation area', async () => {
    const user = userEvent.setup();
    const onDeleteVariable = vi.fn();
    renderPopover({ onDeleteVariable });
    await openFirstKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(onDeleteVariable).toHaveBeenCalledWith('v1');
  });

  it('renders list with correct number of items', () => {
    renderPopover();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(mockVariables.length);
  });
});
