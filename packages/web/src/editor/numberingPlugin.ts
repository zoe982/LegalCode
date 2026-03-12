import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import type { Node } from '@milkdown/kit/prose/model';
import { extractHeadingTree } from './headingTree.js';

export const numberingPluginKey = new PluginKey<DecorationSet>('numberingPlugin');

export function createNumberingPlugin(): Plugin {
  return new Plugin({
    key: numberingPluginKey,
    state: {
      init(_: unknown, state: { doc: Node }) {
        return buildDecorations(state.doc);
      },
      apply(tr: { docChanged: boolean; doc: Node }, prev: DecorationSet) {
        if (!tr.docChanged) return prev;
        return buildDecorations(tr.doc);
      },
    },
    props: {
      decorations(state) {
        return numberingPluginKey.getState(state) ?? DecorationSet.empty;
      },
    },
  });
}

function buildDecorations(doc: Node): DecorationSet {
  const entries = extractHeadingTree(doc);
  if (entries.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  for (const entry of entries) {
    // Node decoration: bold/body class for all non-title entries
    if (!entry.isTitle) {
      const node = doc.nodeAt(entry.pos);
      if (node) {
        decorations.push(
          Decoration.node(entry.pos, entry.pos + node.nodeSize, {
            class: entry.level % 2 === 1 ? 'legal-heading-bold' : 'legal-heading-body',
          }),
        );
      }
    }

    // Widget decoration: number label for entries with non-empty number
    if (entry.number !== '') {
      decorations.push(
        Decoration.widget(
          entry.pos + 1,
          () => {
            const span = document.createElement('span');
            span.className = 'legal-numbering';
            span.textContent = entry.number;
            span.contentEditable = 'false';
            return span;
          },
          { side: -1 },
        ),
      );
    }
  }

  if (decorations.length === 0) return DecorationSet.empty;
  return DecorationSet.create(doc, decorations);
}
