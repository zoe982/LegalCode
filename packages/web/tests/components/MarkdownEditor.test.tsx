/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock CSS imports that Milkdown uses
vi.mock('@milkdown/crepe/theme/common/style.css', () => ({}));
vi.mock('@milkdown/crepe/theme/frame.css', () => ({}));
vi.mock('../../src/theme/editor.css', () => ({}));

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

const mockCreateCommentPlugin = vi.fn().mockReturnValue({ key: 'mock-comment-plugin' });
vi.mock('../../src/editor/commentPlugin.js', () => ({
  createCommentPlugin: (...args: unknown[]) => mockCreateCommentPlugin(...args) as unknown,
}));

const mockCreateNumberingPlugin = vi.fn().mockReturnValue({ key: 'mock-numbering-plugin' });
vi.mock('../../src/editor/numberingPlugin.js', () => ({
  createNumberingPlugin: (...args: unknown[]) => mockCreateNumberingPlugin(...args) as unknown,
}));

const mockCreateTitlePlugin = vi.fn().mockReturnValue({ key: 'mock-title-plugin' });
vi.mock('../../src/editor/titleNode.js', () => ({
  createTitlePlugin: (...args: unknown[]) => mockCreateTitlePlugin(...args) as unknown,
  titleSchemaPlugin: { id: 'title', type: '$node' },
  remarkTitlePlugin: { id: 'titleSyntax', type: '$remark' },
}));

vi.mock('../../src/editor/legalListNode.js', () => ({
  legalListSchemaPlugin: { id: 'legal_list', type: '$node' },
  remarkLegalListPlugin: { id: 'legalListSyntax', type: '$remark' },
}));

const mockCreateSuggestionPlugin = vi.fn().mockReturnValue({ key: 'mock-suggestion-plugin' });
vi.mock('../../src/editor/suggestionPlugin.js', () => ({
  createSuggestionPlugin: (...args: unknown[]) => mockCreateSuggestionPlugin(...args) as unknown,
  suggestionPluginKey: { key: 'suggestionPlugin' },
}));

const mockCreatePresenceCursorsPlugin = vi
  .fn()
  .mockReturnValue({ key: 'mock-presence-cursors-plugin' });
vi.mock('../../src/editor/presenceCursorsPlugin.js', () => ({
  createPresenceCursorsPlugin: (...args: unknown[]) =>
    mockCreatePresenceCursorsPlugin(...args) as unknown,
  presenceCursorsKey: { key: 'presenceCursors' },
}));

