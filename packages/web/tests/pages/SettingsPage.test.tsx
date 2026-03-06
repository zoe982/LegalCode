/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { SettingsPage } from '../../src/pages/SettingsPage.js';

describe('SettingsPage', () => {
  it('renders Settings heading', () => {
    render(
      <ThemeProvider theme={theme}>
        <SettingsPage />
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('renders placeholder content', () => {
    render(
      <ThemeProvider theme={theme}>
        <SettingsPage />
      </ThemeProvider>,
    );
    expect(screen.getByText('Preferences and account settings')).toBeInTheDocument();
  });
});
