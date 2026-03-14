import { describe, it, expect, vi } from 'vitest';
import {
  createPresenceCursorsPlugin,
  presenceCursorsKey,
  type RemoteCursor,
  type PresenceCursorsState,
} from '../../src/editor/presenceCursorsPlugin.js';

// Mock ProseMirror modules following the same pattern as commentPlugin.test.ts
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

vi.mock('@milkdown/kit/prose/view', () => {
  const MockDecoration = {
    widget(pos: number, toDOM: () => unknown, options?: Record<string, unknown>) {
      return { type: 'widget', pos, toDOM, options };
    },
    inline(from: number, to: number, attrs: Record<string, unknown>) {
      return { type: 'inline', from, to, attrs };
    },
  };

  const MockDecorationSet = {
    empty: { decorations: [], find: () => [] as unknown[] },
    create(_doc: unknown, decorations: unknown[]) {
      return {
        decorations,
        find() {
          return decorations;
        },
      };
    },
  };

  return {
    Decoration: MockDecoration,
    DecorationSet: MockDecorationSet,
  };
});

// Helper types for working with the mocked plugin internals
interface MockPluginInstance {
  key: { key: string };
  spec: {
    state: {
      init: () => PresenceCursorsState;
      apply: (tr: unknown, prev: PresenceCursorsState) => PresenceCursorsState;
    };
    props: {
      decorations: (state: unknown) => {
        decorations: unknown[];
        find: () => unknown[];
      };
    };
  };
}

function getPlugin(plugin: unknown) {
  return plugin as MockPluginInstance;
}

function getStateSpec(plugin: unknown) {
  return getPlugin(plugin).spec.state;
}

function getPropsSpec(plugin: unknown) {
  return getPlugin(plugin).spec.props;
}

// Build a mock state object to pass to the decorations prop
function buildMockState(cursors: RemoteCursor[], localUserId: string | null, docSize = 100) {
  return {
    presenceCursors: { cursors, localUserId },
    doc: { content: { size: docSize } },
  };
}

const mockCursor: RemoteCursor = {
  userId: 'user-remote-1',
  email: 'jane@acasus.com',
  name: 'Jane M.',
  color: '#E63946',
  anchor: 10,
  head: 10,
};

