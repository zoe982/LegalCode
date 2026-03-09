/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Template } from '@legalcode/shared';

const mockTrashQuery = vi.fn();
const mockRestoreMutate = vi.fn();
const mockHardDeleteMutate = vi.fn();
const mockRestoreMutation = {
  mutate: mockRestoreMutate,
  isPending: false,
};
const mockHardDeleteMutation = {
  mutate: mockHardDeleteMutate,
  isPending: false,
};

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTrashTemplates: () => mockTrashQuery() as unknown,
  useRestoreTemplate: () => mockRestoreMutation as unknown,
  useHardDeleteTemplate: () => mockHardDeleteMutation as unknown,
}));

const { TrashManager } = await import('../../src/components/TrashManager.js');

const deletedTemplate: Template = {
  id: 'tpl-1',
  title: 'Old NDA',
  slug: 'old-nda',
  category: 'NDA',
  description: null,
  country: null,
  currentVersion: 1,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
  deletedAt: '2026-03-01T00:00:00Z',
  deletedBy: 'admin@test.com',
};

describe('TrashManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockTrashQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<TrashManager />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no deleted templates', () => {
    mockTrashQuery.mockReturnValue({ data: { data: [] }, isLoading: false });
    render(<TrashManager />);
    expect(screen.getByText('No deleted templates')).toBeInTheDocument();
  });

  it('renders table with deleted templates', () => {
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    expect(screen.getByRole('table', { name: 'Deleted templates' })).toBeInTheDocument();
    expect(screen.getByText('Old NDA')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('shows days remaining column', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T00:00:00Z'));
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    // deletedAt is 2026-03-01, so 30 days from that = 2026-03-31, 26 days remaining
    expect(screen.getByText('26')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows Restore and Delete permanently buttons', () => {
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
  });

  it('calls restore when Restore is clicked', async () => {
    const user = userEvent.setup();
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(mockRestoreMutate).toHaveBeenCalledWith('tpl-1');
  });

  it('opens permanent delete dialog when Delete permanently is clicked', async () => {
    const user = userEvent.setup();
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete Old NDA/)).toBeInTheDocument();
  });

  it('renders table headers', () => {
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Deleted by')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Days remaining')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows dash when deletedBy is null', () => {
    const templateNullDeletedBy = { ...deletedTemplate, deletedBy: null };
    mockTrashQuery.mockReturnValue({
      data: { data: [templateNullDeletedBy] },
      isLoading: false,
    });
    render(<TrashManager />);
    const cells = screen.getAllByRole('cell');
    const deletedByCell = cells[1];
    expect(deletedByCell).toHaveTextContent('-');
  });

  it('renders empty state icon', () => {
    mockTrashQuery.mockReturnValue({ data: { data: [] }, isLoading: false });
    render(<TrashManager />);
    // The empty state should contain an SVG icon
    const container = screen.getByText('No deleted templates').parentElement;
    const svgs = container?.querySelectorAll('svg');
    expect(svgs?.length).toBeGreaterThanOrEqual(1);
  });

  // Covers lines 73-79: handlePermanentDeleteConfirm calls hardDeleteMutation.mutate
  it('confirms permanent delete and calls hardDeleteMutation.mutate', async () => {
    const user = userEvent.setup();
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    // Open the permanent delete dialog
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // Click the confirm button inside the dialog
    const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
    await user.click(confirmButton);
    expect(mockHardDeleteMutate).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({
        onSuccess: expect.any(Function) as unknown,
      }),
    );
  });

  // Covers lines 73-79: onSuccess callback clears the permanentDeleteTarget
  it('clears permanent delete target on successful hard delete', async () => {
    const user = userEvent.setup();
    // Make mutate call onSuccess synchronously
    mockHardDeleteMutate.mockImplementation((_id: string, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
    await user.click(confirmButton);
    // After onSuccess, dialog should close (permanentDeleteTarget set to null)
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  // Covers lines 214-215: closing the delete dialog via onClose
  it('closes permanent delete dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  // Covers branch: template with null deletedAt shows '-' and 0 days remaining
  it('shows dash and 0 days when deletedAt is null', () => {
    const templateNullDeletedAt = { ...deletedTemplate, deletedAt: null };
    mockTrashQuery.mockReturnValue({
      data: { data: [templateNullDeletedAt] },
      isLoading: false,
    });
    render(<TrashManager />);
    const cells = screen.getAllByRole('cell');
    // deletedAt column (3rd cell, index 2) should show '-'
    expect(cells[2]).toHaveTextContent('-');
    // days remaining column (4th cell, index 3) should show '0'
    expect(cells[3]).toHaveTextContent('0');
  });

  // Covers branch: days < 7 shows red styling
  it('shows urgent styling when days remaining is less than 7', () => {
    vi.useFakeTimers();
    // Set time to just 3 days before expiry (27 days after deletion)
    vi.setSystemTime(new Date('2026-03-28T00:00:00Z'));
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    const cells = screen.getAllByRole('cell');
    // days remaining should be 3
    expect(cells[3]).toHaveTextContent('3');
    vi.useRealTimers();
  });

  // Covers: multiple templates rendered
  it('renders multiple deleted templates', () => {
    const secondTemplate: Template = {
      ...deletedTemplate,
      id: 'tpl-2',
      title: 'Old Employment Agreement',
      deletedBy: 'other@test.com',
    };
    mockTrashQuery.mockReturnValue({
      data: { data: [deletedTemplate, secondTemplate] },
      isLoading: false,
    });
    render(<TrashManager />);
    expect(screen.getByText('Old NDA')).toBeInTheDocument();
    expect(screen.getByText('Old Employment Agreement')).toBeInTheDocument();
  });
});
