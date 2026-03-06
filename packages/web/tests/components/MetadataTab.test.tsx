/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { MetadataTab } from '../../src/components/MetadataTab.js';

const defaultProps = {
  category: 'Employment',
  country: 'US',
  tags: ['legal', 'hr'],
  status: 'draft' as const,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

function renderTab(props: Partial<Parameters<typeof MetadataTab>[0]> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MetadataTab {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('MetadataTab', () => {
  it('renders category value', () => {
    renderTab();
    expect(screen.getByText('Employment')).toBeInTheDocument();
  });

  it('renders country value', () => {
    renderTab();
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('renders tags as chips', () => {
    renderTab();
    expect(screen.getByText('legal')).toBeInTheDocument();
    expect(screen.getByText('hr')).toBeInTheDocument();
  });

  it('renders status chip', () => {
    renderTab();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders published status', () => {
    renderTab({ status: 'active' });
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders dates', () => {
    renderTab();
    // Dates are locale-formatted, just check they render
    const dateElements = screen.getAllByText(/2026/);
    expect(dateElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Publish button for draft status when not readOnly', () => {
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('calls onPublish when Publish button is clicked', async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    await user.click(screen.getByRole('button', { name: /publish/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('shows Archive button for active status when not readOnly', () => {
    const onArchive = vi.fn();
    renderTab({ status: 'active', onArchive });
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('calls onArchive when Archive button is clicked', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    renderTab({ status: 'active', onArchive });
    await user.click(screen.getByRole('button', { name: /archive/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when readOnly', () => {
    renderTab({ status: 'draft', readOnly: true, onPublish: vi.fn() });
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
  });

  it('hides action buttons for archived status', () => {
    renderTab({ status: 'archived' });
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
  });
});
