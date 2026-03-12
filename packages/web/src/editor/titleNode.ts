import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import type { Node } from '@milkdown/kit/prose/model';

/**
 * ProseMirror NodeSpec for the custom 'title' node type.
 *
 * This is exported separately so that it can be registered in a Milkdown
 * schema extension (via `$node` or `$nodeSchema`). The title node represents
 * a document title or annex section title — it is distinct from headings.
 *
 * In the DOM it renders as `<div data-type="title" class="legal-title">`.
 */
export const titleNodeSpec = {
  group: 'block',
  content: 'inline*',
  defining: true,
  parseDOM: [{ tag: 'div[data-type="title"]' }],
  toDOM: () => ['div', { 'data-type': 'title', class: 'legal-title' }, 0] as const,
} as const;

export const titlePluginKey = new PluginKey<DecorationSet>('titlePlugin');

/**
 * ProseMirror plugin that adds node decorations to title nodes.
 *
 * Title nodes (`node.type.name === 'title'`) receive a decoration with
 * `class: 'legal-title'` and `data-type: 'title'` so they can be styled
 * distinctly from headings. The headingTree module detects these nodes
 * by their type name and assigns them `isTitle: true` with an empty number.
 */
export function createTitlePlugin(): Plugin {
  return new Plugin({
    key: titlePluginKey,
    state: {
      init(_: unknown, state: { doc: Node }) {
        return buildTitleDecorations(state.doc);
      },
      apply(tr: { docChanged: boolean; doc: Node }, prev: DecorationSet) {
        if (!tr.docChanged) return prev;
        return buildTitleDecorations(tr.doc);
      },
    },
    props: {
      decorations(state) {
        return titlePluginKey.getState(state) ?? DecorationSet.empty;
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Minimal shape for iterating top-level nodes in the document. */
interface DocLike {
  forEach: (cb: (node: NodeLike, offset: number, index: number) => void) => void;
  nodeAt: (pos: number) => NodeLike | null;
}

interface NodeLike {
  type: { name: string };
  nodeSize: number;
}

function buildTitleDecorations(doc: Node): DecorationSet {
  const docLike = doc as unknown as DocLike;
  const decorations: Decoration[] = [];

  docLike.forEach((node, offset) => {
    if (node.type.name !== 'title') return;

    const resolved = docLike.nodeAt(offset);
    if (!resolved) return;

    decorations.push(
      Decoration.node(offset, offset + resolved.nodeSize, {
        class: 'legal-title',
        'data-type': 'title',
      }),
    );
  });

  if (decorations.length === 0) return DecorationSet.empty;
  return DecorationSet.create(doc, decorations);
}
