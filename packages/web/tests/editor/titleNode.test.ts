import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock ProseMirror modules (same pattern as numberingPlugin tests)
// ---------------------------------------------------------------------------

vi.mock('@milkdown/kit/prose/state', () => {
  class MockPluginKey {
    key: string;
    constructor(name: string) {
      this.key = name;
    }
    getState(state: unknown) {
      const s = state as Record<string, unknown>;
      return s[this.key];
    }
  }

  class MockPlugin {
    key: MockPluginKey;
    spec: Record<string, unknown>;
    constructor(spec: Record<string, unknown>) {
      this.spec = spec;
      this.key = spec.key as MockPluginKey;
    }
  }

  return {
    Plugin: MockPlugin,
    PluginKey: MockPluginKey,
  };
});

// Track node decoration calls
const nodeCalls: { from: number; to: number; attrs: unknown }[] = [];

vi.mock('@milkdown/kit/prose/view', () => {
  const MockDecoration = {
    node(from: number, to: number, attrs: unknown) {
      nodeCalls.push({ from, to, attrs });
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

import {
  createTitlePlugin,
  titlePluginKey,
  titleNodeSpec,
  titleSchemaPlugin,
  remarkTitlePlugin,
} from '../../src/editor/titleNode.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSpec(plugin: unknown) {
  return (plugin as { spec: Record<string, unknown> }).spec;
}

function getStateSpec(plugin: unknown) {
  return getSpec(plugin).state as {
    init: (_: unknown, state: unknown) => unknown;
    apply: (tr: unknown, prev: unknown) => unknown;
  };
}

function getPropsSpec(plugin: unknown) {
  return getSpec(plugin).props as {
    decorations: (state: unknown) => unknown;
  };
}

interface MockNode {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent: string;
  nodeSize: number;
}

function makeHeading(level: number, text: string, nodeSize = 20): MockNode {
  return {
    type: { name: 'heading' },
    attrs: { level },
    textContent: text,
    nodeSize,
  };
}

function makeTitle(text: string, nodeSize = 20): MockNode {
  return {
    type: { name: 'title' },
    textContent: text,
    nodeSize,
  };
}

function makeParagraph(text: string, nodeSize = 25): MockNode {
  return {
    type: { name: 'paragraph' },
    textContent: text,
    nodeSize,
  };
}

interface MockDoc {
  nodeSize: number;
  childCount: number;
  child: (index: number) => MockNode;
  forEach: (cb: (node: MockNode, offset: number, index: number) => void) => void;
  nodeAt: (pos: number) => MockNode | null;
}

function makeDoc(nodes: MockNode[]): MockDoc {
  const offsets: number[] = [];
  let pos = 1;
  for (const node of nodes) {
    offsets.push(pos);
    pos += node.nodeSize;
  }
  const docSize = pos + 1;

  return {
    nodeSize: docSize,
    childCount: nodes.length,
    child(index: number) {
      const n = nodes[index];
      if (!n) throw new Error(`No child at index ${String(index)}`);
      return n;
    },
    forEach(cb) {
      nodes.forEach((node, index) => {
        const offset = offsets[index] ?? 1;
        cb(node, offset, index);
      });
    },
    nodeAt(targetPos: number) {
      for (let i = 0; i < nodes.length; i++) {
        const offset = offsets[i];
        if (offset === targetPos) {
          return nodes[i] ?? null;
        }
      }
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('titleNodeSpec', () => {
  it('defines a block group', () => {
    expect(titleNodeSpec.group).toBe('block');
  });

  it('allows inline content', () => {
    expect(titleNodeSpec.content).toBe('inline*');
  });

  it('is defining (preserves structure on copy/paste)', () => {
    expect(titleNodeSpec.defining).toBe(true);
  });

  it('parseDOM matches div[data-type="title"]', () => {
    expect(titleNodeSpec.parseDOM).toBeDefined();
    expect(titleNodeSpec.parseDOM).toHaveLength(1);
    const parseDOM = titleNodeSpec.parseDOM;
    expect(parseDOM[0].tag).toBe('div[data-type="title"]');
  });

  it('toDOM returns correct structure with data-type and class', () => {
    expect(titleNodeSpec.toDOM).toBeDefined();
    // toDOM is a function that returns a DOMOutputSpec
    const mockNode = { type: { name: 'title' }, textContent: 'Test' };
    const result = (titleNodeSpec.toDOM as unknown as (node: unknown) => unknown[])(mockNode);
    expect(result).toEqual(['div', { 'data-type': 'title', class: 'legal-title' }, 0]);
  });
});

describe('titlePluginKey', () => {
  it('is defined with key "titlePlugin"', () => {
    expect(titlePluginKey).toBeDefined();
    expect((titlePluginKey as unknown as { key: string }).key).toBe('titlePlugin');
  });
});

describe('createTitlePlugin', () => {
  beforeEach(() => {
    nodeCalls.length = 0;
  });

  it('returns a Plugin instance with the correct key', () => {
    const plugin = createTitlePlugin();
    expect(plugin).toBeDefined();
    expect((plugin as unknown as { key: unknown }).key).toBe(titlePluginKey);
  });

  // --- state.init ---

  it('state.init returns DecorationSet.empty when no title nodes exist', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
  });

  it('state.init creates node decoration for title nodes', () => {
    const doc = makeDoc([makeTitle('Agreement Title', 20), makeHeading(1, 'Section', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(1);
    expect(nodeCalls).toHaveLength(1);
    expect(nodeCalls[0]?.attrs).toEqual({ class: 'legal-title', 'data-type': 'title' });
  });

  it('state.init decoration spans from title pos to pos + nodeSize', () => {
    const doc = makeDoc([makeTitle('My Title', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc });
    expect(nodeCalls).toHaveLength(1);
    expect(nodeCalls[0]?.from).toBe(1); // first node at pos 1
    expect(nodeCalls[0]?.to).toBe(21); // 1 + 20
  });

  it('state.init skips non-title nodes', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section 1', 20),
      makeParagraph('Body text', 25),
      makeHeading(2, 'Sub', 20),
    ]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
    expect(nodeCalls).toHaveLength(0);
  });

  it('state.init handles multiple title nodes', () => {
    const doc = makeDoc([
      makeTitle('Main Title', 20),
      makeHeading(1, 'Section', 20),
      makeTitle('Annex Title', 20),
    ]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(2);
    expect(nodeCalls).toHaveLength(2);
  });

  // --- state.apply ---

  it('state.apply returns previous decorations when tr.docChanged is false', () => {
    const doc = makeDoc([makeTitle('Title', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: ['existing'] };
    const tr = { docChanged: false, doc };
    const result = stateSpec.apply(tr, prev);
    expect(result).toBe(prev);
  });

  it('state.apply rebuilds decorations when tr.docChanged is true', () => {
    const doc = makeDoc([makeTitle('Updated Title', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: [] };
    const tr = { docChanged: true, doc };
    const result = stateSpec.apply(tr, prev) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(1);
  });

  it('state.apply returns DecorationSet.empty when no titles after doc change', () => {
    const doc = makeDoc([makeHeading(1, 'No Title', 20)]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: ['old'] };
    const tr = { docChanged: true, doc };
    const result = stateSpec.apply(tr, prev) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
  });

  // --- props.decorations ---

  it('props.decorations returns the plugin state', () => {
    const plugin = createTitlePlugin();
    const propsSpec = getPropsSpec(plugin);
    const pluginState = { decorations: [] };
    const mockState = { titlePlugin: pluginState };
    const result = propsSpec.decorations(mockState);
    expect(result).toBe(pluginState);
  });

  it('props.decorations returns DecorationSet.empty when plugin state is undefined', () => {
    const plugin = createTitlePlugin();
    const propsSpec = getPropsSpec(plugin);
    const result = propsSpec.decorations({}) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
  });

  // --- Empty doc ---

  it('empty doc returns DecorationSet.empty', () => {
    const doc = makeDoc([]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
    expect(nodeCalls).toHaveLength(0);
  });

  // --- nodeAt null guard ---

  it('skips decoration when nodeAt returns null', () => {
    const doc = makeDoc([makeTitle('Title', 20)]);
    // Override nodeAt to return null
    doc.nodeAt = () => null;
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
    expect(nodeCalls).toHaveLength(0);
  });

  // --- Mixed doc structure ---

  it('decorates only title nodes in a mixed document', () => {
    const doc = makeDoc([
      makeTitle('Master Agreement', 20),
      makeHeading(1, 'Purpose', 20),
      makeParagraph('The purpose of this agreement...', 40),
      makeHeading(2, 'Definitions', 20),
    ]);
    const plugin = createTitlePlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc }) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(1);
    expect(nodeCalls).toHaveLength(1);
    expect(nodeCalls[0]?.from).toBe(1);
    expect(nodeCalls[0]?.to).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// titleSchemaPlugin ($node) tests
// ---------------------------------------------------------------------------

describe('titleSchemaPlugin', () => {
  it('is defined and has id "title"', () => {
    expect(titleSchemaPlugin).toBeDefined();
    const plugin = titleSchemaPlugin as unknown as { id: string; type: string };
    expect(plugin.id).toBe('title');
    expect(plugin.type).toBe('$node');
  });

  it('schema has block group', () => {
    const plugin = titleSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.group).toBe('block');
  });

  it('schema has inline* content', () => {
    const plugin = titleSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.content).toBe('inline*');
  });

  it('schema is defining', () => {
    const plugin = titleSchemaPlugin as unknown as { schema: Record<string, unknown> };
    expect(plugin.schema.defining).toBe(true);
  });

  it('schema parseDOM matches div[data-type="title"]', () => {
    const plugin = titleSchemaPlugin as unknown as { schema: { parseDOM: { tag: string }[] } };
    expect(plugin.schema.parseDOM).toHaveLength(1);
    expect(plugin.schema.parseDOM[0]?.tag).toBe('div[data-type="title"]');
  });

  it('schema toDOM returns correct DOM structure', () => {
    const plugin = titleSchemaPlugin as unknown as { schema: { toDOM: () => unknown[] } };
    const result = plugin.schema.toDOM();
    expect(result).toEqual(['div', { 'data-type': 'title', class: 'legal-title' }, 0]);
  });

  describe('parseMarkdown', () => {
    it('matches nodes with type "title"', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: { parseMarkdown: { match: (node: { type: string }) => boolean } };
      };
      expect(plugin.schema.parseMarkdown.match({ type: 'title' })).toBe(true);
    });

    it('does not match nodes with other types', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: { parseMarkdown: { match: (node: { type: string }) => boolean } };
      };
      expect(plugin.schema.parseMarkdown.match({ type: 'paragraph' })).toBe(false);
      expect(plugin.schema.parseMarkdown.match({ type: 'heading' })).toBe(false);
    });

    it('runner opens node, processes children, and closes node', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: {
          parseMarkdown: {
            runner: (state: unknown, node: unknown, type: unknown) => void;
          };
        };
      };
      const openNodeMock = vi.fn().mockReturnThis();
      const nextMock = vi.fn().mockReturnThis();
      const closeNodeMock = vi.fn().mockReturnThis();
      const mockState = {
        openNode: openNodeMock,
        next: nextMock,
        closeNode: closeNodeMock,
      };
      const mockNode = {
        type: 'title',
        children: [{ type: 'text', value: 'My Title' }],
      };
      const mockType = { name: 'title' };

      plugin.schema.parseMarkdown.runner(mockState, mockNode, mockType);

      expect(openNodeMock).toHaveBeenCalledWith(mockType);
      expect(nextMock).toHaveBeenCalledWith(mockNode.children);
      expect(closeNodeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('toMarkdown', () => {
    it('matches ProseMirror nodes with type name "title"', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: { toMarkdown: { match: (node: { type: { name: string } }) => boolean } };
      };
      expect(plugin.schema.toMarkdown.match({ type: { name: 'title' } })).toBe(true);
    });

    it('does not match ProseMirror nodes with other type names', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: { toMarkdown: { match: (node: { type: { name: string } }) => boolean } };
      };
      expect(plugin.schema.toMarkdown.match({ type: { name: 'paragraph' } })).toBe(false);
      expect(plugin.schema.toMarkdown.match({ type: { name: 'heading' } })).toBe(false);
    });

    it('runner serializes as paragraph with "% " prefix text', () => {
      const plugin = titleSchemaPlugin as unknown as {
        schema: {
          toMarkdown: {
            runner: (state: unknown, node: unknown) => void;
          };
        };
      };
      const openNodeMock = vi.fn().mockReturnThis();
      const addNodeMock = vi.fn().mockReturnThis();
      const nextMock = vi.fn().mockReturnThis();
      const closeNodeMock = vi.fn().mockReturnThis();
      const mockState = {
        openNode: openNodeMock,
        addNode: addNodeMock,
        next: nextMock,
        closeNode: closeNodeMock,
      };
      const mockContent = [{ type: { name: 'text' } }];
      const mockNode = { type: { name: 'title' }, content: mockContent };

      plugin.schema.toMarkdown.runner(mockState, mockNode);

      expect(openNodeMock).toHaveBeenCalledWith('paragraph');
      expect(addNodeMock).toHaveBeenCalledWith('text', undefined, '% ');
      expect(nextMock).toHaveBeenCalledWith(mockContent);
      expect(closeNodeMock).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// remarkTitlePlugin ($remark) tests
// ---------------------------------------------------------------------------

describe('remarkTitlePlugin', () => {
  it('is defined and has id "titleSyntax"', () => {
    expect(remarkTitlePlugin).toBeDefined();
    const plugin = remarkTitlePlugin as unknown as { id: string; type: string };
    expect(plugin.id).toBe('titleSyntax');
    expect(plugin.type).toBe('$remark');
  });

  it('transforms paragraph starting with "% " into title node', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '% Master Agreement' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as {
      type: string;
      children: { type: string; value: string }[];
    };
    expect(firstChild.type).toBe('title');
    expect(firstChild.children[0]?.value).toBe('Master Agreement');
  });

  it('does not transform paragraphs that do not start with "% "', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Regular paragraph text' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('paragraph');
  });

  it('strips the "% " prefix from the text value', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '% Annex A' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string; children: { value: string }[] };
    expect(firstChild.children[0]?.value).toBe('Annex A');
  });

  it('removes the text node when value is only "% " (empty title text)', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '% ' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string; children: unknown[] };
    expect(firstChild.type).toBe('title');
    expect(firstChild.children).toHaveLength(0);
  });

  it('does not transform heading nodes', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 1,
          children: [{ type: 'text', value: '% Not a title' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('heading');
  });

  it('only transforms first text child starting with "% "', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'No prefix ' },
            { type: 'text', value: '% not first child' },
          ],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('paragraph');
  });

  it('preserves multiple inline children after the "% " prefix', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '% Bold ' },
            { type: 'strong', children: [{ type: 'text', value: 'Title' }] },
          ],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string; children: unknown[] };
    expect(firstChild.type).toBe('title');
    expect(firstChild.children).toHaveLength(2);
  });

  it('handles tree with multiple paragraphs, only transforms matching ones', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '% Document Title' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Normal paragraph' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '% Annex Title' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const children = tree.children as { type: string }[];
    expect(children[0]?.type).toBe('title');
    expect(children[1]?.type).toBe('paragraph');
    expect(children[2]?.type).toBe('title');
  });

  it('does not transform paragraph where first child is not text', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'strong', children: [{ type: 'text', value: '% Bold' }] }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('paragraph');
  });

  it('does not transform paragraph with "%" but no space after', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '%NoSpace' }],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('paragraph');
  });

  it('handles empty children array gracefully', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [],
        },
      ],
    };

    plugin.plugin()(tree);

    const firstChild = tree.children[0] as { type: string };
    expect(firstChild.type).toBe('paragraph');
  });

  it('handles tree with no children property gracefully', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    const tree = { type: 'root' };

    // Should not throw when tree has no children
    expect(() => {
      plugin.plugin()(tree);
    }).not.toThrow();
  });

  it('handles sparse children array with undefined entries', () => {
    const plugin = remarkTitlePlugin as unknown as { plugin: () => (tree: unknown) => void };
    // Create a tree with a sparse array (undefined at index 0)
    const children: unknown[] = [];
    children.length = 2;

    children[1] = {
      type: 'paragraph',
      children: [{ type: 'text', value: '% Title After Gap' }],
    };
    const tree = { type: 'root', children };

    expect(() => {
      plugin.plugin()(tree);
    }).not.toThrow();

    const secondChild = children[1] as { type: string } | undefined;
    expect(secondChild?.type).toBe('title');
  });
});