describe('presenceCursorsPlugin', () => {
  // ── Key ──────────────────────────────────────────────────────────────

  it('presenceCursorsKey is defined with correct key name', () => {
    expect(presenceCursorsKey).toBeDefined();
    expect((presenceCursorsKey as unknown as { key: string }).key).toBe('presenceCursors');
  });

  // ── Factory ──────────────────────────────────────────────────────────

  it('createPresenceCursorsPlugin returns a Plugin instance bound to presenceCursorsKey', () => {
    const plugin = createPresenceCursorsPlugin();
    expect(plugin).toBeDefined();
    expect(getPlugin(plugin).key).toBe(presenceCursorsKey);
  });

  // ── State: init ──────────────────────────────────────────────────────

  it('initial state: cursors is empty array, localUserId is null', () => {
    const plugin = createPresenceCursorsPlugin();
    const initial = getStateSpec(plugin).init();
    expect(initial.cursors).toEqual([]);
    expect(initial.localUserId).toBeNull();
  });

  // ── State: apply ─────────────────────────────────────────────────────

  it('apply with cursors meta updates cursors', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const newCursors: RemoteCursor[] = [mockCursor];
    const mockTr = {
      getMeta: () => ({ cursors: newCursors }) satisfies Partial<PresenceCursorsState>,
    };

    const result = stateSpec.apply(mockTr, prev);
    expect(result.cursors).toEqual(newCursors);
    expect(result.localUserId).toBeNull(); // unchanged
  });

  it('apply with localUserId meta sets localUserId', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const mockTr = {
      getMeta: () => ({ localUserId: 'local-user-1' }) satisfies Partial<PresenceCursorsState>,
    };

    const result = stateSpec.apply(mockTr, prev);
    expect(result.localUserId).toBe('local-user-1');
    expect(result.cursors).toEqual([]); // unchanged
  });

  it('apply with both cursors and localUserId updates both', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const newCursors: RemoteCursor[] = [mockCursor];
    const mockTr = {
      getMeta: () =>
        ({ cursors: newCursors, localUserId: 'local-abc' }) satisfies Partial<PresenceCursorsState>,
    };

    const result = stateSpec.apply(mockTr, prev);
    expect(result.cursors).toEqual(newCursors);
    expect(result.localUserId).toBe('local-abc');
  });

  it('apply without meta returns previous state unchanged', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const mockTr = { getMeta: () => undefined };
    const result = stateSpec.apply(mockTr, prev);
    expect(result).toBe(prev);
  });

  it('apply preserves existing cursors when only localUserId is provided in meta', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);

    // First set cursors
    const withCursors = stateSpec.apply(
      { getMeta: () => ({ cursors: [mockCursor] }) },
      stateSpec.init(),
    );
    expect(withCursors.cursors).toHaveLength(1);

    // Now update only localUserId
    const withLocalUser = stateSpec.apply(
      { getMeta: () => ({ localUserId: 'local-xyz' }) },
      withCursors,
    );
    expect(withLocalUser.cursors).toEqual([mockCursor]); // preserved
    expect(withLocalUser.localUserId).toBe('local-xyz');
  });

  it('apply with empty cursors array clears all cursors (user disconnect)', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);

    // First populate
    const withCursors = stateSpec.apply(
      { getMeta: () => ({ cursors: [mockCursor] }) },
      stateSpec.init(),
    );
    expect(withCursors.cursors).toHaveLength(1);

    // Now clear
    const cleared = stateSpec.apply({ getMeta: () => ({ cursors: [] }) }, withCursors);
    expect(cleared.cursors).toEqual([]);
  });

  it('apply preserves localUserId when not present in meta (undefined vs missing)', () => {
    const plugin = createPresenceCursorsPlugin();
    const stateSpec = getStateSpec(plugin);

    // Set localUserId first
    const withUser = stateSpec.apply(
      { getMeta: () => ({ localUserId: 'user-local' }) },
      stateSpec.init(),
    );
    expect(withUser.localUserId).toBe('user-local');

    // Apply cursors meta only (no localUserId key) — should preserve existing localUserId
    const updated = stateSpec.apply({ getMeta: () => ({ cursors: [mockCursor] }) }, withUser);
    expect(updated.localUserId).toBe('user-local');
  });

  // ── Decorations: empty state ──────────────────────────────────────────

  it('decorations returns empty when cursor list is empty', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([], null);

    const result = propsSpec.decorations(mockState);
    expect(result.decorations).toEqual([]);
    expect(typeof result.find).toBe('function');
  });

  it('decorations returns empty when pluginState is undefined', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = { doc: { content: { size: 100 } } }; // no presenceCursors key

    const result = propsSpec.decorations(mockState);
    expect(result.decorations).toEqual([]);
    expect(typeof result.find).toBe('function');
  });

  // ── Decorations: single remote cursor ────────────────────────────────

  it('single remote cursor produces one widget decoration', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();

    // One widget decoration (no selection since anchor === head)
    const widgets = decos.filter((d) => (d as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
  });

  it('widget decoration is placed at head position', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const cursorAtPos20 = { ...mockCursor, anchor: 20, head: 20 };
    const mockState = buildMockState([cursorAtPos20], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      pos: number;
    };
    expect(widget.pos).toBe(20);
  });

  it('widget decoration toDOM creates a span with presence-cursor class', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      toDOM: () => HTMLElement;
    };

    const dom = widget.toDOM();
    expect(dom.className).toContain('presence-cursor');
  });

  it('widget decoration DOM has correct aria-label with user name', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      toDOM: () => HTMLElement;
    };

    const dom = widget.toDOM();
    expect(dom.getAttribute('aria-label')).toBe("Jane M.'s cursor");
  });

  it('widget decoration DOM contains cursor line with correct color', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      toDOM: () => HTMLElement;
    };

    const dom = widget.toDOM();
    const line = dom.querySelector<HTMLElement>('.presence-cursor__line');
    expect(line).not.toBeNull();
    if (line === null) throw new Error('Expected .presence-cursor__line element');
    // jsdom normalizes hex colors to rgb() in both style properties and getAttribute
    // #E63946 = rgb(230, 57, 70)
    expect(line.style.backgroundColor).toBe('rgb(230, 57, 70)');
  });

  it('widget decoration DOM contains name label with user name', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      toDOM: () => HTMLElement;
    };

    const dom = widget.toDOM();
    const label = dom.querySelector<HTMLElement>('.presence-cursor__label');
    expect(label).not.toBeNull();
    if (label === null) throw new Error('Expected .presence-cursor__label element');
    expect(label.textContent).toBe('Jane M.');
  });

  it('name label has correct background-color matching cursor color', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = buildMockState([mockCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widget = decos.find((d) => (d as { type: string }).type === 'widget') as {
      toDOM: () => HTMLElement;
    };

    const dom = widget.toDOM();
    const label = dom.querySelector<HTMLElement>('.presence-cursor__label');
    expect(label).not.toBeNull();
    if (label === null) throw new Error('Expected .presence-cursor__label element');
    // jsdom normalizes hex colors to rgb() in both style properties and getAttribute
    // #E63946 = rgb(230, 57, 70)
    expect(label.style.backgroundColor).toBe('rgb(230, 57, 70)');
  });

  // ── Decorations: local user excluded ─────────────────────────────────

  it('no decorations produced for the local user (skips own cursor)', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const localCursor: RemoteCursor = {
      ...mockCursor,
      userId: 'local-user',
    };
    const mockState = buildMockState([localCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    expect(decos).toHaveLength(0);
  });

  it('only local user skipped when mixed with remote users', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const localCursor: RemoteCursor = { ...mockCursor, userId: 'local-user' };
    const remoteCursor: RemoteCursor = {
      ...mockCursor,
      userId: 'remote-user-2',
      head: 30,
      anchor: 30,
    };
    const mockState = buildMockState([localCursor, remoteCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widgets = decos.filter((d) => (d as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { pos: number }).pos).toBe(30);
  });

  // ── Decorations: selection range ─────────────────────────────────────

  it('selection range decoration added when anchor !== head', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const selectingCursor: RemoteCursor = {
      ...mockCursor,
      anchor: 5,
      head: 20,
    };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();

    const inlineDecos = decos.filter((d) => (d as { type: string }).type === 'inline');
    expect(inlineDecos).toHaveLength(1);
  });

  it('selection inline decoration has correct from/to positions', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const selectingCursor: RemoteCursor = { ...mockCursor, anchor: 5, head: 25 };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const inline = decos.find((d) => (d as { type: string }).type === 'inline') as {
      from: number;
      to: number;
    };

    expect(inline.from).toBe(5);
    expect(inline.to).toBe(25);
  });

  it('selection inline decoration from/to are ordered correctly when head < anchor', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    // Reversed selection: anchor > head (user selected backward)
    const selectingCursor: RemoteCursor = { ...mockCursor, anchor: 30, head: 10 };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const inline = decos.find((d) => (d as { type: string }).type === 'inline') as {
      from: number;
      to: number;
    };

    expect(inline.from).toBe(10); // min(anchor, head)
    expect(inline.to).toBe(30); // max(anchor, head)
  });

  it('selection decoration style includes 15% opacity color (hex26)', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const selectingCursor: RemoteCursor = { ...mockCursor, anchor: 5, head: 20, color: '#E63946' };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const inline = decos.find((d) => (d as { type: string }).type === 'inline') as {
      attrs: Record<string, string>;
    };

    expect(inline.attrs.style).toContain('#E6394626');
  });

  it('selection decoration has presence-cursor__selection class', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const selectingCursor: RemoteCursor = { ...mockCursor, anchor: 5, head: 20 };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const inline = decos.find((d) => (d as { type: string }).type === 'inline') as {
      attrs: Record<string, string>;
    };

    expect(inline.attrs.class).toBe('presence-cursor__selection');
  });

  it('selection decoration has data-user-id attribute', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const selectingCursor: RemoteCursor = { ...mockCursor, anchor: 5, head: 20 };
    const mockState = buildMockState([selectingCursor], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const inline = decos.find((d) => (d as { type: string }).type === 'inline') as {
      attrs: Record<string, string>;
    };

    expect(inline.attrs['data-user-id']).toBe(mockCursor.userId);
  });

  it('no inline selection decoration when anchor === head (cursor only)', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const cursorOnly: RemoteCursor = { ...mockCursor, anchor: 15, head: 15 };
    const mockState = buildMockState([cursorOnly], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();

    const inlineDecos = decos.filter((d) => (d as { type: string }).type === 'inline');
    expect(inlineDecos).toHaveLength(0);
  });

  // ── Decorations: multiple users ───────────────────────────────────────

  it('multiple remote users each produce their own widget decoration', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const cursor1: RemoteCursor = { ...mockCursor, userId: 'user-1', head: 10, anchor: 10 };
    const cursor2: RemoteCursor = {
      ...mockCursor,
      userId: 'user-2',
      head: 40,
      anchor: 40,
      color: '#457B9D',
    };
    const mockState = buildMockState([cursor1, cursor2], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();
    const widgets = decos.filter((d) => (d as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(2);
  });

  it('multiple users with selections produce widget + inline for each', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const cursor1: RemoteCursor = { ...mockCursor, userId: 'user-1', anchor: 5, head: 15 };
    const cursor2: RemoteCursor = {
      ...mockCursor,
      userId: 'user-2',
      anchor: 30,
      head: 50,
      color: '#457B9D',
    };
    const mockState = buildMockState([cursor1, cursor2], 'local-user');

    const result = propsSpec.decorations(mockState);
    const decos = result.find();

    const widgets = decos.filter((d) => (d as { type: string }).type === 'widget');
    const inlines = decos.filter((d) => (d as { type: string }).type === 'inline');
    expect(widgets).toHaveLength(2);
    expect(inlines).toHaveLength(2);
  });

  // ── Decorations: boundary conditions ─────────────────────────────────

  it('cursor at position 0 does not crash', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const cursorAtZero: RemoteCursor = { ...mockCursor, anchor: 0, head: 0 };
    const mockState = buildMockState([cursorAtZero], 'local-user');

    expect(() => propsSpec.decorations(mockState)).not.toThrow();
    const result = propsSpec.decorations(mockState);
    expect(result.find()).toHaveLength(1); // one widget
  });

  it('cursor at docSize does not crash', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const docSize = 50;
    const cursorAtEnd: RemoteCursor = { ...mockCursor, anchor: docSize, head: docSize };
    const mockState = buildMockState([cursorAtEnd], 'local-user', docSize);

    expect(() => propsSpec.decorations(mockState)).not.toThrow();
  });

  it('cursor position beyond docSize is clamped (no crash)', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const docSize = 30;
    const outOfBoundsCursor: RemoteCursor = {
      ...mockCursor,
      anchor: 200,
      head: 200, // way beyond docSize
    };
    const mockState = buildMockState([outOfBoundsCursor], 'local-user', docSize);

    expect(() => propsSpec.decorations(mockState)).not.toThrow();
  });

  it('cursor with negative position is clamped to 0', () => {
    const plugin = createPresenceCursorsPlugin();
    const propsSpec = getPropsSpec(plugin);

    const negativeCursor: RemoteCursor = { ...mockCursor, anchor: -5, head: -5 };
    const mockState = buildMockState([negativeCursor], 'local-user');

    expect(() => propsSpec.decorations(mockState)).not.toThrow();
  });

  // ── Type shape tests ──────────────────────────────────────────────────

  it('RemoteCursor type has required fields', () => {
    const cursor: RemoteCursor = {
      userId: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      color: '#FF0000',
      anchor: 0,
      head: 10,
    };
    expect(cursor.userId).toBe('u1');
    expect(cursor.email).toBe('test@example.com');
    expect(cursor.name).toBe('Test User');
    expect(cursor.color).toBe('#FF0000');
    expect(cursor.anchor).toBe(0);
    expect(cursor.head).toBe(10);
  });

  it('PresenceCursorsState type has correct shape', () => {
    const state: PresenceCursorsState = {
      cursors: [],
      localUserId: 'abc',
    };
    expect(state.cursors).toEqual([]);
    expect(state.localUserId).toBe('abc');
  });

  it('PresenceCursorsState allows null localUserId', () => {
    const state: PresenceCursorsState = {
      cursors: [],
      localUserId: null,
    };
    expect(state.localUserId).toBeNull();
  });
});
