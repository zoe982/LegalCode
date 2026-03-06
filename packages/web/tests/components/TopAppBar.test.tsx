/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
