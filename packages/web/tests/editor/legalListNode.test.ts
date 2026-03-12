import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @milkdown/kit/utils (same pattern as titleNode.test.ts)
// ---------------------------------------------------------------------------

vi.mock('@milkdown/kit/utils', () => ({
  $node: (id: string, schemaFn: () => Record<string, unknown>) => ({
    id,
    schema: schemaFn(),
    type: '$node',
  }),
  $remark: (id: string, remarkFn: () => () => (tree: unknown) => void) => ({
    id,
    plugin: remarkFn(),
    type: '$remark',
  }),
}));

// Mock @milkdown/kit/preset/commonmark (provides wrapInOrderedListCommand etc.)
vi.mock('@milkdown/kit/preset/commonmark', () => ({
  wrapInOrderedListCommand: { key: 'WrapInOrderedList' },
  listItemSchema: { id: 'list_item' },
}));

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------

import { legalListSchemaPlugin, remarkLegalListPlugin } from '../../src/editor/legalListNode.js';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

interface SchemaPlugin {
  id: string;
  type: string;
  schema: {
    group: string;
    content: string;
    attrs: Record<string, { default: unknown }>;
    parseDOM: {
      tag: string;
      getAttrs: (dom: { getAttribute: (name: string) => string | null }) => Record<string, unknown>;
    }[];
    toDOM: (node: { attrs: Record<string, string> }) => unknown[];
    parseMarkdown: {
      match: (node: { type: string }) => boolean;
      runner: (state: unknown, node: unknown, type: unknown) => void;
    };
    toMarkdown: {
      match: (node: { type: { name: string } }) => boolean;
      runner: (state: unknown, node: unknown) => void;
    };
  };
}

interface RemarkPlugin {
  id: string;
  type: string;
  plugin: () => (tree: unknown) => void;
}

// ---------------------------------------------------------------------------
// legalListSchemaPlugin ($node) tests
// ---------------------------------------------------------------------------

