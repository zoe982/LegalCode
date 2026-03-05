/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateEditorPage } from '../../src/pages/TemplateEditorPage.js';

describe('TemplateEditorPage', () => {
  it('renders placeholder text', () => {
    render(<TemplateEditorPage />);
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
