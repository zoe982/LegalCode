/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from '../../src/components/PageTransition.js';

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>Hello Page</div>
      </PageTransition>,
    );
    expect(screen.getByText('Hello Page')).toBeInTheDocument();
  });

  it('has data-testid for integration tests', () => {
    render(
      <PageTransition>
        <div>Test</div>
      </PageTransition>,
    );
    const container = screen.getByTestId('page-transition');
    expect(container).toBeInTheDocument();
  });

  it('has height 100% for proper layout flow', () => {
    render(
      <PageTransition>
        <div>Test</div>
      </PageTransition>,
    );
    const container = screen.getByTestId('page-transition');
    expect(container).toHaveStyle({ height: '100%' });
  });

  it('renders multiple children', () => {
    render(
      <PageTransition>
        <div>First</div>
        <div>Second</div>
      </PageTransition>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('wraps children in a Box container', () => {
    render(
      <PageTransition>
        <div>Content</div>
      </PageTransition>,
    );
    const container = screen.getByTestId('page-transition');
    expect(container.tagName).toBe('DIV');
    expect(container).toContainElement(screen.getByText('Content'));
  });

  it('applies MUI Box className via sx prop', () => {
    render(
      <PageTransition>
        <div>Styled</div>
      </PageTransition>,
    );
    const container = screen.getByTestId('page-transition');
    expect(container.classList.length).toBeGreaterThan(0);
  });
});
