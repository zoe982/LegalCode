import { useRef, useEffect, useCallback } from 'react';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  placeholder,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

interface RawMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean | undefined;
}

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#FFFFFF',
    color: '#12111A',
    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    fontSize: '14px',
  },
  '.cm-content': {
    caretColor: '#8027FF',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#8027FF',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(128, 39, 255, 0.15)',
  },
  '.cm-gutters': {
    backgroundColor: '#F9F9FB',
    color: '#9B9DB0',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#F3F3F7',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(128, 39, 255, 0.04)',
  },
});

export function RawMarkdownEditor({ value, onChange, readOnly = false }: RawMarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyCompartment = useRef(new Compartment());

  // Keep onChange ref current
  onChangeRef.current = onChange;

  const getExtensions = useCallback(
    (isReadOnly: boolean) => [
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      dropCursor(),
      EditorState.readOnly.of(isReadOnly),
      readOnlyCompartment.current.of(EditorState.readOnly.of(isReadOnly)),
      EditorView.lineWrapping,
      history(),
      bracketMatching(),
      markdown({ codeLanguages: languages }),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      placeholder('Start writing markdown...'),
      editorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const doc = update.state.doc.toString();
          onChangeRef.current(doc);
        }
      }),
    ],
    // readOnlyCompartment is a ref, stable across renders
    [],
  );

  // Initialize EditorView
  useEffect(() => {
    /* v8 ignore next -- defensive guard; containerRef is always set after mount */
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: getExtensions(readOnly),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount/unmount
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    /* v8 ignore next -- defensive guard; view is always set after mount */
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Reconfigure readOnly when it changes
  useEffect(() => {
    const view = viewRef.current;
    /* v8 ignore next -- defensive guard; view is always set after mount */
    if (!view) return;

    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      data-testid="raw-markdown-editor"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
