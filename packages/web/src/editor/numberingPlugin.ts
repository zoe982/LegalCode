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

  const decorations = entries.map((entry) => {
    // Widget position: entry.pos + 1 (inside the heading node, before text content)
    return Decoration.widget(
      entry.pos + 1,
      () => {
        const span = document.createElement('span');
        span.className = 'legal-numbering';
        span.textContent = entry.number;
        span.contentEditable = 'false';
        return span;
      },
      { side: -1 },
    );
  });

  return DecorationSet.create(doc, decorations);
}
