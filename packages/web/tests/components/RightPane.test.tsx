/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { RightPane } from '../../src/components/RightPane.js';

function renderPane(props?: Partial<React.ComponentProps<typeof RightPane>>) {
  const defaultProps = {
    open: true,
    onToggle: vi.fn(),
    tabs: [
      { label: 'Metadata', content: <div>Metadata content</div> },
      { label: 'Comments', content: <div>Comments content</div> },
      { label: 'Versions', content: <div>Versions content</div> },
    ],
  };
  return render(
    <ThemeProvider theme={theme}>
      <RightPane {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('RightPane', () => {
  it('renders all tab labels when open', () => {
    renderPane();
    expect(screen.getByRole('tab', { name: /metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /comments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /versions/i })).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    renderPane();
    expect(screen.getByText('Metadata content')).toBeInTheDocument();
  });

  it('switches tab content on click', async () => {
    const user = userEvent.setup();
    renderPane();
    await user.click(screen.getByRole('tab', { name: /comments/i }));
    expect(screen.getByText('Comments content')).toBeInTheDocument();
  });

  it('renders nothing visible when not open', () => {
    renderPane({ open: false });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('calls onToggle when collapse button is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderPane({ onToggle });
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders with data-testid right-pane when open', () => {
    renderPane();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
  });

  it('supports defaultTab prop', () => {
    renderPane({ defaultTab: 1 });
    expect(screen.getByText('Comments content')).toBeInTheDocument();
  });
});