vi.mock('../../src/editor/suggestionAnchors.js', () => ({
  resolveSuggestionAnchors: vi.fn().mockReturnValue([]),
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

    // Comment plugin is NOT installed without onSelectionChange
    expect(mockCreateCommentPlugin).not.toHaveBeenCalled();
    // editor.use IS called 8 times: titleSchemaPlugin, remarkTitlePlugin, legalListSchemaPlugin, remarkLegalListPlugin, title decoration plugin, numbering plugin, suggestion plugin, presence cursors plugin
    expect(mockEditorUse).toHaveBeenCalledTimes(8);
    expect(mockCreateTitlePlugin).toHaveBeenCalledTimes(1);
    expect(mockCreateNumberingPlugin).toHaveBeenCalledTimes(1);
  });

  it('never installs yUndoPlugin (no collaboration plugin)', () => {
    captured.editorCallback = null;
    mockEditorUse.mockClear();
    mockCreateNumberingPlugin.mockClear();
    mockCreateCommentPlugin.mockClear();

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // Always-on plugins: titleSchema, remarkTitle, legalListSchema, remarkLegalList, title decoration, numbering, suggestion, presence cursors; no comment plugin, no collab plugin
    expect(mockEditorUse).toHaveBeenCalledTimes(8);
    expect(mockCreateTitlePlugin).toHaveBeenCalledTimes(1);
    expect(mockCreateNumberingPlugin).toHaveBeenCalledTimes(1);
    expect(mockCreateCommentPlugin).not.toHaveBeenCalled();
  });

  it('installs suggestion plugin when editor is created', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockCreateSuggestionPlugin).toHaveBeenCalledTimes(1);
  });

  it('installs presence cursors plugin when editor is created', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockCreatePresenceCursorsPlugin).toHaveBeenCalledTimes(1);
  });

  it('renders with suggestingMode prop without error', () => {
    expect(() => {
      render(<MarkdownEditor suggestingMode={true} />);
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('renders with onSuggestInsert and onSuggestDelete callbacks without error', () => {
    const onSuggestInsert = vi.fn();
    const onSuggestDelete = vi.fn();
    expect(() => {
      render(
        <MarkdownEditor onSuggestInsert={onSuggestInsert} onSuggestDelete={onSuggestDelete} />,
      );
    }).not.toThrow();
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('does not re-create editorCallback when onChange identity changes (stable ref)', () => {
    // After the fix, editorCallback depends only on [] (no deps besides stable refs),
    // not on onChange/onEditorReady/defaultValue/etc. Changing onChange identity should
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

  it('invokes onSuggestInsert callback via the suggestion plugin wrapper', () => {
    captured.editorCallback = null;
    const onSuggestInsert = vi.fn();

    render(<MarkdownEditor onSuggestInsert={onSuggestInsert} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    // createSuggestionPlugin is called with an object containing onSuggestInsert and onSuggestDelete wrappers
    expect(mockCreateSuggestionPlugin).toHaveBeenCalledTimes(1);
    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    // Invoke the wrapper — should call our onSuggestInsert fn
    pluginOpts.onSuggestInsert(0, 5, 'inserted text');
    expect(onSuggestInsert).toHaveBeenCalledWith(0, 5, 'inserted text');
  });

  it('invokes onSuggestDelete callback via the suggestion plugin wrapper', () => {
    captured.editorCallback = null;
    const onSuggestDelete = vi.fn();

    render(<MarkdownEditor onSuggestDelete={onSuggestDelete} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    expect(mockCreateSuggestionPlugin).toHaveBeenCalledTimes(1);
    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    // Invoke the wrapper — should call our onSuggestDelete fn
    pluginOpts.onSuggestDelete(3, 8, 'deleted text');
    expect(onSuggestDelete).toHaveBeenCalledWith(3, 8, 'deleted text');
  });

  it('does not crash when onSuggestInsert wrapper is called without a handler', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    // Should not throw when no onSuggestInsert provided
    expect(() => {
      pluginOpts.onSuggestInsert(0, 5, 'text');
    }).not.toThrow();
  });

  it('does not crash when onSuggestDelete wrapper is called without a handler', () => {
    captured.editorCallback = null;

    render(<MarkdownEditor />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    // Should not throw when no onSuggestDelete provided
    expect(() => {
      pluginOpts.onSuggestDelete(0, 5, 'text');
    }).not.toThrow();
  });

  it('uses latest onSuggestInsert via ref after identity change', () => {
    captured.editorCallback = null;
    const onSuggestInsert1 = vi.fn();
    const onSuggestInsert2 = vi.fn();

    const { rerender } = render(<MarkdownEditor onSuggestInsert={onSuggestInsert1} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    pluginOpts.onSuggestInsert(0, 3, 'first');
    expect(onSuggestInsert1).toHaveBeenCalledWith(0, 3, 'first');

    // Re-render with new handler — ref should be updated
    rerender(<MarkdownEditor onSuggestInsert={onSuggestInsert2} />);

    pluginOpts.onSuggestInsert(0, 3, 'second');
    expect(onSuggestInsert2).toHaveBeenCalledWith(0, 3, 'second');
    expect(onSuggestInsert1).toHaveBeenCalledTimes(1); // not called again
  });

  it('uses latest onSuggestDelete via ref after identity change', () => {
    captured.editorCallback = null;
    const onSuggestDelete1 = vi.fn();
    const onSuggestDelete2 = vi.fn();

    const { rerender } = render(<MarkdownEditor onSuggestDelete={onSuggestDelete1} />);

    const editorCb = captured.editorCallback as ((root: HTMLElement) => unknown) | null;
    expect(editorCb).not.toBeNull();
    const fakeRoot = document.createElement('div');
    editorCb?.(fakeRoot);

    const pluginOpts = (
      mockCreateSuggestionPlugin.mock.calls[0] as [
        {
          onSuggestInsert: (from: number, to: number, text: string) => void;
          onSuggestDelete: (from: number, to: number, text: string) => void;
        },
      ]
    )[0];

    pluginOpts.onSuggestDelete(0, 3, 'first');
    expect(onSuggestDelete1).toHaveBeenCalledWith(0, 3, 'first');

    rerender(<MarkdownEditor onSuggestDelete={onSuggestDelete2} />);

    pluginOpts.onSuggestDelete(0, 3, 'second');
    expect(onSuggestDelete2).toHaveBeenCalledWith(0, 3, 'second');
    expect(onSuggestDelete1).toHaveBeenCalledTimes(1);
  });

  it('uses latest onSuggestInsert via ref even after identity change', () => {
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
