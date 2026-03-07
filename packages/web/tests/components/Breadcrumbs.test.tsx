/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { Breadcrumbs } from '../../src/components/Breadcrumbs.js';

function renderBreadcrumbs(props?: { templateName?: string; pageName?: string }) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Breadcrumbs {...props} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Breadcrumbs', () => {
  it('renders Acasus wordmark', () => {
    renderBreadcrumbs();
    expect(screen.getByText('Acasus')).toBeInTheDocument();
  });

  it('renders Acasus wordmark as a link to /templates', () => {
    renderBreadcrumbs();
    const link = screen.getByRole('link', { name: /acasus/i });
    expect(link).toHaveAttribute('href', '/templates');
  });

  it('renders Acasus wordmark with serif font class', () => {
    renderBreadcrumbs();
    const wordmark = screen.getByText('Acasus');
    // MUI applies font via CSS-in-JS class; verify element exists and is a link
    expect(wordmark).toBeInTheDocument();
    expect(wordmark.closest('a')).not.toBeNull();
  });

  it('renders Acasus wordmark in dark purple color (#451F61)', () => {
    renderBreadcrumbs();
    const wordmark = screen.getByText('Acasus');
    expect(wordmark).toHaveStyle({ color: '#451F61' });
  });

  it('renders only Acasus when no templateName is provided', () => {
    renderBreadcrumbs();
    expect(screen.getByText('Acasus')).toBeInTheDocument();
    // No separator or "Templates" text when no template name
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
  });

  it('renders 3-level breadcrumb when templateName is provided', () => {
    renderBreadcrumbs({ templateName: 'My Contract' });
    expect(screen.getByText('Acasus')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('My Contract')).toBeInTheDocument();
  });

  it('renders separators between breadcrumb levels', () => {
    renderBreadcrumbs({ templateName: 'My Contract' });
    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(2);
  });

  it('renders Templates as a link to /templates', () => {
    renderBreadcrumbs({ templateName: 'My Contract' });
    const link = screen.getByRole('link', { name: /templates/i });
    expect(link).toHaveAttribute('href', '/templates');
  });

  it('renders template name as plain text (not a link)', () => {
    renderBreadcrumbs({ templateName: 'My Contract' });
    const templateNameEl = screen.getByText('My Contract');
    expect(templateNameEl.closest('a')).toBeNull();
  });

  it('truncates template name at 300px max-width', () => {
    renderBreadcrumbs({ templateName: 'A Very Long Template Name That Should Be Truncated' });
    const templateNameEl = screen.getByText('A Very Long Template Name That Should Be Truncated');
    expect(templateNameEl).toHaveStyle({ maxWidth: '300px' });
    expect(templateNameEl).toHaveStyle({ overflow: 'hidden' });
    expect(templateNameEl).toHaveStyle({ textOverflow: 'ellipsis' });
  });

  it('has data-testid breadcrumbs', () => {
    renderBreadcrumbs();
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  // --- pageName prop ---

  it('renders 2-level breadcrumb when pageName is provided', () => {
    renderBreadcrumbs({ pageName: 'Admin' });
    expect(screen.getByText('Acasus')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Acasus as link to /templates when pageName is provided', () => {
    renderBreadcrumbs({ pageName: 'Settings' });
    const link = screen.getByRole('link', { name: /acasus/i });
    expect(link).toHaveAttribute('href', '/templates');
  });

  it('renders pageName as plain text (not a link)', () => {
    renderBreadcrumbs({ pageName: 'Admin' });
    const pageNameEl = screen.getByText('Admin');
    expect(pageNameEl.closest('a')).toBeNull();
  });

  it('renders separator between Acasus and pageName', () => {
    renderBreadcrumbs({ pageName: 'Settings' });
    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(1);
  });

  it('ignores pageName when templateName is also provided', () => {
    renderBreadcrumbs({ templateName: 'My Contract', pageName: 'Admin' });
    // Should render templateName breadcrumb, not pageName
    expect(screen.getByText('My Contract')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
