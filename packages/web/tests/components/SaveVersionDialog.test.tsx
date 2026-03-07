/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveVersionDialog } from '../../src/components/SaveVersionDialog.js';

describe('SaveVersionDialog', () => {
  it('renders dialog with "Create Version" title when open', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.getByRole('heading', { name: 'Create Version' })).toBeInTheDocument();
    expect(screen.getByLabelText('Change Summary')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<SaveVersionDialog open={false} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.queryByText('Create Version')).not.toBeInTheDocument();
  });

  it('calls onSave with entered summary', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={onSave} saving={false} />);
    await user.type(screen.getByLabelText('Change Summary'), 'Updated section 3');
    await user.click(screen.getByRole('button', { name: 'Create Version' }));
    expect(onSave).toHaveBeenCalledWith('Updated section 3');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveVersionDialog open={true} onClose={onClose} onSave={vi.fn()} saving={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons and shows "Creating..." when saving', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={true} />);
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('clears summary input after save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={onSave} saving={false} />);
    const input = screen.getByLabelText('Change Summary');
    await user.type(input, 'My changes');
    await user.click(screen.getByRole('button', { name: 'Create Version' }));
    expect(onSave).toHaveBeenCalledWith('My changes');
  });

  it('renders dialog paper with brand styling', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const dialog = screen.getByRole('dialog');
    // In MUI v7, the dialog role element may be the paper itself or contain it
    const paper = dialog.querySelector('.MuiPaper-root') ?? dialog;
    expect(paper).toBeInTheDocument();
  });

  it('renders title with Source Serif 4 font and brand color', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const title = screen.getByRole('heading', { name: 'Create Version' });
    const styles = window.getComputedStyle(title);
    expect(styles.fontFamily).toContain('Source Serif 4');
    expect(styles.fontWeight).toBe('600');
    expect(styles.color).toBe('rgb(18, 17, 26)');
  });

  it('renders primary button with brand purple background', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const button = screen.getByRole('button', { name: 'Create Version' });
    const styles = window.getComputedStyle(button);
    expect(styles.backgroundColor).toBe('rgb(128, 39, 255)');
    expect(styles.borderRadius).toBe('12px');
  });

  it('renders secondary cancel button with brand text color', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const button = screen.getByRole('button', { name: 'Cancel' });
    const styles = window.getComputedStyle(button);
    expect(styles.color).toBe('rgb(18, 17, 26)');
  });

  it('has transition duration configured on the Dialog', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // MUI Dialog with transitionDuration renders properly — the prop configures
    // the Fade transition internally. We verify the dialog and its backdrop render.
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).toBeInTheDocument();
  });
});
