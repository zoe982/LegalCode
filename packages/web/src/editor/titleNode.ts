import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import type { Node } from '@milkdown/kit/prose/model';
import { $node, $remark } from '@milkdown/kit/utils';

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

// ---------------------------------------------------------------------------
// Milkdown $node schema plugin — registers 'title' in the editor schema
// ---------------------------------------------------------------------------

/**
 * Milkdown node schema plugin that registers the `title` node type.
 *
 * - **parseMarkdown**: converts mdast `title` nodes (created by `remarkTitlePlugin`)
 *   into ProseMirror title nodes.
 * - **toMarkdown**: serializes ProseMirror title nodes back to mdast paragraphs
 *   with a `% ` text prefix, which renders as `% Title Text` in markdown.
 */
export const titleSchemaPlugin = $node('title', () => ({
  group: 'block',
  content: 'inline*',
  defining: true,
  parseDOM: [{ tag: 'div[data-type="title"]' }],
  toDOM: () => ['div', { 'data-type': 'title', class: 'legal-title' }, 0] as const,
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'title',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any, type: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.openNode(type);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.next(node.children);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.closeNode();
    },
  },
  toMarkdown: {
    match: (node: { type: { name: string } }) => node.type.name === 'title',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.openNode('paragraph');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.addNode('text', undefined, '% ');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.next(node.content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.closeNode();
    },
  },
}));

// ---------------------------------------------------------------------------
// Remark plugin — converts `% text` markdown syntax to title mdast nodes
// ---------------------------------------------------------------------------

interface MdastTextNode {
  type: string;
  value: string;
}

interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
}

/**
 * Simple tree walker for mdast trees. Visits all nodes of a given type.
 * Replaces `unist-util-visit` to avoid an extra dependency.
 */
function visitParagraphs(
  tree: MdastNode,
  callback: (node: MdastNode, index: number, parent: MdastNode) => void,
): void {
  if (!tree.children) return;
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    if (!child) continue;
    if (child.type === 'paragraph') {
      callback(child, i, tree);
    }
    // Recurse into children
    if (child.children) {
      visitParagraphs(child, callback);
    }
  }
}

/**
 * Remark plugin that transforms markdown paragraphs starting with `% ` into
 * `title` mdast nodes. This enables round-trip markdown serialization:
 *
 *   `% Master Agreement`  →  mdast `{ type: 'title', children: [...] }`
 *
 * On the serialize side, `titleSchemaPlugin.toMarkdown` converts ProseMirror
 * title nodes back to mdast paragraphs with the `% ` prefix.
 */
export const remarkTitlePlugin = $remark('titleSyntax', () => () => (tree: unknown) => {
  visitParagraphs(tree as MdastNode, (node: MdastNode) => {
    const firstChild = node.children?.[0] as MdastTextNode | undefined;
    if (
      firstChild?.type === 'text' &&
      typeof firstChild.value === 'string' &&
      firstChild.value.startsWith('% ')
    ) {
      // Strip the "% " prefix from the first text child
      firstChild.value = firstChild.value.slice(2);
      // If empty after stripping, remove the text node
      if (firstChild.value === '') {
        node.children?.shift();
      }
      // Change the node type to 'title'
      node.type = 'title';
    }
  });
});

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
