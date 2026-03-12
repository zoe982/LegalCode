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

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------

import { createTitlePlugin, titlePluginKey, titleNodeSpec } from '../../src/editor/titleNode.js';

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
