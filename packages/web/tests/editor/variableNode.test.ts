import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock ProseMirror modules (same pattern as titleNode tests)
// ---------------------------------------------------------------------------

vi.mock('@milkdown/kit/prose/state', () => {
  class MockPluginKey {
    key: string;
    constructor(name: string) {
      this.key = name;
    }
  }

  class MockPlugin {
    spec: Record<string, unknown>;
    constructor(spec: Record<string, unknown>) {
      this.spec = spec;
    }
  }

  return {
    Plugin: MockPlugin,
    PluginKey: MockPluginKey,
  };
});

vi.mock('@milkdown/kit/prose/view', () => {
  const MockDecoration = {
    node(from: number, to: number, attrs: unknown) {
      return { type: 'node', from, to, attrs };
    },
  };

  const MockDecorationSet = {
    empty: { decorations: [], isEmpty: true },
    create(_doc: unknown, decorations: unknown[]) {
      return { decorations };
    },
  };

  return {
    Decoration: MockDecoration,
    DecorationSet: MockDecorationSet,
  };
});

// Mock $node and $remark from @milkdown/kit/utils
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

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------

import { variableSchemaPlugin, remarkVariablePlugin } from '../../src/editor/variableNode.js';

// ---------------------------------------------------------------------------
// variableSchemaPlugin ($node) tests
// ---------------------------------------------------------------------------

