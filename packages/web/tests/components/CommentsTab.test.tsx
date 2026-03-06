/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { CommentsTab } from '../../src/components/CommentsTab.js';

function renderTab() {
  return render(
    <ThemeProvider theme={theme}>
      <CommentsTab templateId="t1" />
    </ThemeProvider>,
  );
}

describe('CommentsTab', () => {
  it('renders empty state heading', () => {
    renderTab();
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('renders empty state description', () => {
    renderTab();
    expect(screen.getByText('Comments and annotations will appear here')).toBeInTheDocument();
  });

  it('renders container with testid', () => {
    renderTab();
    expect(screen.getByTestId('comments-tab')).toBeInTheDocument();
  });

  it('renders chat icon', () => {
    renderTab();
    expect(screen.getByTestId('ChatBubbleOutlineIcon')).toBeInTheDocument();
  });
});
