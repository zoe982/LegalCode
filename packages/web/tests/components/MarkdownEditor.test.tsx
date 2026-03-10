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

const mockEditorUse = vi.fn().mockReturnThis();

vi.mock('@milkdown/crepe', () => {
  const CrepeClass = vi.fn().mockImplementation(() => ({
    setReadonly: mockSetReadonly,
    on: mockOn,
    getMarkdown: mockGetMarkdown,
    create: mockCreate,
    destroy: mockDestroy,
    editor: { use: mockEditorUse },
  }));
  const CrepeFeature = { Toolbar: 'toolbar' };
  return { Crepe: CrepeClass, CrepeFeature };
});

vi.mock('@milkdown/kit/utils', () => ({
  $prose: (factory: () => unknown) => factory(),
}));

const mockYUndoPlugin = vi.fn().mockReturnValue({ key: 'mock-y-undo-plugin' });
vi.mock('y-prosemirror', () => ({
  yUndoPlugin: (...args: unknown[]) => mockYUndoPlugin(...args) as unknown,
}));

const mockCreateCommentPlugin = vi.fn().mockReturnValue({ key: 'mock-comment-plugin' });
vi.mock('../../src/editor/commentPlugin.js', () => ({
  createCommentPlugin: (...args: unknown[]) => mockCreateCommentPlugin(...args) as unknown,
}));

const captured: {
  editorCallback: ((root: HTMLElement) => unknown) | null;
  editorCallbackHistory: ((root: HTMLElement) => unknown)[];
} = {
  editorCallback: null,
  editorCallbackHistory: [],
};

vi.mock('@milkdown/react', () => ({
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="milkdown-provider">{children}</div>
  ),
  Milkdown: () => <div data-testid="milkdown-editor" />,
  useEditor: (cb: (root: HTMLElement) => unknown) => {
    captured.editorCallback = cb;
    captured.editorCallbackHistory.push(cb);
    return { get: () => null };
  },
}));

import React from 'react';
import { MarkdownEditor } from '../../src/components/MarkdownEditor.js';

describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.editorCallbackHistory = [];
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

  it('always calls on() even when onChange is not provided (ref-based listener)', () => {
    // After the fix, crepe.on() is always registered because the implementation
    // uses a ref (onChangeRef.current?.(md)) instead of closing over onChange.
    // This means the listener is always installed and safely no-ops when onChange is undefined.
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockOn).toHaveBeenCalledTimes(1);
  });

  it('does not crash when listener fires with no onChange provided', () => {
    // After the fix, the listener uses onChangeRef.current?.(md) which safely
    // handles undefined onChange without crashing.
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // Get the listener setup function
    const listenerSetupFn = (mockOn.mock.calls[0] as unknown[])[0] as (listener: {
      markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void;
    }) => void;

    const mockMarkdownUpdated = vi.fn();
    listenerSetupFn({ markdownUpdated: mockMarkdownUpdated });

    expect(mockMarkdownUpdated).toHaveBeenCalledTimes(1);
    const registeredCb = (mockMarkdownUpdated.mock.calls[0] as unknown[])[0] as (
      ctx: unknown,
      md: string,
    ) => void;

    // Should not throw even though onChange is not provided
    expect(() => {
      registeredCb(null, '# some markdown');
    }).not.toThrow();
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

  it('registers onChange listener even when collaboration is provided', () => {
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

    // In collaboration mode, onChange should still be registered
    expect(mockOn).toHaveBeenCalledTimes(1);

    // Verify the listener fires correctly
    const listenerSetupFn = (mockOn.mock.calls[0] as unknown[])[0] as (listener: {
      markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void;
    }) => void;

    const mockMarkdownUpdated = vi.fn();
    listenerSetupFn({ markdownUpdated: mockMarkdownUpdated });

    expect(mockMarkdownUpdated).toHaveBeenCalledTimes(1);
    const registeredCb = (mockMarkdownUpdated.mock.calls[0] as unknown[])[0] as (
      ctx: unknown,
      md: string,
    ) => void;

    registeredCb(null, '# Collab update');
    expect(onChange).toHaveBeenCalledWith('# Collab update');
  });

  it('renders wrapper with data-testid and menu CSS overrides', () => {
    // This test verifies the wrapper Box has data-testid="markdown-editor-wrapper"
    // and that MUI sx classes are applied. The sx prop includes CSS overrides for:
    //   .milkdown-slash-menu { position: fixed; z-index: 1300 }
    //   .milkdown-toolbar { position: fixed; z-index: 1300 }
    // These overrides ensure Milkdown menus escape overflow:auto containers.
    render(<MarkdownEditor />);
    const wrapper = screen.getByTestId('markdown-editor-wrapper');
    expect(wrapper).toBeInTheDocument();
    // MUI Box with sx generates className-based styles; verify the element has classes applied
    expect(wrapper.className).not.toBe('');
  });

  it('uses actual defaultValue in collaboration mode', async () => {
    captured.editorCallback = null;

    render(
      <MarkdownEditor
        defaultValue="# Collab content"
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

    // Verify Crepe was called with the actual defaultValue, not empty string
    const { Crepe: CrepeMock } = await import('@milkdown/crepe');
    expect(CrepeMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultValue: '# Collab content' }),
    );
  });

  it('calls onEditorReady with crepe instance when provided', () => {
    captured.editorCallback = null;
    const onEditorReady = vi.fn();

    render(<MarkdownEditor onEditorReady={onEditorReady} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(onEditorReady).toHaveBeenCalledTimes(1);
    // Verify it was called with a Crepe-like object
    expect(onEditorReady.mock.calls[0]?.[0]).toBeDefined();
  });

  it('does not throw when onEditorReady is not provided', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    expect(() => {
      editorCb?.(fakeRoot);
    }).not.toThrow();
  });

  it('installs comment plugin via editor.use when onSelectionChange provided', () => {
    captured.editorCallback = null;
    const onSelectionChange = vi.fn();

    render(<MarkdownEditor onSelectionChange={onSelectionChange} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockCreateCommentPlugin).toHaveBeenCalledWith({ onSelectionChange });
    expect(mockEditorUse).toHaveBeenCalled();
  });

  it('does not install comment plugin when onSelectionChange is not provided', () => {
    captured.editorCallback = null;
    mockCreateCommentPlugin.mockClear();
    mockEditorUse.mockClear();

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockCreateCommentPlugin).not.toHaveBeenCalled();
    expect(mockEditorUse).not.toHaveBeenCalled();
  });

  it('installs yUndoPlugin via editor.use when collaboration is provided', () => {
    captured.editorCallback = null;
    mockEditorUse.mockClear();
    mockYUndoPlugin.mockClear();

    render(
      <MarkdownEditor
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

    expect(mockYUndoPlugin).toHaveBeenCalled();
    expect(mockEditorUse).toHaveBeenCalled();
  });

  it('does not install yUndoPlugin when collaboration is not provided', () => {
    captured.editorCallback = null;
    mockEditorUse.mockClear();
    mockYUndoPlugin.mockClear();

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockYUndoPlugin).not.toHaveBeenCalled();
  });

  it('does not re-create editorCallback when onChange identity changes (stable ref)', () => {
    // After the fix, editorCallback depends only on [isCollaborative], not on
    // onChange/onEditorReady/defaultValue/etc. Changing onChange identity should
    // NOT produce a new callback reference.
    captured.editorCallbackHistory = [];

    const onChange1 = vi.fn();
    const onChange2 = vi.fn();

    const { rerender } = render(<MarkdownEditor onChange={onChange1} />);

    // Capture the callback after first render
    expect(captured.editorCallbackHistory.length).toBeGreaterThanOrEqual(1);
    const firstCallback = captured.editorCallbackHistory[captured.editorCallbackHistory.length - 1];

    // Re-render with a different onChange function identity
    rerender(<MarkdownEditor onChange={onChange2} />);

    // Capture the callback after second render
    const lastCallback = captured.editorCallbackHistory[captured.editorCallbackHistory.length - 1];

    // The callback reference should be the same (stable) because
    // onChange is stored in a ref, not a dependency
    expect(lastCallback).toBe(firstCallback);
  });

  it('uses latest onChange via ref even after identity change', () => {
    // After the fix, even though editorCallback is stable, it should use the
    // latest onChange function via a ref. This means:
    // 1. Render with onChange1, create editor, fire listener -> calls onChange1
    // 2. Rerender with onChange2, fire listener again -> calls onChange2 (not onChange1)
    captured.editorCallback = null;

    const onChange1 = vi.fn();
    const onChange2 = vi.fn();

    const { rerender } = render(<MarkdownEditor onChange={onChange1} />);

    // Trigger the editor callback to set up the listener
    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // Get the listener
    expect(mockOn).toHaveBeenCalledTimes(1);
    const listenerSetupFn = (mockOn.mock.calls[0] as unknown[])[0] as (listener: {
      markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void;
    }) => void;

    const mockMarkdownUpdated = vi.fn();
    listenerSetupFn({ markdownUpdated: mockMarkdownUpdated });
    const registeredCb = (mockMarkdownUpdated.mock.calls[0] as unknown[])[0] as (
      ctx: unknown,
      md: string,
    ) => void;

    // Fire with onChange1 active
    registeredCb(null, '# first');
    expect(onChange1).toHaveBeenCalledWith('# first');

    // Rerender with onChange2
    rerender(<MarkdownEditor onChange={onChange2} />);

    // Fire again — should call onChange2 via the updated ref
    registeredCb(null, '# second');
    expect(onChange2).toHaveBeenCalledWith('# second');
  });
});