describe('variableSchemaPlugin', () => {
  it('is defined and has id "variable_ref"', () => {
    expect(variableSchemaPlugin).toBeDefined();
    const plugin = variableSchemaPlugin as unknown as { id: string; type: string };
    expect(plugin.id).toBe('variable_ref');
    expect(plugin.type).toBe('$node');
  });

  it('schema has group "inline"', () => {
    const plugin = variableSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.group).toBe('inline');
  });

  it('schema has inline: true', () => {
    const plugin = variableSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.inline).toBe(true);
  });

  it('schema has atom: true', () => {
    const plugin = variableSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.atom).toBe(true);
  });

  it('schema attrs has variableId with default ""', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: { attrs: Record<string, { default: string }> };
    };
    expect(plugin.schema.attrs).toBeDefined();
    const varIdAttr = plugin.schema.attrs.variableId;
    expect(varIdAttr).toBeDefined();
    if (varIdAttr === undefined) return;
    expect(varIdAttr.default).toBe('');
  });

  it('parseDOM matches span[data-variable-id]', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: { parseDOM: { tag: string; getAttrs?: (dom: Element) => Record<string, unknown> }[] };
    };
    expect(plugin.schema.parseDOM).toBeDefined();
    expect(plugin.schema.parseDOM).toHaveLength(1);
    expect(plugin.schema.parseDOM[0]?.tag).toBe('span[data-variable-id]');
  });

  it('parseDOM getAttrs extracts variableId from data-variable-id attribute', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: {
        parseDOM: {
          tag: string;
          getAttrs: (dom: Element) => Record<string, string | null>;
        }[];
      };
    };
    const entry = plugin.schema.parseDOM[0];
    expect(entry).toBeDefined();
    if (entry === undefined) return;

    const mockDom = {
      getAttribute: (name: string) => (name === 'data-variable-id' ? 'party-name' : null),
    } as unknown as Element;

    const attrs = entry.getAttrs(mockDom);
    expect(attrs).toEqual({ variableId: 'party-name' });
  });

  it('parseDOM getAttrs falls back to empty string when data-variable-id is missing', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: {
        parseDOM: {
          tag: string;
          getAttrs: (dom: Element) => Record<string, string>;
        }[];
      };
    };
    const entry = plugin.schema.parseDOM[0];
    expect(entry).toBeDefined();
    if (entry === undefined) return;

    const mockDom = {
      getAttribute: () => null,
    } as unknown as Element;

    const attrs = entry.getAttrs(mockDom);
    expect(attrs).toEqual({ variableId: '' });
  });

  it('toDOM renders span with data-variable-id, class variable-chip, and contenteditable false', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: {
        toDOM: (node: { attrs: { variableId: string } }) => unknown[];
      };
    };
    const result = plugin.schema.toDOM({ attrs: { variableId: 'party-name' } });
    expect(result).toEqual([
      'span',
      {
        'data-variable-id': 'party-name',
        class: 'variable-chip',
        contenteditable: 'false',
      },
      '{{party-name}}',
    ]);
  });

  it('toDOM renders display text using variableId (no "var:" prefix)', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: {
        toDOM: (node: { attrs: { variableId: string } }) => unknown[];
      };
    };
    const result = plugin.schema.toDOM({ attrs: { variableId: 'effective-date' } });
    const text = result[2];
    expect(text).toBe('{{effective-date}}');
  });

  it('toDOM handles undefined variableId attribute gracefully (falls back to empty string)', () => {
    const plugin = variableSchemaPlugin as unknown as {
      schema: {
        toDOM: (node: { attrs: Record<string, unknown> }) => unknown[];
      };
    };
    // Pass a node with attrs.variableId = undefined to trigger the `?? ''` branch
    const result = plugin.schema.toDOM({ attrs: {} });
    expect(result).toEqual([
      'span',
      { 'data-variable-id': '', class: 'variable-chip', contenteditable: 'false' },
      '{{}}',
    ]);
  });

  describe('parseMarkdown', () => {
    it('matches nodes with type "variableRef"', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: { parseMarkdown: { match: (node: { type: string }) => boolean } };
      };
      expect(plugin.schema.parseMarkdown.match({ type: 'variableRef' })).toBe(true);
    });

    it('does not match nodes with other types', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: { parseMarkdown: { match: (node: { type: string }) => boolean } };
      };
      expect(plugin.schema.parseMarkdown.match({ type: 'text' })).toBe(false);
      expect(plugin.schema.parseMarkdown.match({ type: 'paragraph' })).toBe(false);
      expect(plugin.schema.parseMarkdown.match({ type: 'variable_ref' })).toBe(false);
    });

    it('runner calls state.addNode with type and variableId', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: {
          parseMarkdown: {
            runner: (state: unknown, node: unknown, type: unknown) => void;
          };
        };
      };
      const addNodeMock = vi.fn();
      const mockState = { addNode: addNodeMock };
      const mockNode = { type: 'variableRef', variableId: 'party-name' };
      const mockType = { name: 'variable_ref' };

      plugin.schema.parseMarkdown.runner(mockState, mockNode, mockType);

      expect(addNodeMock).toHaveBeenCalledWith(mockType, { variableId: 'party-name' });
    });

    it('runner passes variableId from the mdast node to addNode', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: {
          parseMarkdown: {
            runner: (state: unknown, node: unknown, type: unknown) => void;
          };
        };
      };
      const addNodeMock = vi.fn();
      const mockState = { addNode: addNodeMock };
      const mockNode = { type: 'variableRef', variableId: 'effective-date-2024' };
      const mockType = { name: 'variable_ref' };

      plugin.schema.parseMarkdown.runner(mockState, mockNode, mockType);

      expect(addNodeMock).toHaveBeenCalledWith(mockType, { variableId: 'effective-date-2024' });
    });
  });

  describe('toMarkdown', () => {
    it('matches ProseMirror nodes with type name "variable_ref"', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: { toMarkdown: { match: (node: { type: { name: string } }) => boolean } };
      };
      expect(plugin.schema.toMarkdown.match({ type: { name: 'variable_ref' } })).toBe(true);
    });

    it('does not match ProseMirror nodes with other type names', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: { toMarkdown: { match: (node: { type: { name: string } }) => boolean } };
      };
      expect(plugin.schema.toMarkdown.match({ type: { name: 'text' } })).toBe(false);
      expect(plugin.schema.toMarkdown.match({ type: { name: 'paragraph' } })).toBe(false);
      expect(plugin.schema.toMarkdown.match({ type: { name: 'variableRef' } })).toBe(false);
    });

    it('runner serializes as text node with {{var:id}} syntax', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: {
          toMarkdown: {
            runner: (state: unknown, node: unknown) => void;
          };
        };
      };
      const addNodeMock = vi.fn();
      const mockState = { addNode: addNodeMock };
      const mockNode = {
        type: { name: 'variable_ref' },
        attrs: { variableId: 'party-name' },
      };

      plugin.schema.toMarkdown.runner(mockState, mockNode);

      expect(addNodeMock).toHaveBeenCalledWith('text', undefined, '{{var:party-name}}');
    });

    it('runner uses variableId from node.attrs in the serialized text', () => {
      const plugin = variableSchemaPlugin as unknown as {
        schema: {
          toMarkdown: {
            runner: (state: unknown, node: unknown) => void;
          };
        };
      };
      const addNodeMock = vi.fn();
      const mockState = { addNode: addNodeMock };
      const mockNode = {
        type: { name: 'variable_ref' },
        attrs: { variableId: 'effective-date' },
      };

      plugin.schema.toMarkdown.runner(mockState, mockNode);

      expect(addNodeMock).toHaveBeenCalledWith('text', undefined, '{{var:effective-date}}');
    });
  });
});

