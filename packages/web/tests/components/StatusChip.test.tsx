/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../../src/components/StatusChip.js';

describe('StatusChip', () => {
  it('renders draft with default color', () => {
    render(<StatusChip status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders active with success color', () => {
    render(<StatusChip status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders archived with warning color', () => {
    render(<StatusChip status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
