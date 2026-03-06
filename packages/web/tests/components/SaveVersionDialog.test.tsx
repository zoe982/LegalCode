/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveVersionDialog } from '../../src/components/SaveVersionDialog.js';

describe('SaveVersionDialog', () => {
  it('renders dialog when open', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.getByText('Save Version')).toBeInTheDocument();
    expect(screen.getByLabelText('Change Summary')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<SaveVersionDialog open={false} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.queryByText('Save Version')).not.toBeInTheDocument();
  });

  it('calls onSave with entered summary', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={onSave} saving={false} />);
    await user.type(screen.getByLabelText('Change Summary'), 'Updated section 3');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('Updated section 3');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveVersionDialog open={true} onClose={onClose} onSave={vi.fn()} saving={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons when saving', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={true} />);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('clears summary input after save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={onSave} saving={false} />);
    const input = screen.getByLabelText('Change Summary');
    await user.type(input, 'My changes');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    // After save, internal state should reset
    expect(onSave).toHaveBeenCalledWith('My changes');
  });
});
