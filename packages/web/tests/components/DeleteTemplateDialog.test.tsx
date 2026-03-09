/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteTemplateDialog } from '../../src/components/DeleteTemplateDialog.js';

describe('DeleteTemplateDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    templateTitle: 'Employment Agreement',
    isDeleting: false,
  };

  it('renders dialog with soft-delete content by default', () => {
    render(<DeleteTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Delete Employment Agreement?')).toBeInTheDocument();
    expect(
      screen.getByText(/moved to trash and permanently deleted after 30 days/),
    ).toBeInTheDocument();
  });

  it('renders permanent delete variant', () => {
    render(<DeleteTemplateDialog {...defaultProps} variant="permanent" />);
    expect(screen.getByText('Permanently delete Employment Agreement?')).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
  });

  it('has alertdialog role', () => {
    render(<DeleteTemplateDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('shows Cancel and Delete buttons', () => {
    render(<DeleteTemplateDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DeleteTemplateDialog {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteTemplateDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when isDeleting is true', () => {
    render(<DeleteTemplateDialog {...defaultProps} isDeleting={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('disables confirm button when isDeleting', () => {
    render(<DeleteTemplateDialog {...defaultProps} isDeleting={true} />);
    const buttons = screen.getAllByRole('button');
    // The confirm button should be disabled
    const confirmBtn = buttons.find(
      (b) => b.classList.contains('Mui-disabled') || b.hasAttribute('disabled'),
    );
    expect(confirmBtn).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<DeleteTemplateDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Employment Agreement?')).not.toBeInTheDocument();
  });

  it('soft-delete variant shows "Delete" button text', () => {
    render(<DeleteTemplateDialog {...defaultProps} variant="soft-delete" />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders delete icon in dialog', () => {
    render(<DeleteTemplateDialog {...defaultProps} />);
    // The dialog should contain the delete icon (rendered as SVG)
    const dialog = screen.getByRole('alertdialog');
    const svgs = dialog.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
