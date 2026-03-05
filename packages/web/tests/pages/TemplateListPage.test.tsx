/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateListPage } from '../../src/pages/TemplateListPage.js';

describe('TemplateListPage', () => {
  it('renders placeholder text', () => {
    render(<TemplateListPage />);
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });
});
