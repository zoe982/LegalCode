import { $node, $remark } from '@milkdown/kit/utils';
import {
  LEGAL_LIST_ITEM_REGEX,
  detectListType,
  indexToLabel,
  type LegalListType,
} from './legalListUtils.js';

// ---------------------------------------------------------------------------
// Mdast node interfaces (same pattern as titleNode.ts)
// ---------------------------------------------------------------------------

interface MdastTextNode {
  type: string;
  value: string;
}

interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  listType?: string;
}

// ---------------------------------------------------------------------------
// legalListSchemaPlugin — Milkdown $node schema plugin
// ---------------------------------------------------------------------------

/**
 * Milkdown node schema plugin that registers the `legal_list` node type.
 *
 * Legal lists render as `<ol data-legal-list="lower-alpha">` (or other list
 * type variants) and reuse Milkdown's built-in `list_item` node for their
 * children.
 *
 * - **parseMarkdown**: converts mdast `legalList` nodes (created by
 *   `remarkLegalListPlugin`) into ProseMirror legal_list nodes.
 * - **toMarkdown**: serializes ProseMirror legal_list nodes back to mdast
 *   paragraphs with `label. text` prefixes (e.g. `a. First item`).
 */
export const legalListSchemaPlugin = $node('legal_list', () => ({
  group: 'block',
  content: 'listItem+',
  attrs: {
    listType: { default: 'lower-alpha' },
    spread: { default: false },
  },
  parseDOM: [
    {
      tag: 'ol[data-legal-list]',
      getAttrs: (dom: { getAttribute: (name: string) => string | null }) => ({
        listType: dom.getAttribute('data-legal-list') ?? 'lower-alpha',
      }),
    },
  ],
  toDOM: (node: { attrs: Record<string, string> }) => {
    const listType = node.attrs.listType ?? 'lower-alpha';
    return [
      'ol',
      {
        'data-legal-list': listType,
      },
      0,
    ];
  },
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'legalList',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any, type: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      state.openNode(type, { listType: node.listType });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.next(node.children);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      state.closeNode();
    },
  },
  toMarkdown: {
    match: (node: { type: { name: string } }) => node.type.name === 'legal_list',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner: (state: any, node: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const listType = node.attrs.listType as LegalListType;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const childCount = node.childCount as number;

      for (let i = 0; i < childCount; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const listItem = node.child(i) as { textContent: string };
        const label = indexToLabel(i, listType);
        const text = listItem.textContent;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        state.openNode('paragraph');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        state.addNode('text', undefined, `${label}. ${text}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        state.closeNode();
      }
    },
  },
}));

// ---------------------------------------------------------------------------
// Remark plugin — groups consecutive label-prefixed paragraphs into legalList
// ---------------------------------------------------------------------------

/**
 * Extract the label from a paragraph's first text child.
 * Returns the matched label (e.g. "a", "ii", "B") or null.
 */
function extractLabel(node: MdastNode): string | null {
  const firstChild = node.children?.[0] as MdastTextNode | undefined;
  if (firstChild?.type !== 'text' || typeof firstChild.value !== 'string') return null;
  const match = LEGAL_LIST_ITEM_REGEX.exec(firstChild.value);
  return match?.[1] ?? null;
}

/**
 * Strip the label prefix (e.g. "a. ") from a paragraph's first text child.
 * Mutates the node in place. Only called after extractLabel has confirmed the
 * first child is a text node whose value matches LEGAL_LIST_ITEM_REGEX.
 */
function stripLabel(node: MdastNode): void {
  const firstChild = node.children?.[0] as MdastTextNode | undefined;
  /* v8 ignore next 2 -- defensive guard; unreachable after extractLabel validates */
  if (!firstChild) return;
  const match = LEGAL_LIST_ITEM_REGEX.exec(firstChild.value);
  /* v8 ignore next 2 -- defensive guard; unreachable after extractLabel validates */
  if (!match) return;
  firstChild.value = firstChild.value.slice(match[0].length);
}

/**
 * Try to convert a single paragraph node whose sole text child contains
 * newline-separated legal list items into a `legalList` mdast node.
 *
 * Returns the new `legalList` node when the paragraph qualifies, or `null`
 * when it should be handled by the existing consecutive-paragraph logic.
 *
 * Rules:
 * - The paragraph must have exactly one child, and that child must be a plain
 *   `text` node (no inline formatting).  Paragraphs with multiple children
 *   (e.g. bold spans) are skipped so we don't destroy inline structure.
 * - The first text child's value must contain at least one `\n`.
 * - After splitting on `\n`, the first **two** lines must both match
 *   `LEGAL_LIST_ITEM_REGEX`.  A single matching line is already handled by
 *   the existing single-paragraph logic.
 * - Lines beyond the first two that do NOT match the regex are appended
 *   (joined with `\n`) to the last matching list item's text rather than
 *   being dropped.
 */
function trySplitMultiLineParagraph(node: MdastNode): MdastNode | null {
  // Only handle paragraphs with exactly one plain-text child.
  if (node.children?.length !== 1) return null;
  const onlyChild = node.children[0] as MdastTextNode | undefined;
  if (onlyChild?.type !== 'text' || typeof onlyChild.value !== 'string') return null;

  const raw = onlyChild.value;
  if (!raw.includes('\n')) return null;

  const lines = raw.split('\n');

  // Need at least two lines; require both the first and second to be list items
  // so we can reliably call detectListType with a concrete second label.
  /* v8 ignore next -- lines[0] is always defined after split */
  const firstLine = lines[0] ?? '';
  /* v8 ignore next -- split on '\n' always yields ≥2 elements after includes('\n') guard */
  const secondLine = lines[1] ?? '';

  const firstMatch = LEGAL_LIST_ITEM_REGEX.exec(firstLine);
  const secondMatch = LEGAL_LIST_ITEM_REGEX.exec(secondLine);

  if (!firstMatch || !secondMatch) return null;

  /* v8 ignore next -- regex group 1 is always present when exec returns non-null */
  const firstLabel = firstMatch[1] ?? '';
  /* v8 ignore next -- regex group 1 is always present when exec returns non-null */
  const secondLabel = secondMatch[1] ?? '';

  const listType = detectListType(firstLabel, secondLabel);
  if (listType === null) return null;

  // Collect matching lines into list items.  Trailing non-matching lines are
  // appended to the last matched item.
  const itemTexts: string[] = [];
  for (const line of lines) {
    const m = LEGAL_LIST_ITEM_REGEX.exec(line);
    if (m) {
      // Start a new item with the label stripped.
      itemTexts.push(line.slice(m[0].length));
    } else {
      // Append to the previous item (trailing text after the last label).
      if (itemTexts.length > 0) {
        const last = itemTexts[itemTexts.length - 1] /* v8 ignore next -- always defined */ ?? '';
        itemTexts[itemTexts.length - 1] = last + '\n' + line;
      }
    }
  }

  const listItems: MdastNode[] = itemTexts.map((text) => ({
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: text }],
      },
    ],
  }));

  return {
    type: 'legalList',
    listType,
    children: listItems,
  };
}

/**
 * Remark plugin that groups consecutive paragraphs whose first text child
 * matches `LEGAL_LIST_ITEM_REGEX` (e.g. `a. `, `ii. `, `A. `) into a single
 * `legalList` mdast node.
 *
 * Type detection is performed by `detectListType`, which handles the
 * ambiguous `i`/`I` Roman numeral vs. alphabetic disambiguation.
 *
 * On the serialize side, `legalListSchemaPlugin.toMarkdown` converts
 * ProseMirror legal_list nodes back to paragraphs with label prefixes.
 */
export const remarkLegalListPlugin = $remark('legalListSyntax', () => () => (tree: unknown) => {
  const root = tree as MdastNode;
  if (!root.children) return;

  const output: MdastNode[] = [];
  const children = root.children;
  let i = 0;

  while (i < children.length) {
    const node = children[i];
    if (!node) {
      i++;
      continue;
    }

    // Only consider paragraph nodes with a legal list label prefix.
    if (node.type !== 'paragraph') {
      output.push(node);
      i++;
      continue;
    }

    // --- Multi-line paragraph (items joined by \n without blank lines) -------
    // CommonMark collapses consecutive lines without blank separators into a
    // single paragraph node.  Try to split it before falling through to the
    // normal consecutive-paragraph grouping logic.
    const multiLineResult = trySplitMultiLineParagraph(node);
    if (multiLineResult !== null) {
      output.push(multiLineResult);
      i++;
      continue;
    }

    const firstLabel = extractLabel(node);
    if (firstLabel === null) {
      output.push(node);
      i++;
      continue;
    }

    // Look ahead to the next paragraph to resolve ambiguity (e.g. 'i' vs 'ii').
    const nextNode = children[i + 1];
    const secondLabel =
      nextNode?.type === 'paragraph' ? (extractLabel(nextNode) ?? undefined) : undefined;

    const listType = detectListType(firstLabel, secondLabel);
    if (listType === null) {
      // Not a legal list — leave as a regular paragraph.
      output.push(node);
      i++;
      continue;
    }

    // Collect all consecutive matching paragraphs into one group.
    // They must belong to the same list — we group greedily by consecutive
    // paragraphs that have a label prefix (regardless of sequence order,
    // since detectListType already validated the first two).
    const groupParagraphs: MdastNode[] = [];
    while (i < children.length) {
      const current = children[i];
      if (current?.type !== 'paragraph') break;
      const label = extractLabel(current);
      if (label === null) break;

      // Strip the label prefix from this paragraph before adding as a list item.
      stripLabel(current);
      groupParagraphs.push(current);
      i++;
    }

    // Build the legalList mdast node. Each original paragraph becomes a
    // listItem wrapping the (now label-stripped) paragraph.
    const listItems: MdastNode[] = groupParagraphs.map((para) => ({
      type: 'listItem',
      children: [para],
    }));

    output.push({
      type: 'legalList',
      listType,
      children: listItems,
    });
  }

  root.children = output;
});
