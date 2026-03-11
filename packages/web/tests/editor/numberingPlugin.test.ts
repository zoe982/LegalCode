import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNumberingPlugin, numberingPluginKey } from '../../src/editor/numberingPlugin.js';

// Mock ProseMirror modules
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

// Capture widget calls for inspection
const widgetCalls: { pos: number; factory: () => HTMLElement; options: unknown }[] = [];

vi.mock('@milkdown/kit/prose/view', () => {
  const MockDecoration = {
    widget(pos: number, factory: () => HTMLElement, options: unknown) {
      widgetCalls.push({ pos, factory, options });
      return { type: 'widget', pos, factory, options };
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

// Mock headingTree
import type { HeadingEntry } from '../../src/editor/headingTree.js';
import { extractHeadingTree } from '../../src/editor/headingTree.js';

vi.mock('../../src/editor/headingTree.js', () => ({
  extractHeadingTree: vi.fn(),
}));

const mockExtractHeadingTree = vi.mocked(extractHeadingTree);

// Helper to extract spec from plugin
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

const mockDoc = { nodeSize: 100 };

describe('numberingPlugin', () => {
  beforeEach(() => {
    widgetCalls.length = 0;
    mockExtractHeadingTree.mockReset();
    mockExtractHeadingTree.mockReturnValue([]);
  });

  // --- Plugin key ---

  it('numberingPluginKey is defined with key "numberingPlugin"', () => {
    expect(numberingPluginKey).toBeDefined();
    expect((numberingPluginKey as unknown as { key: string }).key).toBe('numberingPlugin');
  });

  // --- Plugin instance ---

  it('createNumberingPlugin returns a Plugin instance', () => {
    const plugin = createNumberingPlugin();
    expect(plugin).toBeDefined();
    expect((plugin as unknown as { key: unknown }).key).toBe(numberingPluginKey);
  });

  // --- state.init ---

  it('state.init calls extractHeadingTree and returns DecorationSet', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc: mockDoc });
    expect(mockExtractHeadingTree).toHaveBeenCalledWith(mockDoc);
    expect(result).toBeDefined();
  });

  it('state.init returns DecorationSet.empty when no headings', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc: mockDoc }) as { isEmpty?: boolean };
    // DecorationSet.empty has isEmpty: true in our mock
    expect(result).toHaveProperty('isEmpty', true);
  });

  // --- state.apply ---

  it('state.apply returns previous decorations when tr.docChanged is false', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: ['existing'] };
    const tr = { docChanged: false, doc: mockDoc };
    const result = stateSpec.apply(tr, prev);
    expect(result).toBe(prev);
    // extractHeadingTree should NOT be called again during apply when docChanged is false
    expect(mockExtractHeadingTree).not.toHaveBeenCalled();
  });

  it('state.apply rebuilds decorations when tr.docChanged is true', () => {
    const entries: HeadingEntry[] = [
      {
        level: 1,
        text: 'Introduction',
        pos: 0,
        endPos: 50,
        bodyPreview: 'Intro text',
        number: '1.',
      },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: [] };
    const tr = { docChanged: true, doc: mockDoc };
    const result = stateSpec.apply(tr, prev) as { decorations: unknown[] };
    expect(mockExtractHeadingTree).toHaveBeenCalledWith(mockDoc);
    expect(result).toBeDefined();
  });

  it('state.apply returns DecorationSet.empty when docChanged is true but no headings', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = { decorations: ['old'] };
    const tr = { docChanged: true, doc: mockDoc };
    const result = stateSpec.apply(tr, prev) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
  });

  // --- props.decorations ---

  it('props.decorations returns the plugin state', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const propsSpec = getPropsSpec(plugin);
    const pluginState = { decorations: [] };
    const mockState = {
      numberingPlugin: pluginState,
    };
    const result = propsSpec.decorations(mockState);
    expect(result).toBe(pluginState);
  });

  it('props.decorations returns DecorationSet.empty when plugin state is null/undefined', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = {};
    const result = propsSpec.decorations(mockState) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
  });

  // --- Widget decoration creation ---

  it('widget decorations are created at entry.pos + 1 for each heading', () => {
    const entries: HeadingEntry[] = [
      { level: 1, text: 'Intro', pos: 2, endPos: 30, bodyPreview: '', number: '1.' },
      { level: 2, text: 'Sub', pos: 35, endPos: 60, bodyPreview: '', number: '1.1' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc: mockDoc });

    expect(widgetCalls).toHaveLength(2);
    expect(widgetCalls[0]?.pos).toBe(3); // 2 + 1
    expect(widgetCalls[1]?.pos).toBe(36); // 35 + 1
  });

  it('widget creates a span with class "legal-numbering" and entry.number as text', () => {
    const entries: HeadingEntry[] = [
      { level: 1, text: 'Article 1', pos: 0, endPos: 40, bodyPreview: '', number: '1.' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc: mockDoc });

    expect(widgetCalls).toHaveLength(1);
    const factory = widgetCalls[0]?.factory;
    expect(factory).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const span = factory!();
    expect(span.tagName.toLowerCase()).toBe('span');
    expect(span.className).toBe('legal-numbering');
    expect(span.textContent).toBe('1.');
  });

  it('widget span has contentEditable set to false', () => {
    const entries: HeadingEntry[] = [
      { level: 2, text: 'Section', pos: 5, endPos: 25, bodyPreview: '', number: '1.1' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc: mockDoc });

    expect(widgetCalls).toHaveLength(1);
    const factory = widgetCalls[0]?.factory;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const span = factory!();
    expect(span.contentEditable).toBe('false');
  });

  it('widget options have side: -1', () => {
    const entries: HeadingEntry[] = [
      { level: 1, text: 'Heading', pos: 0, endPos: 20, bodyPreview: '', number: '1.' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc: mockDoc });

    expect(widgetCalls).toHaveLength(1);
    expect(widgetCalls[0]?.options).toEqual({ side: -1 });
  });

  // --- Empty doc ---

  it('empty doc (no headings) returns DecorationSet.empty', () => {
    mockExtractHeadingTree.mockReturnValue([]);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc: mockDoc }) as { isEmpty?: boolean };
    expect(result).toHaveProperty('isEmpty', true);
    expect(widgetCalls).toHaveLength(0);
  });

  // --- Multiple headings ---

  it('multiple headings produce correct number of decorations', () => {
    const entries: HeadingEntry[] = [
      { level: 1, text: 'Chapter 1', pos: 0, endPos: 100, bodyPreview: '', number: '1.' },
      { level: 2, text: 'Section 1.1', pos: 10, endPos: 50, bodyPreview: '', number: '1.1' },
      { level: 3, text: 'Subsection 1.1.a', pos: 20, endPos: 40, bodyPreview: '', number: '1.1.a' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    const result = stateSpec.init(undefined, { doc: mockDoc }) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(3);
    expect(widgetCalls).toHaveLength(3);
  });

  it('multiple headings have correct numbers in widget text', () => {
    const entries: HeadingEntry[] = [
      { level: 1, text: 'A', pos: 0, endPos: 50, bodyPreview: '', number: '1.' },
      { level: 2, text: 'B', pos: 10, endPos: 30, bodyPreview: '', number: '1.1' },
    ];
    mockExtractHeadingTree.mockReturnValue(entries);
    const plugin = createNumberingPlugin();
    const stateSpec = getStateSpec(plugin);
    stateSpec.init(undefined, { doc: mockDoc });

    expect(widgetCalls).toHaveLength(2);
    const span0 = widgetCalls[0]?.factory();
    const span1 = widgetCalls[1]?.factory();
    expect(span0?.textContent).toBe('1.');
    expect(span1?.textContent).toBe('1.1');
  });
});
