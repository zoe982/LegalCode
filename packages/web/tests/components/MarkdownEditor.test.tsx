/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock CSS imports that Milkdown uses
vi.mock('@milkdown/crepe/theme/common/style.css', () => ({}));
vi.mock('@milkdown/crepe/theme/frame.css', () => ({}));

const mockSetReadonly = vi.fn();
const mockOn = vi.fn();
const mockGetMarkdown = vi.fn().mockReturnValue('');
const mockCreate = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn().mockResolvedValue(undefined);

vi.mock('@milkdown/crepe', () => {
  const CrepeClass = vi.fn().mockImplementation(() => ({
    setReadonly: mockSetReadonly,
    on: mockOn,
    getMarkdown: mockGetMarkdown,
    create: mockCreate,
    destroy: mockDestroy,
  }));
  return { Crepe: CrepeClass };
});

vi.mock('@milkdown/react', () => ({
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="milkdown-provider">{children}</div>
  ),
  Milkdown: () => <div data-testid="milkdown-editor" />,
  useEditor: () => ({ get: () => null }),
}));

import React from 'react';
import { MarkdownEditor } from '../../src/components/MarkdownEditor.js';

describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor container', () => {
    render(<MarkdownEditor />);
    expect(screen.getByTestId('milkdown-provider')).toBeInTheDocument();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('renders with defaultValue prop without error', () => {
    expect(() => {
      render(<MarkdownEditor defaultValue="# Hello World" />);
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('renders in readOnly mode without error', () => {
    expect(() => {
      render(<MarkdownEditor readOnly={true} />);
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('renders with onChange callback without error', () => {
    const onChange = vi.fn();
    expect(() => {
      render(<MarkdownEditor onChange={onChange} />);
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('renders with all props combined without error', () => {
    const onChange = vi.fn();
    expect(() => {
      render(<MarkdownEditor defaultValue="# Test" onChange={onChange} readOnly={false} />);
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('wraps editor in a container box', () => {
    const { container } = render(<MarkdownEditor />);
    const box = container.firstChild;
    expect(box).toBeInTheDocument();
  });
});