// ---------------------------------------------------------------------------
// remarkVariablePlugin ($remark) tests
// ---------------------------------------------------------------------------

describe('remarkVariablePlugin', () => {
  it('is defined and has id "variableSyntax"', () => {
    expect(remarkVariablePlugin).toBeDefined();
    const plugin = remarkVariablePlugin as unknown as { id: string; type: string };
    expect(plugin.id).toBe('variableSyntax');
    expect(plugin.type).toBe('$remark');
  });

  // Helper to run the remark plugin on a tree
  function runPlugin(tree: unknown): void {
    const plugin = remarkVariablePlugin as unknown as { plugin: () => (tree: unknown) => void };
    plugin.plugin()(tree);
  }

  it('transforms a single variable in a paragraph into text + variableRef', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello {{var:party-name}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { type: string; children: unknown[] };
    expect(para.type).toBe('paragraph');
    expect(para.children).toHaveLength(2);

    const [first, second] = para.children as {
      type: string;
      value?: string;
      variableId?: string;
    }[];
    expect(first?.type).toBe('text');
    expect(first?.value).toBe('Hello ');
    expect(second?.type).toBe('variableRef');
    expect(second?.variableId).toBe('party-name');
  });

  it('transforms multiple variables in the same paragraph', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello {{var:party-name}} and {{var:date}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(4);

    const children = para.children as { type: string; value?: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'text', value: 'Hello ' });
    expect(children[1]).toEqual({ type: 'variableRef', variableId: 'party-name' });
    expect(children[2]).toEqual({ type: 'text', value: ' and ' });
    expect(children[3]).toEqual({ type: 'variableRef', variableId: 'date' });
  });

  it('handles adjacent variables with no text between them', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var:a}}{{var:b}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(2);

    const children = para.children as { type: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'variableRef', variableId: 'a' });
    expect(children[1]).toEqual({ type: 'variableRef', variableId: 'b' });
  });

  it('handles variable at start of paragraph text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var:a}} rest of text' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(2);

    const children = para.children as { type: string; value?: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'variableRef', variableId: 'a' });
    expect(children[1]).toEqual({ type: 'text', value: ' rest of text' });
  });

  it('handles variable at end of paragraph text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'rest {{var:a}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(2);

    const children = para.children as { type: string; value?: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'text', value: 'rest ' });
    expect(children[1]).toEqual({ type: 'variableRef', variableId: 'a' });
  });

  it('handles variable as only content in paragraph', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var:a}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);

    const children = para.children as { type: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'variableRef', variableId: 'a' });
  });

  it('preserves malformed syntax "{{var:}}" as plain text (empty id not matched)', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var:}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    // VARIABLE_REF_REGEX requires at least one char in id: [a-zA-Z0-9_-]+
    // so {{var:}} should remain a plain text node
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('{{var:}}');
  });

  it('preserves malformed syntax "{{var}}" as plain text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('{{var}}');
  });

  it('preserves malformed syntax "{var:id}" (single braces) as plain text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{var:id}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('{var:id}');
  });

  it('preserves malformed syntax "{{ var:id }}" (spaces inside) as plain text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{ var:id }}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('{{ var:id }}');
  });

  it('handles multiple paragraphs each with different variables', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'First: {{var:alpha}}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Second: {{var:beta}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para1 = tree.children[0] as { children: unknown[] };
    const para2 = tree.children[1] as { children: unknown[] };

    expect(para1.children).toHaveLength(2);
    expect(para2.children).toHaveLength(2);

    const ch1 = para1.children as { type: string; variableId?: string }[];
    const ch2 = para2.children as { type: string; variableId?: string }[];

    expect(ch1[1]).toEqual({ type: 'variableRef', variableId: 'alpha' });
    expect(ch2[1]).toEqual({ type: 'variableRef', variableId: 'beta' });
  });

  it('leaves text with no variables unchanged', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'No variables here.' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('No variables here.');
  });

  it('leaves paragraphs with no text children unchanged (e.g. only strong nodes)', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'strong',
              children: [{ type: 'text', value: 'bold text' }],
            },
          ],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    // Only a strong node — no text children at the paragraph level to split
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string };
    expect(child.type).toBe('strong');
  });

  it('leaves empty text value unchanged', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; value: string };
    expect(child.type).toBe('text');
    expect(child.value).toBe('');
  });

  it('handles tree with no children property gracefully', () => {
    const tree = { type: 'root' };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();
  });

  it('processes variables inside headings', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 1,
          children: [{ type: 'text', value: 'Section {{var:section-name}}' }],
        },
      ],
    };

    runPlugin(tree);

    const heading = tree.children[0] as { type: string; children: unknown[] };
    expect(heading.type).toBe('heading');
    expect(heading.children).toHaveLength(2);

    const children = heading.children as { type: string; value?: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'text', value: 'Section ' });
    expect(children[1]).toEqual({ type: 'variableRef', variableId: 'section-name' });
  });

  it('processes variables inside blockquote children', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Signed by {{var:signatory}}' }],
            },
          ],
        },
      ],
    };

    runPlugin(tree);

    const blockquote = tree.children[0] as { children: unknown[] };
    const innerPara = blockquote.children[0] as { children: unknown[] };
    expect(innerPara.children).toHaveLength(2);

    const children = innerPara.children as { type: string; value?: string; variableId?: string }[];
    expect(children[0]).toEqual({ type: 'text', value: 'Signed by ' });
    expect(children[1]).toEqual({ type: 'variableRef', variableId: 'signatory' });
  });

  it('handles sparse children array with undefined entries gracefully', () => {
    const children: unknown[] = [];
    children.length = 2;
    children[1] = {
      type: 'paragraph',
      children: [{ type: 'text', value: '{{var:skip-test}}' }],
    };
    const tree = { type: 'root', children };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();

    const para = children[1] as { children: unknown[] };
    const ch = para.children as { type: string; variableId?: string }[];
    expect(ch[0]).toEqual({ type: 'variableRef', variableId: 'skip-test' });
  });

  it('handles null entries in children array (null guard in visitInlineContainers)', () => {
    // Pass null explicitly as a child entry to trigger the `if (child == null) continue` branch
    const children = [
      null,
      {
        type: 'paragraph',
        children: [{ type: 'text', value: '{{var:null-guard-test}}' }],
      },
    ] as unknown[];
    const tree = { type: 'root', children };

    expect(() => {
      runPlugin(tree);
    }).not.toThrow();

    const para = children[1] as { children: unknown[] };
    const ch = para.children as { type: string; variableId?: string }[];
    expect(ch[0]).toEqual({ type: 'variableRef', variableId: 'null-guard-test' });
  });

  it('handles variable ids with underscores and digits', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '{{var:party_name_1}}' }],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    expect(para.children).toHaveLength(1);
    const child = para.children[0] as { type: string; variableId?: string };
    expect(child.type).toBe('variableRef');
    expect(child.variableId).toBe('party_name_1');
  });

  it('handles mixed text and non-text children in a paragraph — only splits text nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Before {{var:x}}' },
            { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
            { type: 'text', value: '{{var:y}} after' },
          ],
        },
      ],
    };

    runPlugin(tree);

    const para = tree.children[0] as { children: unknown[] };
    // Before: "Before " + variableRef:x + strong + variableRef:y + " after"
    expect(para.children).toHaveLength(5);

    const ch = para.children as { type: string; value?: string; variableId?: string }[];
    expect(ch[0]).toEqual({ type: 'text', value: 'Before ' });
    expect(ch[1]).toEqual({ type: 'variableRef', variableId: 'x' });
    expect(ch[2]).toEqual(expect.objectContaining({ type: 'strong' }));
    expect(ch[3]).toEqual({ type: 'variableRef', variableId: 'y' });
    expect(ch[4]).toEqual({ type: 'text', value: ' after' });
  });
});