describe('legalListSchemaPlugin', () => {
  const plugin = legalListSchemaPlugin as unknown as SchemaPlugin;

  it('has id "legal_list" and type "$node"', () => {
    expect(plugin.id).toBe('legal_list');
    expect(plugin.type).toBe('$node');
  });

  it('schema group is "block"', () => {
    expect(plugin.schema.group).toBe('block');
  });

  it('schema content is "listItem+"', () => {
    expect(plugin.schema.content).toBe('listItem+');
  });

  describe('schema attrs', () => {
    it('has listType attr with default "lower-alpha"', () => {
      expect(plugin.schema.attrs.listType).toBeDefined();
      expect(plugin.schema.attrs.listType?.default).toBe('lower-alpha');
    });

    it('has spread attr with default false', () => {
      expect(plugin.schema.attrs.spread).toBeDefined();
      expect(plugin.schema.attrs.spread?.default).toBe(false);
    });
  });

  describe('parseDOM', () => {
    it('matches ol[data-legal-list] tag', () => {
      expect(plugin.schema.parseDOM).toHaveLength(1);
      expect(plugin.schema.parseDOM[0]?.tag).toBe('ol[data-legal-list]');
    });

    it('getAttrs extracts listType from data-legal-list attribute', () => {
      const getAttrs = plugin.schema.parseDOM[0]?.getAttrs;
      expect(getAttrs).toBeDefined();
      if (!getAttrs) return;
      const mockDom = {
        getAttribute: (name: string) => (name === 'data-legal-list' ? 'upper-alpha' : null),
      };
      const attrs = getAttrs(mockDom);
      expect(attrs.listType).toBe('upper-alpha');
    });

    it('getAttrs falls back to "lower-alpha" when attribute is missing', () => {
      const getAttrs = plugin.schema.parseDOM[0]?.getAttrs;
      expect(getAttrs).toBeDefined();
      if (!getAttrs) return;
      const mockDom = { getAttribute: () => null };
      const attrs = getAttrs(mockDom);
      expect(attrs.listType).toBe('lower-alpha');
    });
  });

  describe('toDOM', () => {
    it('returns ol element with data-legal-list and style attributes', () => {
      const result = plugin.schema.toDOM({ attrs: { listType: 'lower-alpha' } });
      expect(result[0]).toBe('ol');
      expect(result[1]).toEqual({
        'data-legal-list': 'lower-alpha',
      });
      expect(result[2]).toBe(0);
    });

    it('returns correct toDOM for upper-roman', () => {
      const result = plugin.schema.toDOM({ attrs: { listType: 'upper-roman' } });
      expect(result[1]).toEqual({
        'data-legal-list': 'upper-roman',
      });
    });

    it('falls back to lower-alpha when listType attr is undefined', () => {
      // Exercises the `?? 'lower-alpha'` fallback branch on line 57
      const result = plugin.schema.toDOM({ attrs: {} as Record<string, string> });
      expect(result[1]).toEqual({
        'data-legal-list': 'lower-alpha',
      });
    });
  });

  describe('parseMarkdown', () => {
    it('match returns true for nodes with type "legalList"', () => {
      expect(plugin.schema.parseMarkdown.match({ type: 'legalList' })).toBe(true);
    });

    it('match returns false for other node types', () => {
      expect(plugin.schema.parseMarkdown.match({ type: 'paragraph' })).toBe(false);
      expect(plugin.schema.parseMarkdown.match({ type: 'list' })).toBe(false);
    });

    it('runner opens node with listType attrs, processes children, and closes', () => {
      const openNodeMock = vi.fn();
      const nextMock = vi.fn();
      const closeNodeMock = vi.fn();
      const mockState = {
        openNode: openNodeMock,
        next: nextMock,
        closeNode: closeNodeMock,
      };
      const children = [{ type: 'listItem', children: [] }];
      const mockNode = { type: 'legalList', listType: 'upper-alpha', children };
      const mockType = { name: 'legal_list' };

      plugin.schema.parseMarkdown.runner(mockState, mockNode, mockType);

      expect(openNodeMock).toHaveBeenCalledWith(mockType, { listType: 'upper-alpha' });
      expect(nextMock).toHaveBeenCalledWith(children);
      expect(closeNodeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('toMarkdown', () => {
    it('match returns true for ProseMirror nodes with type name "legal_list"', () => {
      expect(plugin.schema.toMarkdown.match({ type: { name: 'legal_list' } })).toBe(true);
    });

    it('match returns false for other ProseMirror node type names', () => {
      expect(plugin.schema.toMarkdown.match({ type: { name: 'ordered_list' } })).toBe(false);
      expect(plugin.schema.toMarkdown.match({ type: { name: 'paragraph' } })).toBe(false);
    });

    it('runner serializes each list_item child as "label. text" paragraph', () => {
      const openNodeMock = vi.fn();
      const addNodeMock = vi.fn();
      const closeNodeMock = vi.fn();
      const mockState = {
        openNode: openNodeMock,
        addNode: addNodeMock,
        closeNode: closeNodeMock,
      };

      // ProseMirror node with 2 list_item children, each with text content
      const makeListItem = (text: string) => ({
        type: { name: 'list_item' },
        textContent: text,
        content: {
          size: 1,
          forEach: (cb: (child: unknown) => void) => {
            cb({
              type: { name: 'paragraph' },
              textContent: text,
              content: {
                size: 1,
                forEach: (innerCb: (child: unknown) => void) => {
                  innerCb({ type: { name: 'text' }, text });
                },
              },
            });
          },
        },
      });

      const mockNode = {
        type: { name: 'legal_list' },
        attrs: { listType: 'lower-alpha' },
        childCount: 2,
        child: (i: number) => makeListItem(i === 0 ? 'First item' : 'Second item'),
      };

      plugin.schema.toMarkdown.runner(mockState, mockNode);

      // Should open 2 paragraphs and add text nodes with labels
      expect(openNodeMock).toHaveBeenCalledWith('paragraph');
      expect(openNodeMock).toHaveBeenCalledTimes(2);
      // First item: label 'a', second: 'b'
      expect(addNodeMock).toHaveBeenCalledWith('text', undefined, 'a. First item');
      expect(addNodeMock).toHaveBeenCalledWith('text', undefined, 'b. Second item');
      expect(closeNodeMock).toHaveBeenCalledTimes(2);
    });
  });
});

// ---------------------------------------------------------------------------
// remarkLegalListPlugin ($remark) tests
// ---------------------------------------------------------------------------

describe('remarkLegalListPlugin', () => {
  const plugin = remarkLegalListPlugin as unknown as RemarkPlugin;

  it('has id "legalListSyntax" and type "$remark"', () => {
    expect(plugin.id).toBe('legalListSyntax');
    expect(plugin.type).toBe('$remark');
  });

  function makeParagraph(text: string) {
    return {
      type: 'paragraph',
      children: [{ type: 'text', value: text }],
    };
  }

  function runPlugin(tree: unknown) {
    plugin.plugin()(tree);
  }

  // ---------------------------------------------------------------------------
  // lower-alpha
  // ---------------------------------------------------------------------------

  it('transforms consecutive lower-alpha paragraphs into a legalList node', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('a. First'), makeParagraph('b. Second')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: {
        type: string;
        children: { type: string; children: { type: string; value: string }[] }[];
      }[];
    };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-alpha');
    expect(list.children).toHaveLength(2);
    // Labels are stripped from child text (legalList -> listItem -> paragraph -> text)
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('First');
    expect(list.children[1]?.children[0]?.children[0]?.value).toBe('Second');
  });

  // ---------------------------------------------------------------------------
  // upper-alpha
  // ---------------------------------------------------------------------------

  it('transforms consecutive upper-alpha paragraphs into a legalList node', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('A. First'), makeParagraph('B. Second')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as { type: string; listType: string };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('upper-alpha');
  });

  // ---------------------------------------------------------------------------
  // lower-roman (disambiguation: i. followed by ii.)
  // ---------------------------------------------------------------------------

  it('transforms i./ii. paragraphs into legalList with listType lower-roman', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('i. First'), makeParagraph('ii. Second')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as { type: string; listType: string };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-roman');
  });

  // ---------------------------------------------------------------------------
  // upper-roman
  // ---------------------------------------------------------------------------

  it('transforms I./II. paragraphs into legalList with listType upper-roman', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('I. First'), makeParagraph('II. Second')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as { type: string; listType: string };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('upper-roman');
  });

  // ---------------------------------------------------------------------------
  // Single "i." — no next item or next is not "ii." → lower-alpha
  // ---------------------------------------------------------------------------

  it('treats single "i. text" (no second item) as lower-alpha', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('i. Only item')],
    };

    runPlugin(tree);

    // A single item is ambiguous — per detectListType('i', undefined) → lower-alpha.
    // Implementation should still produce a legalList (single item list) with lower-alpha.
    expect(tree.children).toHaveLength(1);
    const node = tree.children[0] as unknown as { type: string; listType: string };
    expect(node.type).toBe('legalList');
    expect(node.listType).toBe('lower-alpha');
  });

  it('treats "i." followed by a non-Roman second label as lower-alpha', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('i. First'), makeParagraph('j. Second')],
    };

    runPlugin(tree);

    // detectListType('i', 'j') → lower-alpha (next is 'j', not 'ii')
    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as { type: string; listType: string };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-alpha');
  });

  // ---------------------------------------------------------------------------
  // No transform for regular paragraphs
  // ---------------------------------------------------------------------------

  it('does NOT transform regular paragraphs without list prefix', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('Just a paragraph'), makeParagraph('Another paragraph')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(2);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
    expect((tree.children[1] as { type: string }).type).toBe('paragraph');
  });

  it('does NOT transform paragraph whose first child is a non-text node (e.g. strong)', () => {
    // This exercises the firstChild?.type !== 'text' branch in extractLabel
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'strong', children: [{ type: 'text', value: 'a. Bold' }] }],
        },
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
  });

  // ---------------------------------------------------------------------------
  // Non-consecutive matching paragraphs → separate lists
  // ---------------------------------------------------------------------------

  it('creates separate lists when a non-matching paragraph interrupts a sequence', () => {
    const tree = {
      type: 'root',
      children: [
        makeParagraph('a. First'),
        makeParagraph('Not a list item'),
        makeParagraph('a. Restart'),
      ],
    };

    runPlugin(tree);

    // Expect two separate legalList nodes, with the regular paragraph in between
    expect(tree.children).toHaveLength(3);
    expect((tree.children[0] as { type: string }).type).toBe('legalList');
    expect((tree.children[1] as { type: string }).type).toBe('paragraph');
    expect((tree.children[2] as { type: string }).type).toBe('legalList');
  });

  // ---------------------------------------------------------------------------
  // Non-paragraph nodes (headings, blockquotes) pass through unchanged
  // ---------------------------------------------------------------------------

  it('passes non-paragraph nodes (headings) through unchanged', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'heading', depth: 1, children: [{ type: 'text', value: 'Title' }] },
        makeParagraph('a. First item'),
        makeParagraph('b. Second item'),
      ],
    };

    runPlugin(tree);

    // heading passes through; a+b form one list
    expect(tree.children).toHaveLength(2);
    expect((tree.children[0] as { type: string }).type).toBe('heading');
    expect((tree.children[1] as { type: string }).type).toBe('legalList');
  });

  // ---------------------------------------------------------------------------
  // detectListType returns null — invalid multi-char non-Roman label
  // ---------------------------------------------------------------------------

  it('leaves paragraph unchanged when label is not a valid legal list type (e.g. "aa.")', () => {
    // "aa" passes LEGAL_LIST_ITEM_REGEX but detectListType('aa', ...) returns null
    // because 'aa' is not a valid Roman numeral and length > 1 disqualifies alpha.
    const tree = {
      type: 'root',
      children: [makeParagraph('aa. Something')],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
  });

  // ---------------------------------------------------------------------------
  // Empty tree
  // ---------------------------------------------------------------------------

  it('handles empty tree gracefully', () => {
    const tree = { type: 'root', children: [] };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();
    expect(tree.children).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Tree with no children property
  // ---------------------------------------------------------------------------

  it('handles tree with no children property gracefully', () => {
    const tree = { type: 'root' };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Sparse children array (undefined slots) — covers !node guard
  // ---------------------------------------------------------------------------

  it('handles sparse children array with undefined entries gracefully', () => {
    // Create a sparse array to exercise the `if (!node)` guard in the while loop
    const children: unknown[] = [];
    children.length = 2;
    children[1] = makeParagraph('a. Item after gap');

    const tree = { type: 'root', children };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();

    // The undefined slot is skipped; the paragraph at index 1 forms a legalList.
    // After processing, root.children is reassigned to the compacted output array.
    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as { type: string }).type).toBe('legalList');
  });

  it('handles sparse inner array (undefined slot after a matching paragraph) gracefully', () => {
    // Exercises the current?.type !== 'paragraph' branch where current is undefined
    // in the inner collecting while-loop. Outer loop: i=0 (a. First) → valid label,
    // starts inner loop; inner i=0 → a. First added, i=1; inner i=1 → children[1]
    // is undefined → current?.type !== 'paragraph' is true → break. Then outer
    // loop skips undefined at i=1, then processes b. Second as its own list.
    const children: unknown[] = [];
    children.length = 3;
    children[0] = makeParagraph('a. First');
    // children[1] is intentionally left undefined (sparse slot)
    children[2] = makeParagraph('b. Second');

    const tree = { type: 'root', children };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();

    // Output is a compact dense array: two separate legalList nodes
    expect(tree.children).toHaveLength(2);
    expect((tree.children[0] as { type: string }).type).toBe('legalList');
    expect((tree.children[1] as { type: string }).type).toBe('legalList');
  });

  // ---------------------------------------------------------------------------
  // Label stripping
  // ---------------------------------------------------------------------------

  it('strips the label prefix from child paragraph text', () => {
    const tree = {
      type: 'root',
      children: [makeParagraph('a. Alpha item'), makeParagraph('b. Beta item')],
    };

    runPlugin(tree);

    const list = tree.children[0] as unknown as {
      children: {
        type: string;
        children: { type: string; children: { value: string }[] }[];
      }[];
    };
    // legalList -> listItem -> paragraph -> text
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('Alpha item');
    expect(list.children[1]?.children[0]?.children[0]?.value).toBe('Beta item');
  });

  // ---------------------------------------------------------------------------
  // Mixed content: legal list surrounded by normal paragraphs
  // ---------------------------------------------------------------------------

  it('correctly identifies legal list block surrounded by normal paragraphs', () => {
    const tree = {
      type: 'root',
      children: [
        makeParagraph('Introduction text'),
        makeParagraph('a. First obligation'),
        makeParagraph('b. Second obligation'),
        makeParagraph('Conclusion text'),
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(3);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
    expect((tree.children[1] as { type: string }).type).toBe('legalList');
    expect((tree.children[2] as { type: string }).type).toBe('paragraph');

    const list = tree.children[1] as unknown as {
      listType: string;
      children: unknown[];
    };
    expect(list.listType).toBe('lower-alpha');
    expect(list.children).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Multi-line paragraph (newline-separated items in a single paragraph node)
  // ---------------------------------------------------------------------------

  it('transforms single paragraph with newline-separated "a. text\\nb. text\\nc. text" into legalList', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'a. first\nb. second\nc. third' }],
        },
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: {
        type: string;
        children: { type: string; children: { type: string; value: string }[] }[];
      }[];
    };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-alpha');
    expect(list.children).toHaveLength(3);
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('first');
    expect(list.children[1]?.children[0]?.children[0]?.value).toBe('second');
    expect(list.children[2]?.children[0]?.children[0]?.value).toBe('third');
  });

  it('transforms single paragraph with uppercase alpha lines "A. text\\nB. text" into legalList', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'A. first\nB. second' }],
        },
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: unknown[];
    };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('upper-alpha');
    expect(list.children).toHaveLength(2);
  });

  it('transforms single paragraph with roman numeral lines "i. text\\nii. text" into lower-roman legalList', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'i. first\nii. second' }],
        },
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: unknown[];
    };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-roman');
    expect(list.children).toHaveLength(2);
  });

  it('does NOT split single paragraph with only one line (falls through to existing logic)', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'a. only line' }],
        },
      ],
    };

    runPlugin(tree);

    // Single-line paragraph with a valid label still becomes a legalList via the existing path
    expect(tree.children).toHaveLength(1);
    const node = tree.children[0] as unknown as { type: string; listType: string };
    expect(node.type).toBe('legalList');
    expect(node.listType).toBe('lower-alpha');
  });

  it('does NOT split single paragraph where second line does not match regex', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'a. first\nNot a list item' }],
        },
      ],
    };

    runPlugin(tree);

    // Second line doesn't match LEGAL_LIST_ITEM_REGEX → trySplitMultiLineParagraph
    // returns null and falls through to the existing consecutive-paragraph logic.
    // The existing logic still sees "a. first\nNot a list item" as a label-prefixed
    // paragraph (the regex matches at the start), so it becomes a 1-item legalList
    // with the full text after the label stripped: "first\nNot a list item".
    // The key assertion: it is NOT split into 2 items — only 1 child in the list.
    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: {
        type: string;
        children: { type: string; children: { type: string; value: string }[] }[];
      }[];
    };
    expect(list.type).toBe('legalList');
    expect(list.children).toHaveLength(1);
    // The full value after stripping "a. " — includes the trailing non-list line
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('first\nNot a list item');
  });

  it('handles mixed: preceding text paragraph, multi-line legal list paragraph, trailing text paragraph', () => {
    const tree = {
      type: 'root',
      children: [
        makeParagraph('Introduction text'),
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'a. first obligation\nb. second obligation\nc. third obligation',
            },
          ],
        },
        makeParagraph('Conclusion text'),
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(3);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
    expect((tree.children[1] as { type: string }).type).toBe('legalList');
    expect((tree.children[2] as { type: string }).type).toBe('paragraph');

    const list = tree.children[1] as unknown as {
      listType: string;
      children: {
        type: string;
        children: { type: string; children: { type: string; value: string }[] }[];
      }[];
    };
    expect(list.listType).toBe('lower-alpha');
    expect(list.children).toHaveLength(3);
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('first obligation');
    expect(list.children[1]?.children[0]?.children[0]?.value).toBe('second obligation');
    expect(list.children[2]?.children[0]?.children[0]?.value).toBe('third obligation');
  });

  it('handles paragraph where text has trailing non-matching line after matching lines', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'a. first\nb. second\nSome trailing text' }],
        },
      ],
    };

    runPlugin(tree);

    expect(tree.children).toHaveLength(1);
    const list = tree.children[0] as unknown as {
      type: string;
      listType: string;
      children: {
        type: string;
        children: { type: string; children: { type: string; value: string }[] }[];
      }[];
    };
    expect(list.type).toBe('legalList');
    expect(list.listType).toBe('lower-alpha');
    // The trailing non-matching line is appended to the last list item's text
    expect(list.children).toHaveLength(2);
    expect(list.children[0]?.children[0]?.children[0]?.value).toBe('first');
    // Last item gets the trailing text appended
    expect(list.children[1]?.children[0]?.children[0]?.value).toBe('second\nSome trailing text');
  });

  it('does NOT split multi-line paragraph when both lines match regex but detectListType returns null (sequence mismatch)', () => {
    // "ii." followed by "iv." both match LEGAL_LIST_ITEM_REGEX, but detectListType
    // returns null because ii→iv skips iii (b !== a+1), so trySplitMultiLineParagraph
    // returns null and the paragraph falls through to consecutive-paragraph logic.
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'ii. second\niv. fourth' }],
        },
      ],
    };

    runPlugin(tree);

    // trySplitMultiLineParagraph returns null → falls through to consecutive-paragraph
    // logic which sees "ii. second\niv. fourth" as a valid lower-roman label prefix.
    // It creates a single-item legalList with the full text after stripping "ii. ".
    expect(tree.children).toHaveLength(1);
    const node = tree.children[0] as unknown as { type: string };
    // Either stays as paragraph or becomes 1-item list — the key is it is NOT
    // split into 2 separate items by trySplitMultiLineParagraph.
    // The consecutive-paragraph path sees "ii" as lower-roman → 1-item legalList.
    expect(node.type).toBe('legalList');
    const list = node as unknown as { children: unknown[] };
    expect(list.children).toHaveLength(1);
  });
});
