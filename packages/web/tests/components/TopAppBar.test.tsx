/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { TopAppBar } from '../../src/components/TopAppBar.js';

function renderAppBar(props?: Partial<React.ComponentProps<typeof TopAppBar>>) {
  return render(
    <ThemeProvider theme={theme}>
      <TopAppBar title="Templates" {...props} />
    </ThemeProvider>,
  );
}

describe('TopAppBar', () => {
  it('renders the page title', () => {
    renderAppBar({ title: 'Templates' });
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders children in the right slot', () => {
    renderAppBar({ title: 'Editor', children: <button>Action</button> });
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('has data-testid top-app-bar', () => {
    renderAppBar();
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders with 64px height', () => {
    renderAppBar();
    const bar = screen.getByTestId('top-app-bar');
    expect(bar).toHaveStyle({ height: '64px' });
  });

  it('renders title and children in separate flex areas', () => {
    renderAppBar({
      title: 'My Page',
      children: <span data-testid="right-slot">Right</span>,
    });
    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.getByTestId('right-slot')).toBeInTheDocument();
  });

  it('renders editable title when editableTitle prop is provided', () => {
    renderAppBar({ editableTitle: 'My Document' });
    expect(screen.getByText('My Document')).toBeInTheDocument();
    // The regular title should not be shown when editableTitle is provided
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
  });

  it('inline edit: clicking title shows input, blur saves', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    renderAppBar({
      editableTitle: 'Original Title',
      onTitleChange,
    });

    // Click the editable title to enter edit mode
    const titleEl = screen.getByText('Original Title');
    await user.click(titleEl);

    // An input should appear
    const input = screen.getByRole('textbox', { name: /title/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Original Title');

    // Clear and type new title
    await user.clear(input);
    await user.type(input, 'New Title');

    // Blur to save
    await user.tab();

    expect(onTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('inline edit: pressing Enter saves', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    renderAppBar({
      editableTitle: 'Original Title',
      onTitleChange,
    });

    const titleEl = screen.getByText('Original Title');
    await user.click(titleEl);

    const input = screen.getByRole('textbox', { name: /title/i });
    await user.clear(input);
    await user.type(input, 'Edited Title{Enter}');

    expect(onTitleChange).toHaveBeenCalledWith('Edited Title');
  });

  it('renders status badge when statusBadge prop is provided', () => {
    renderAppBar({
      editableTitle: 'My Document',
      statusBadge: <span data-testid="status-badge">Draft</span>,
    });
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('does not render status badge when prop is not provided', () => {
    renderAppBar({ title: 'Templates' });
    expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
  });

  it('editable title is not shown as input until clicked', () => {
    renderAppBar({ editableTitle: 'My Title' });
    // Should render as text, not an input
    expect(screen.queryByRole('textbox', { name: /title/i })).not.toBeInTheDocument();
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });
});
