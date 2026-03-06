/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { ResponsiveGuard } from '../../src/components/ResponsiveGuard.js';

// Mock useMediaQuery to control viewport simulation
const mockUseMediaQuery = vi.fn<(query: string) => boolean>();

vi.mock('@mui/material/useMediaQuery', () => ({
  default: (query: string) => mockUseMediaQuery(query),
}));

function renderGuard() {
  return render(
    <ThemeProvider theme={theme}>
      <ResponsiveGuard>
        <div data-testid="app-content">App Content</div>
      </ResponsiveGuard>
    </ThemeProvider>,
  );
}

describe('ResponsiveGuard', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReset();
  });

  it('shows children when viewport is >= 900px', () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderGuard();
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.queryByText(/designed for desktop/i)).not.toBeInTheDocument();
  });

  it('shows desktop notice when viewport is < 900px', () => {
    mockUseMediaQuery.mockReturnValue(false);
    renderGuard();
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
    expect(screen.getByText(/designed for desktop/i)).toBeInTheDocument();
  });

  it('shows instruction to use a wider window', () => {
    mockUseMediaQuery.mockReturnValue(false);
    renderGuard();
    expect(screen.getByText(/wider window/i)).toBeInTheDocument();
  });

  it('uses the correct media query for 900px breakpoint', () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderGuard();
    expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width:900px)');
  });
});
