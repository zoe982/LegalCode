/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Doc as YDoc } from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

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

const captured: { editorCallback: ((root: HTMLElement) => unknown) | null } = {
  editorCallback: null,
};

vi.mock('@milkdown/react', () => ({
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="milkdown-provider">{children}</div>
  ),
  Milkdown: () => <div data-testid="milkdown-editor" />,
  useEditor: (cb: (root: HTMLElement) => unknown) => {
    captured.editorCallback = cb;
    return { get: () => null };
  },
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

  it('invokes onChange callback when markdownUpdated fires', () => {
    const onChange = vi.fn();
    captured.editorCallback = null;

    render(<MarkdownEditor defaultValue="# Hello" onChange={onChange} />);

    // The useEditor mock captures the callback; invoke it with a fake root element
    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // Crepe constructor was called; the `on` mock was called with a listener setup fn
    expect(mockOn).toHaveBeenCalledTimes(1);
    const listenerSetupFn = (mockOn.mock.calls[0] as unknown[])[0] as (listener: {
      markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void;
    }) => void;

    // Simulate the listener being called
    const mockMarkdownUpdated = vi.fn();
    listenerSetupFn({ markdownUpdated: mockMarkdownUpdated });

    // The markdownUpdated callback should have been registered
    expect(mockMarkdownUpdated).toHaveBeenCalledTimes(1);
    const registeredCb = (mockMarkdownUpdated.mock.calls[0] as unknown[])[0] as (
      ctx: unknown,
      md: string,
    ) => void;

    // Simulate markdown update
    registeredCb(null, '# Updated');
    expect(onChange).toHaveBeenCalledWith('# Updated');
  });

  it('calls setReadonly(true) when readOnly is true', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor readOnly={true} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockSetReadonly).toHaveBeenCalledWith(true);
  });

  it('does not call setReadonly when readOnly is false or undefined', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor readOnly={false} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockSetReadonly).not.toHaveBeenCalled();
  });

  it('does not call on() when onChange is not provided', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockOn).not.toHaveBeenCalled();
  });

  it('renders with collaboration prop without error', () => {
    render(
      <MarkdownEditor
        collaboration={{
          ydoc: {} as YDoc,
          awareness: {} as Awareness,
        }}
      />,
    );
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('does not register onChange listener when collaboration is provided', () => {
    captured.editorCallback = null;
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        onChange={onChange}
        collaboration={{
          ydoc: {} as YDoc,
          awareness: {} as Awareness,
        }}
      />,
    );

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // In collaboration mode, onChange should NOT be registered
    expect(mockOn).not.toHaveBeenCalled();
  });

  it('uses empty string as defaultValue in collaboration mode', async () => {
    captured.editorCallback = null;

    render(
      <MarkdownEditor
        defaultValue="# Should be ignored"
        collaboration={{
          ydoc: {} as YDoc,
          awareness: {} as Awareness,
        }}
      />,
    );

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // Verify Crepe was called with empty string, not the defaultValue
    const { Crepe: CrepeMock } = await import('@milkdown/crepe');
    expect(CrepeMock).toHaveBeenCalledWith(expect.objectContaining({ defaultValue: '' }));
  });
});
