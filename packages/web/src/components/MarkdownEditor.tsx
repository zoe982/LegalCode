import { useRef, useCallback } from 'react';
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Box } from '@mui/material';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

interface MarkdownEditorProps {
  defaultValue?: string | undefined;
  onChange?: ((markdown: string) => void) | undefined;
  readOnly?: boolean | undefined;
}

function MilkdownEditor({ defaultValue, onChange, readOnly }: MarkdownEditorProps) {
  const crepeRef = useRef<Crepe | null>(null);

  const editorCallback = useCallback(
    (root: HTMLElement) => {
      const crepe = new Crepe({
        root,
        defaultValue: defaultValue ?? '',
      });

      if (onChange) {
        crepe.on(
          (listener: { markdownUpdated: (cb: (ctx: unknown, md: string) => void) => void }) => {
            listener.markdownUpdated((_ctx: unknown, md: string) => {
              onChange(md);
            });
          },
        );
      }

      if (readOnly === true) {
        crepe.setReadonly(true);
      }

      crepeRef.current = crepe;

      return crepe;
    },
    [defaultValue, onChange, readOnly],
  );

  useEditor(editorCallback, []);

  return <Milkdown />;
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 300,
        '& .milkdown': {
          width: '100%',
          minHeight: 300,
        },
      }}
    >
      <MilkdownProvider>
        <MilkdownEditor
          defaultValue={props.defaultValue}
          onChange={props.onChange}
          readOnly={props.readOnly}
        />
      </MilkdownProvider>
    </Box>
  );
}
