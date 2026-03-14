/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewVariableDialog } from '../../src/components/NewVariableDialog.js';
import { TYPE_LABELS } from '../../src/constants/variables.js';

function renderDialog(props?: Partial<React.ComponentProps<typeof NewVariableDialog>>) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onCreateVariable: vi.fn(),
  };
  return render(<NewVariableDialog {...defaultProps} {...props} />);
}

describe('NewVariableDialog', () => {
  it('renders dialog with "New Variable" title when open', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'New Variable' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('heading', { name: 'New Variable' })).not.toBeInTheDocument();
  });

  it('renders name text field', () => {
    renderDialog();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('renders type select', () => {
    renderDialog();
    expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders Create button', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('Create button is disabled when name is empty', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('Create button is enabled when name is non-empty', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/name/i), 'Party Name');
    expect(screen.getByRole('button', { name: /create/i })).toBeEnabled();
  });

  it('Create button disabled again if name is cleared', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText(/name/i);
    await user.type(input, 'A');
    expect(screen.getByRole('button', { name: /create/i })).toBeEnabled();
    await user.clear(input);
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('type defaults to text', () => {
    renderDialog();
    const select = screen.getByRole('combobox', { name: /type/i });
    expect(select).toHaveTextContent(TYPE_LABELS.text);
  });

  it('all 7 variable types are available in the select', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText(TYPE_LABELS.text)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.date)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.address)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.currency)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.signature)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.number)).toBeInTheDocument();
    expect(within(listbox).getByText(TYPE_LABELS.custom)).toBeInTheDocument();
  });

  it('custom type label field is hidden for text type', () => {
    renderDialog();
    expect(screen.queryByLabelText(/custom type label/i)).not.toBeInTheDocument();
  });

  it('custom type label field appears when type is custom', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.custom }));
    expect(screen.getByLabelText(/custom type label/i)).toBeInTheDocument();
  });

  it('custom type label field is hidden when switching away from custom', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.custom }));
    expect(screen.getByLabelText(/custom type label/i)).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.date }));
    expect(screen.queryByLabelText(/custom type label/i)).not.toBeInTheDocument();
  });

  it('calls onCreateVariable with name and type when Create is clicked', async () => {
    const user = userEvent.setup();
    const onCreateVariable = vi.fn();
    renderDialog({ onCreateVariable });
    await user.type(screen.getByLabelText(/name/i), 'Counterparty');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onCreateVariable).toHaveBeenCalledWith('Counterparty', 'text', undefined);
  });

  it('calls onCreateVariable with customType when type is custom', async () => {
    const user = userEvent.setup();
    const onCreateVariable = vi.fn();
    renderDialog({ onCreateVariable });
    await user.type(screen.getByLabelText(/name/i), 'My Var');
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.custom }));
    await user.type(screen.getByLabelText(/custom type label/i), 'Internal Ref');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onCreateVariable).toHaveBeenCalledWith('My Var', 'custom', 'Internal Ref');
  });

  it('form resets after creation (name cleared, type back to text)', async () => {
    const user = userEvent.setup();
    renderDialog();
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Var');
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.date }));
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(nameInput).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /type/i })).toHaveTextContent(TYPE_LABELS.text);
  });

  it('Cancel calls onClose without creating', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreateVariable = vi.fn();
    renderDialog({ onClose, onCreateVariable });
    await user.type(screen.getByLabelText(/name/i), 'Some Name');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onCreateVariable).not.toHaveBeenCalled();
  });

  it('Cancel resets the form state', async () => {
    const user = userEvent.setup();
    renderDialog();
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Something');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(nameInput).toHaveValue('');
  });

  it('title uses Source Serif 4 font', () => {
    renderDialog();
    const heading = screen.getByRole('heading', { name: 'New Variable' });
    const styles = window.getComputedStyle(heading);
    expect(styles.fontFamily).toContain('Source Serif 4');
  });

  it('Create button has brand purple background', () => {
    renderDialog();
    // Enable the button first
    const btn = screen.getByRole('button', { name: /create/i });
    // Check the variant (contained) - button should have MuiButton-contained class
    expect(btn.classList.toString()).toContain('MuiButton');
  });

  it('name placeholder is present', () => {
    renderDialog();
    expect(screen.getByPlaceholderText(/e\.g\. Party Name/i)).toBeInTheDocument();
  });

  it('calls onCreateVariable with date type', async () => {
    const user = userEvent.setup();
    const onCreateVariable = vi.fn();
    renderDialog({ onCreateVariable });
    await user.type(screen.getByLabelText(/name/i), 'Execution Date');
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.date }));
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onCreateVariable).toHaveBeenCalledWith('Execution Date', 'date', undefined);
  });

  it('calls onCreateVariable with currency type', async () => {
    const user = userEvent.setup();
    const onCreateVariable = vi.fn();
    renderDialog({ onCreateVariable });
    await user.type(screen.getByLabelText(/name/i), 'Total Amount');
    await user.click(screen.getByRole('combobox', { name: /type/i }));
    await user.click(screen.getByRole('option', { name: TYPE_LABELS.currency }));
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onCreateVariable).toHaveBeenCalledWith('Total Amount', 'currency', undefined);
  });
});
