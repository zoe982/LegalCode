import { $node, $remark } from '@milkdown/kit/utils';
import { VARIABLE_REF_REGEX } from './variableUtils.js';

// ---------------------------------------------------------------------------
// Milkdown $node schema plugin — registers 'variable_ref' in the editor schema
// ---------------------------------------------------------------------------

/**
 * Milkdown node schema plugin that registers the `variable_ref` node type.
 *
 * - **parseMarkdown**: converts mdast `variableRef` nodes (created by
 *   `remarkVariablePlugin`) into ProseMirror variable_ref atomic inline nodes.
 * - **toMarkdown**: serializes ProseMirror variable_ref nodes back to mdast
 *   text nodes with the `{{var:id}}` syntax for round-trip fidelity.
 */
export const variableSchemaPlugin = $node('variable_ref', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    variableId: { default: '' },
  },
  parseDOM: [
    {
      tag: 'span[data-variable-id]',
      getAttrs: (dom: Element) => ({
        variableId: dom.getAttribute('data-variable-id') ?? '',
      }),
    },
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toDOM: (rawNode: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const variableId = String(rawNode.attrs.variableId ?? '');
    return [
      'span',
      { 'data-variable-id': variableId, class: 'variable-chip', contenteditable: 'false' },
      `{{${variableId}}}`,
    ] as const;
  },
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'variableRef',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any, type: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const variableId: string = node.variableId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.addNode(type, { variableId });
    },
  },
  toMarkdown: {
    match: (node: { type: { name: string } }) => node.type.name === 'variable_ref',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const id = String(node.attrs.variableId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.addNode('text', undefined, `{{var:${id}}}`);
    },
  },
}));

// ---------------------------------------------------------------------------
// mdast types for the remark plugin
// ---------------------------------------------------------------------------

interface MdastTextNode {
  type: 'text';
  value: string;
}

interface MdastVariableRefNode {
  type: 'variableRef';
  variableId: string;
}

type MdastInlineNode = MdastTextNode | MdastVariableRefNode | MdastGenericNode;

interface MdastGenericNode {
  type: string;
  children?: MdastInlineNode[];
  value?: string;
  variableId?: string;
}

interface MdastRootNode {
  type: string;
  children?: MdastGenericNode[];
}

// ---------------------------------------------------------------------------
// Inline node types that can contain text children we should split
// ---------------------------------------------------------------------------

const INLINE_CONTAINER_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'tableCell',
  'definition',
  'footnoteDefinition',
]);

// ---------------------------------------------------------------------------
// splitTextNode
// Splits a single mdast text node into a sequence of text + variableRef nodes.
// If the text contains no variable references, returns the original node
// in a single-element array (avoids unnecessary allocation).
// ---------------------------------------------------------------------------

function splitTextNode(node: MdastTextNode): MdastInlineNode[] {
  const { value } = node;
  if (value === '') return [node];

  // Reset lastIndex before exec loop
  const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);

  const parts: MdastInlineNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    const variableId = match[1];

    /* v8 ignore next */
    if (variableId === undefined) continue;

    // Text segment before this match
    if (matchStart > lastIndex) {
      parts.push({ type: 'text', value: value.slice(lastIndex, matchStart) });
    }

    parts.push({ type: 'variableRef', variableId });

    lastIndex = matchEnd;
  }

  // No matches found — return original unchanged
  if (parts.length === 0) return [node];

  // Trailing text after last match
  if (lastIndex < value.length) {
    parts.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return parts;
}

// ---------------------------------------------------------------------------
// processInlineChildren
// Iterates over children of an inline-capable node and replaces text nodes
// that contain variable references with split sequences.
// ---------------------------------------------------------------------------

function processInlineChildren(node: MdastGenericNode): void {
  const { children } = node;
  if (!children) return;

  const newChildren: MdastInlineNode[] = [];
  let didSplit = false;

  for (const child of children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const split = splitTextNode(child as MdastTextNode);
      // split[0] !== child means the node was transformed (even if still 1 part,
      // e.g. an entire text node replaced by a single variableRef)
      if (split[0] !== child) didSplit = true;
      for (const part of split) {
        newChildren.push(part);
      }
    } else {
      newChildren.push(child);
    }
  }

  if (didSplit) {
    node.children = newChildren;
  }
}

// ---------------------------------------------------------------------------
// visitInlineContainers
// Recursively walks the mdast tree and processes all inline-container nodes.
// ---------------------------------------------------------------------------

function visitInlineContainers(node: MdastRootNode | MdastGenericNode): void {
  const children = node.children;
  if (!children) return;

  for (const rawChild of children) {
    // Guard against sparse arrays (e.g. from external remark trees)
    // We cast through unknown to avoid the unnecessary-condition lint rule
    // since the type says elements are non-nullable but callers may pass any.
    const child: MdastGenericNode | MdastInlineNode | null | undefined = rawChild as
      | MdastGenericNode
      | MdastInlineNode
      | null
      | undefined;
    if (child == null) continue;

    if (INLINE_CONTAINER_TYPES.has(child.type)) {
      processInlineChildren(child as MdastGenericNode);
    }

    // Recurse into children (e.g., blockquote contains paragraphs)
    const genericChild = child as MdastGenericNode;
    if (genericChild.children) {
      visitInlineContainers(genericChild);
    }
  }
}

// ---------------------------------------------------------------------------
// Remark plugin — converts {{var:id}} syntax to variableRef mdast nodes
// ---------------------------------------------------------------------------

/**
 * Remark plugin that transforms text nodes containing `{{var:id}}` patterns
 * into sequences of text + `variableRef` mdast nodes.
 *
 * This enables round-trip markdown serialization:
 *   `Hello {{var:party-name}}`  →  [text("Hello "), variableRef("party-name")]
 *
 * On the serialize side, `variableSchemaPlugin.toMarkdown` converts
 * ProseMirror variable_ref nodes back to `{{var:id}}` text.
 */
export const remarkVariablePlugin = $remark('variableSyntax', () => () => (tree: unknown) => {
  visitInlineContainers(tree as MdastRootNode);
});
