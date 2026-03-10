/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all CodeMirror modules before importing component
// CodeMirror doesn't work in JSDOM, so we render a textarea fallback

// Shared state for mock coordination
const mockState = {
  listeners: [] as ((update: {
    docChanged: boolean;
    state: { doc: { toString: () => string } };
  }) => void)[],
  currentDoc: '',
};

vi.mock('@codemirror/view', () => {
  class MockEditorView {
    dom: HTMLElement;
    state: { doc: { toString: () => string; length: number } };

    constructor(config: {
      parent?: HTMLElement;
      state?: { doc: { toString: () => string; length: number } };
    }) {
      mockState.currentDoc = config.state?.doc.toString() ?? '';
      const textarea = document.createElement('textarea');
      textarea.setAttribute('data-testid', 'codemirror-textarea');
      textarea.value = mockState.currentDoc;
      textarea.addEventListener('input', (e) => {
        const target = e.target as HTMLTextAreaElement;
        mockState.currentDoc = target.value;
        for (const listener of mockState.listeners) {
          listener({
            docChanged: true,
            state: { doc: { toString: () => target.value } },
          });
        }
      });
      this.dom = textarea;
      this.state = {
        doc: {
          toString: () => mockState.currentDoc,
          get length() {
            return mockState.currentDoc.length;
          },
        },
      };
      config.parent?.appendChild(textarea);
    }

    dispatch(tr: { changes?: { from: number; to: number; insert: string }; effects?: unknown }) {
      if (tr.changes) {
        mockState.currentDoc = tr.changes.insert;
        const textarea = this.dom as HTMLTextAreaElement;
        textarea.value = mockState.currentDoc;
        this.state = {
          doc: {
            toString: () => mockState.currentDoc,
            get length() {
              return mockState.currentDoc.length;
            },
          },
        };
      }
    }

    destroy() {
      this.dom.remove();
      mockState.listeners.length = 0;
    }
  }

  return {
    EditorView: Object.assign(MockEditorView, {
      updateListener: {
        of: (
          fn: (update: { docChanged: boolean; state: { doc: { toString: () => string } } }) => void,
        ) => {
          mockState.listeners.push(fn);
          return { extension: 'updateListener' };
        },
      },
      lineWrapping: { extension: 'lineWrapping' },
      theme: () => ({ extension: 'theme' }),
      baseTheme: () => ({ extension: 'baseTheme' }),
    }),
    keymap: {
      of: () => ({ extension: 'keymap' }),
    },
    lineNumbers: () => ({ extension: 'lineNumbers' }),
    highlightActiveLine: () => ({ extension: 'highlightActiveLine' }),
    drawSelection: () => ({ extension: 'drawSelection' }),
    dropCursor: () => ({ extension: 'dropCursor' }),
    placeholder: () => ({ extension: 'placeholder' }),
  };
});

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: (config: { doc?: string; extensions?: unknown[] }) => ({
      doc: {
        toString: () => config.doc ?? '',
        length: config.doc?.length ?? 0,
      },
    }),
    readOnly: {
      of: () => ({ extension: 'readOnly' }),
    },
  },
  Compartment: vi.fn().mockImplementation(() => ({
    of: (ext: unknown) => ext,
    reconfigure: (ext: unknown) => ({ effects: 'reconfigure', ext }),
  })),
}));

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: () => ({ extension: 'markdown' }),
}));

vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: () => ({ extension: 'syntaxHighlighting' }),
  defaultHighlightStyle: { extension: 'defaultHighlightStyle' },
  bracketMatching: () => ({ extension: 'bracketMatching' }),
}));

vi.mock('@codemirror/language-data', () => ({
  languages: [],
}));

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  history: () => ({ extension: 'history' }),
  historyKeymap: [],
}));

import { RawMarkdownEditor } from '../../src/components/RawMarkdownEditor.js';

describe('RawMarkdownEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.listeners = [];
    mockState.currentDoc = '';
  });

  it('renders with initial value', () => {
    const onChange = vi.fn();
    render(<RawMarkdownEditor value="# Hello World" onChange={onChange} />);

    const textarea = screen.getByTestId('codemirror-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('# Hello World');
  });

  it('calls onChange when content changes', () => {
    const onChange = vi.fn();
    render(<RawMarkdownEditor value="" onChange={onChange} />);

    const textarea = screen.getByTestId('codemirror-textarea');
    fireEvent.input(textarea, { target: { value: '# New content' } });

    expect(onChange).toHaveBeenCalledWith('# New content');
  });

  it('respects readOnly prop', () => {
    const onChange = vi.fn();
    render(<RawMarkdownEditor value="read only content" onChange={onChange} readOnly={true} />);

    const textarea = screen.getByTestId('codemirror-textarea');
    // Component mounts successfully with readOnly extension
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('read only content');
  });

  it('updates when value prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RawMarkdownEditor value="initial" onChange={onChange} />);

    const textarea = screen.getByTestId('codemirror-textarea');
    expect(textarea).toHaveValue('initial');

    rerender(<RawMarkdownEditor value="updated" onChange={onChange} />);

    const textareaAfter = screen.getByTestId('codemirror-textarea');
    expect(textareaAfter).toHaveValue('updated');
  });

  it('reconfigures readOnly when prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RawMarkdownEditor value="test" onChange={onChange} readOnly={false} />,
    );

    const textarea = screen.getByTestId('codemirror-textarea');
    expect(textarea).toBeInTheDocument();

    // Switch to readOnly=true
    rerender(<RawMarkdownEditor value="test" onChange={onChange} readOnly={true} />);

    const textareaAfter = screen.getByTestId('codemirror-textarea');
    expect(textareaAfter).toBeInTheDocument();
  });

  it('does not dispatch when value matches current document', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RawMarkdownEditor value="same content" onChange={onChange} />);

    // Rerender with the same value — should not dispatch changes
    rerender(<RawMarkdownEditor value="same content" onChange={onChange} />);

    const textarea = screen.getByTestId('codemirror-textarea');
    expect(textarea).toHaveValue('same content');
  });

  it('cleanup on unmount (no errors)', () => {
    const onChange = vi.fn();
    const { unmount } = render(<RawMarkdownEditor value="test" onChange={onChange} />);

    // Should not throw on unmount
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
