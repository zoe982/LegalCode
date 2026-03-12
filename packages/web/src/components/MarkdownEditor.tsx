import { useRef, useCallback } from 'react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { $prose } from '@milkdown/kit/utils';
import { Box } from '@mui/material';
import { createCommentPlugin } from '../editor/commentPlugin.js';
import type { CommentPluginOptions } from '../editor/commentPlugin.js';
import { createNumberingPlugin } from '../editor/numberingPlugin.js';
import { createTitlePlugin } from '../editor/titleNode.js';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import '../theme/editor.css';

interface MarkdownEditorProps {
  defaultValue?: string | undefined;
  onChange?: ((markdown: string) => void) | undefined;
  readOnly?: boolean | undefined;
  onEditorReady?: ((crepe: Crepe) => void) | undefined;
  onSelectionChange?: CommentPluginOptions['onSelectionChange'] | undefined;
}

function MilkdownEditor({
  defaultValue,
  onChange,
  readOnly,
  onEditorReady,
  onSelectionChange,
}: MarkdownEditorProps) {
  const crepeRef = useRef<Crepe | null>(null);

  const onChangeRef = useRef(onChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const defaultValueRef = useRef(defaultValue);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const readOnlyRef = useRef(readOnly);

  onChangeRef.current = onChange;
  onEditorReadyRef.current = onEditorReady;
  defaultValueRef.current = defaultValue;
  onSelectionChangeRef.current = onSelectionChange;
  readOnlyRef.current = readOnly;

  const editorCallback = useCallback((root: HTMLElement) => {
    const crepe = new Crepe({
      root,
      defaultValue: defaultValueRef.current ?? '',
      features: {
        [CrepeFeature.Toolbar]: false,
      },
    });

    // Always register the listener, use ref for onChange
    crepe.on((listener: { markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void }) => {
      listener.markdownUpdated((_ctx: unknown, md: string) => {
        onChangeRef.current?.(md);
      });
    });

    if (readOnlyRef.current === true) {
      crepe.setReadonly(true);
    }

    crepe.editor.use($prose(() => createTitlePlugin()));
    crepe.editor.use($prose(() => createNumberingPlugin()));

    if (onSelectionChangeRef.current) {
      const selectionChangeFn = onSelectionChangeRef.current;
      crepe.editor.use($prose(() => createCommentPlugin({ onSelectionChange: selectionChangeFn })));
    }

    crepeRef.current = crepe;
    onEditorReadyRef.current?.(crepe);

    return crepe;
  }, []);

  useEditor(editorCallback, []);

  return <Milkdown />;
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <Box
      data-testid="markdown-editor-wrapper"
      sx={{
        width: '100%',
        minHeight: 300,
        '& .milkdown': {
          width: '100%',
          minHeight: 300,
        },
        '& .milkdown-slash-menu': {
          position: 'fixed',
          zIndex: 1300,
        },
      }}
    >
      <MilkdownProvider>
        <MilkdownEditor
          defaultValue={props.defaultValue}
          onChange={props.onChange}
          readOnly={props.readOnly}
          onEditorReady={props.onEditorReady}
          onSelectionChange={props.onSelectionChange}
        />
      </MilkdownProvider>
    </Box>
  );
}
