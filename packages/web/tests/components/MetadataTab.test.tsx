/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  beforeEach(() => {
    localStorage.clear();
  });

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
    // Dismiss tooltip so it doesn't override the button's accessible name
    localStorage.setItem('legalcode:tooltip:publish:dismissed', 'true');
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('calls onPublish when Publish button is clicked', async () => {
    // Dismiss tooltip so it doesn't override the button's accessible name
    localStorage.setItem('legalcode:tooltip:publish:dismissed', 'true');
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

  it('clicking category value shows input when not readOnly', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderTab({ onCategoryChange });

    // Click the category value to enter edit mode
    const categoryValue = screen.getByText('Employment');
    await user.click(categoryValue);

    // An input should appear with the category value
    const input = await screen.findByRole('textbox', { name: /category/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Employment');
  });

  it('editing category and blurring calls onCategoryChange', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderTab({ onCategoryChange });

    // Click to enter edit mode
    const categoryValue = screen.getByText('Employment');
    await user.click(categoryValue);

    const input = screen.getByRole('textbox', { name: /category/i });
    await user.clear(input);
    await user.type(input, 'Compliance');
    await user.tab();

    expect(onCategoryChange).toHaveBeenCalledWith('Compliance');
  });

  it('clicking country value shows input when not readOnly', async () => {
    const user = userEvent.setup();
    const onCountryChange = vi.fn();
    renderTab({ onCountryChange });

    const countryValue = screen.getByText('US');
    await user.click(countryValue);

    const input = screen.getByRole('textbox', { name: /country/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('US');
  });

  it('editing country and blurring calls onCountryChange', async () => {
    const user = userEvent.setup();
    const onCountryChange = vi.fn();
    renderTab({ onCountryChange });

    const countryValue = screen.getByText('US');
    await user.click(countryValue);

    const input = screen.getByRole('textbox', { name: /country/i });
    await user.clear(input);
    await user.type(input, 'UK');
    await user.tab();

    expect(onCountryChange).toHaveBeenCalledWith('UK');
  });

  it('shows "Created by" when createdBy prop is provided', () => {
    renderTab({ createdBy: 'john@example.com' });
    expect(screen.getByText('Created By')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('does not show "Created by" when createdBy prop is not provided', () => {
    renderTab();
    expect(screen.queryByText('Created By')).not.toBeInTheDocument();
  });

  it('fields are not editable when readOnly is true', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    const onCountryChange = vi.fn();
    renderTab({ readOnly: true, onCategoryChange, onCountryChange });

    // Click the category value — it should NOT become an input
    const categoryValue = screen.getByText('Employment');
    await user.click(categoryValue);
    expect(screen.queryByRole('textbox', { name: /category/i })).not.toBeInTheDocument();

    // Click the country value — it should NOT become an input
    const countryValue = screen.getByText('US');
    await user.click(countryValue);
    expect(screen.queryByRole('textbox', { name: /country/i })).not.toBeInTheDocument();
  });

  it('pressing Enter on category input saves and exits edit mode', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderTab({ onCategoryChange });

    const categoryValue = screen.getByText('Employment');
    await user.click(categoryValue);

    const input = screen.getByRole('textbox', { name: /category/i });
    await user.clear(input);
    await user.type(input, 'Tax{Enter}');

    expect(onCategoryChange).toHaveBeenCalledWith('Tax');
    // Input should be gone, back to display mode
    expect(screen.queryByRole('textbox', { name: /category/i })).not.toBeInTheDocument();
  });

  it('deleting a tag calls onTagsChange with remaining tags', async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();
    renderTab({ onTagsChange });

    // MUI Chip with onDelete renders a delete icon; find the chip's delete button via its SVG
    const cancelIcons = screen.getAllByTestId('CancelIcon');
    expect(cancelIcons.length).toBe(2); // 'legal' and 'hr'
    // The CancelIcon SVG is inside the clickable element — click the SVG itself
    const firstIcon = cancelIcons[0];
    if (firstIcon === undefined) throw new Error('Expected cancel icon');
    await user.click(firstIcon);

    expect(onTagsChange).toHaveBeenCalledWith(['hr']);
  });

  it('does not show delete on tags when readOnly', () => {
    const onTagsChange = vi.fn();
    renderTab({ readOnly: true, onTagsChange });

    // No delete icons should be present
    expect(screen.queryAllByTestId('CancelIcon').length).toBe(0);
  });

  it('shows Unarchive button for archived status when onUnarchive provided', () => {
    const onUnarchive = vi.fn();
    renderTab({ status: 'archived', onUnarchive });
    expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument();
  });

  it('calls onUnarchive when Unarchive button is clicked', async () => {
    const user = userEvent.setup();
    const onUnarchive = vi.fn();
    renderTab({ status: 'archived', onUnarchive });
    await user.click(screen.getByRole('button', { name: /unarchive/i }));
    expect(onUnarchive).toHaveBeenCalledTimes(1);
  });

  it('does not show Unarchive button when status is not archived', () => {
    const onUnarchive = vi.fn();
    renderTab({ status: 'draft', onUnarchive });
    expect(screen.queryByRole('button', { name: /unarchive/i })).not.toBeInTheDocument();
  });

  it('does not show Unarchive button when onUnarchive is not provided', () => {
    renderTab({ status: 'archived' });
    expect(screen.queryByRole('button', { name: /unarchive/i })).not.toBeInTheDocument();
  });

  it('shows publish tooltip on first render when not dismissed', () => {
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    expect(
      screen.getByText('Make this template available across your organization'),
    ).toBeInTheDocument();
  });

  it('does not show publish tooltip when already dismissed', () => {
    localStorage.setItem('legalcode:tooltip:publish:dismissed', 'true');
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    expect(
      screen.queryByText('Make this template available across your organization'),
    ).not.toBeInTheDocument();
  });

  it('dismisses publish tooltip when "Got it" is clicked', async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderTab({ status: 'draft', onPublish });
    const gotItButton = screen.getByRole('button', { name: 'Got it' });
    await user.click(gotItButton);
    expect(localStorage.getItem('legalcode:tooltip:publish:dismissed')).toBe('true');
    await waitFor(() => {
      expect(
        screen.queryByText('Make this template available across your organization'),
      ).not.toBeInTheDocument();
    });
  });
});
