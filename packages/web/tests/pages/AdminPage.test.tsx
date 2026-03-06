/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { AdminPage } from '../../src/pages/AdminPage.js';

describe('AdminPage', () => {
  it('renders Admin heading', () => {
    render(
      <ThemeProvider theme={theme}>
        <AdminPage />
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders placeholder content', () => {
    render(
      <ThemeProvider theme={theme}>
        <AdminPage />
      </ThemeProvider>,
    );
    expect(screen.getByText('User management and system configuration')).toBeInTheDocument();
  });
});
