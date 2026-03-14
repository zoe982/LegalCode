import { describe, it, expect, vi } from 'vitest';
import {
  createSuggestionPlugin,
  suggestionPluginKey,
  type SuggestionPluginState,
} from '../../src/editor/suggestionPlugin.js';
import type { SuggestionAnchor } from '../../src/editor/suggestionAnchors.js';

// Mock ProseMirror modules following commentPlugin.test.ts pattern
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
    inline(from: number, to: number, attrs: Record<string, unknown>) {
      return { type: 'inline', from, to, attrs };
    },
    widget(pos: number, toDOM: () => unknown, spec: Record<string, unknown>) {
      return { type: 'widget', pos, toDOM, spec };
    },
  };

  const MockDecorationSet = {
    empty: { decorations: [], isEmpty: true },
    create(_doc: unknown, decorations: unknown[]) {
      return { decorations, isEmpty: decorations.length === 0 };
    },
  };

  return {
    Decoration: MockDecoration,
    DecorationSet: MockDecorationSet,
  };
});

// Mock getSuggestionColor to return predictable values
vi.mock('../../src/utils/suggestionColors.js', () => ({
  getSuggestionColor: (email: string) => (email === 'alice@example.com' ? '#E63946' : '#457B9D'),
}));

// Helper to extract spec pieces from plugin
function getSpec(plugin: unknown) {
  return (plugin as { spec: Record<string, unknown> }).spec;
}

function getStateSpec(plugin: unknown) {
  return getSpec(plugin).state as {
    init: () => SuggestionPluginState;
    apply: (tr: unknown, prev: SuggestionPluginState) => SuggestionPluginState;
  };
}

function getPropsSpec(plugin: unknown) {
  return getSpec(plugin).props as {
    decorations: (state: unknown) => unknown;
    handleTextInput: (view: unknown, from: number, to: number, text: string) => boolean;
    handleKeyDown: (view: unknown, event: unknown) => boolean;
  };
}

function buildState(pluginState: SuggestionPluginState, docSize = 100) {
  return {
    suggestionPlugin: pluginState,
    doc: {
      content: { size: docSize },
      textBetween: (from: number, to: number) => 'deleted'.slice(0, to - from),
    },
  };
}

const deleteAnchor: SuggestionAnchor = {
  suggestionId: 's1',
  from: 5,
  to: 15,
  type: 'delete',
  originalText: 'hello world',
  replacementText: null,
  authorEmail: 'alice@example.com',
};

const insertAnchor: SuggestionAnchor = {
  suggestionId: 's2',
  from: 20,
  to: 20,
  type: 'insert',
  originalText: '',
  replacementText: 'new text',
  authorEmail: 'alice@example.com',
};

describe('suggestionPlugin', () => {
  it('suggestionPluginKey is defined with correct key name', () => {
    expect(suggestionPluginKey).toBeDefined();
    expect((suggestionPluginKey as unknown as { key: string }).key).toBe('suggestionPlugin');
  });

  it('createSuggestionPlugin returns a plugin', () => {
    const plugin = createSuggestionPlugin();
    expect(plugin).toBeDefined();
    expect((plugin as unknown as { key: unknown }).key).toBe(suggestionPluginKey);
  });

  it('createSuggestionPlugin accepts options without error', () => {
    const plugin = createSuggestionPlugin({
      onSuggestInsert: vi.fn(),
      onSuggestDelete: vi.fn(),
    });
    expect(plugin).toBeDefined();
  });

  // --- Initial state ---

  it('initial state has empty anchors, null activeSuggestionId, false suggestingMode', () => {
    const plugin = createSuggestionPlugin();
    const initial = getStateSpec(plugin).init();
    expect(initial.anchors).toEqual([]);
    expect(initial.activeSuggestionId).toBeNull();
    expect(initial.suggestingMode).toBe(false);
  });

  // --- State apply ---

  it('apply with anchors meta updates anchors', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();
    const anchors: SuggestionAnchor[] = [deleteAnchor];
    const mockTr = { getMeta: () => ({ anchors }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.anchors).toEqual(anchors);
  });

  it('apply with activeSuggestionId meta updates it', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();
    const mockTr = { getMeta: () => ({ activeSuggestionId: 's1' }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.activeSuggestionId).toBe('s1');
  });

  it('apply with activeSuggestionId: null explicitly clears it', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev: SuggestionPluginState = {
      anchors: [],
      activeSuggestionId: 's1',
      suggestingMode: false,
    };
    const mockTr = { getMeta: () => ({ activeSuggestionId: null }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.activeSuggestionId).toBeNull();
  });

  it('apply with suggestingMode: true sets it', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();
    const mockTr = { getMeta: () => ({ suggestingMode: true }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.suggestingMode).toBe(true);
  });

  it('apply with suggestingMode: false sets it back to false', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev: SuggestionPluginState = {
      anchors: [],
      activeSuggestionId: null,
      suggestingMode: true,
    };
    const mockTr = { getMeta: () => ({ suggestingMode: false }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.suggestingMode).toBe(false);
  });

  it('apply without meta returns previous state unchanged', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();
    const mockTr = { getMeta: () => undefined };
    const result = stateSpec.apply(mockTr, prev);
    expect(result).toBe(prev);
  });

  it('apply preserves existing anchors when only activeSuggestionId is set in meta', () => {
    const plugin = createSuggestionPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev: SuggestionPluginState = {
      anchors: [deleteAnchor],
      activeSuggestionId: null,
      suggestingMode: false,
    };
    const mockTr = { getMeta: () => ({ activeSuggestionId: 's1' }) };
    const result = stateSpec.apply(mockTr, prev);
    expect(result.anchors).toEqual([deleteAnchor]);
    expect(result.activeSuggestionId).toBe('s1');
  });

  // --- Decorations ---

  it('decorations returns empty set when no anchors', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({ anchors: [], activeSuggestionId: null, suggestingMode: false });
    const result = propsSpec.decorations(state);
    expect(result).toEqual({ decorations: [], isEmpty: true });
  });

  it('decorations returns empty set when pluginState is null', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = { doc: { content: { size: 100 } } };
    const result = propsSpec.decorations(state);
    expect(result).toEqual({ decorations: [], isEmpty: true });
  });

  it('decorations creates inline decoration for delete anchor', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [deleteAnchor],
      activeSuggestionId: null,
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { type: string; from: number; to: number; attrs: Record<string, string> }[];
    };
    expect(result.decorations).toHaveLength(1);
    expect(result.decorations[0]?.type).toBe('inline');
    expect(result.decorations[0]?.from).toBe(5);
    expect(result.decorations[0]?.to).toBe(15);
    expect(result.decorations[0]?.attrs.class).toContain('suggestion-delete');
    expect(result.decorations[0]?.attrs['data-suggestion-id']).toBe('s1');
  });

  it('decorations creates widget decoration for insert anchor', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [insertAnchor],
      activeSuggestionId: null,
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { type: string; pos: number; toDOM: () => HTMLElement }[];
    };
    expect(result.decorations).toHaveLength(1);
    expect(result.decorations[0]?.type).toBe('widget');
    expect(result.decorations[0]?.pos).toBe(20);
  });

  it('delete decoration has active class when anchor is active', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [deleteAnchor],
      activeSuggestionId: 's1',
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { attrs: Record<string, string> }[];
    };
    expect(result.decorations[0]?.attrs.class).toContain('suggestion-delete--active');
  });

  it('delete decoration does not have active class when not active', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [deleteAnchor],
      activeSuggestionId: null,
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { attrs: Record<string, string> }[];
    };
    expect(result.decorations[0]?.attrs.class).not.toContain('suggestion-delete--active');
  });

  it('widget toDOM creates span with correct data attribute', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [insertAnchor],
      activeSuggestionId: null,
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { type: string; toDOM: () => HTMLSpanElement }[];
    };
    const span = result.decorations[0]?.toDOM();
    expect(span?.dataset.suggestionId).toBe('s2');
    expect(span?.textContent).toBe('new text');
  });

  it('widget active class when anchor matches activeSuggestionId', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({
      anchors: [insertAnchor],
      activeSuggestionId: 's2',
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as {
      decorations: { toDOM: () => HTMLSpanElement }[];
    };
    const span = result.decorations[0]?.toDOM();
    expect(span?.className).toContain('suggestion-insert--active');
  });

  it('out-of-bounds delete anchor (to > docSize) is skipped', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const outOfBounds: SuggestionAnchor = { ...deleteAnchor, from: 5, to: 200 };
    const state = buildState(
      { anchors: [outOfBounds], activeSuggestionId: null, suggestingMode: false },
      100,
    );
    const result = propsSpec.decorations(state) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(0);
  });

  it('delete anchor from === to is skipped (no range)', () => {
    const plugin = createSuggestionPlugin();
    const propsSpec = getPropsSpec(plugin);
    const zeroRange: SuggestionAnchor = { ...deleteAnchor, from: 10, to: 10 };
    const state = buildState({
      anchors: [zeroRange],
      activeSuggestionId: null,
      suggestingMode: false,
    });
    const result = propsSpec.decorations(state) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(0);
  });

  // --- handleTextInput ---

  it('handleTextInput returns false when suggestingMode is false', () => {
    const onSuggestInsert = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestInsert });
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({ anchors: [], activeSuggestionId: null, suggestingMode: false });
    const view = { state, dispatch: vi.fn() } as unknown;
    const result = propsSpec.handleTextInput(view, 5, 5, 'a');
    expect(result).toBe(false);
    expect(onSuggestInsert).not.toHaveBeenCalled();
  });

  it('handleTextInput intercepts and calls onSuggestInsert when suggestingMode is true', () => {
    const onSuggestInsert = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestInsert });
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({ anchors: [], activeSuggestionId: null, suggestingMode: true });
    const view = { state, dispatch: vi.fn() } as unknown;
    const result = propsSpec.handleTextInput(view, 5, 5, 'x');
    expect(result).toBe(true);
    expect(onSuggestInsert).toHaveBeenCalledWith(5, 5, 'x');
  });

  it('handleTextInput with selection also calls onSuggestDelete for the replaced range', () => {
    const onSuggestInsert = vi.fn();
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestInsert, onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: {
        content: { size: 100 },
        textBetween: vi.fn().mockReturnValue('old text'),
      },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    // from !== to → selection replacement
    const result = propsSpec.handleTextInput(view, 5, 15, 'new');
    expect(result).toBe(true);
    expect(onSuggestDelete).toHaveBeenCalledWith(5, 15, 'old text');
    expect(onSuggestInsert).toHaveBeenCalledWith(5, 15, 'new');
  });

  // --- handleKeyDown ---

  it('handleKeyDown returns false when suggestingMode is false', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({ anchors: [], activeSuggestionId: null, suggestingMode: false });
    const view = { state, dispatch: vi.fn() } as unknown;
    const event = { key: 'Backspace' };
    const result = propsSpec.handleKeyDown(view, event);
    expect(result).toBe(false);
    expect(onSuggestDelete).not.toHaveBeenCalled();
  });

  it('handleKeyDown Backspace on collapsed cursor calls onSuggestDelete for char before cursor', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: {
        content: { size: 100 },
        textBetween: vi.fn().mockReturnValue('x'),
      },
      selection: { from: 10, to: 10 },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    const event = { key: 'Backspace' };
    const result = propsSpec.handleKeyDown(view, event);
    expect(result).toBe(true);
    expect(onSuggestDelete).toHaveBeenCalledWith(9, 10, 'x');
  });

  it('handleKeyDown Delete on collapsed cursor calls onSuggestDelete for char after cursor', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: {
        content: { size: 100 },
        textBetween: vi.fn().mockReturnValue('y'),
      },
      selection: { from: 10, to: 10 },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    const event = { key: 'Delete' };
    const result = propsSpec.handleKeyDown(view, event);
    expect(result).toBe(true);
    expect(onSuggestDelete).toHaveBeenCalledWith(10, 11, 'y');
  });

  it('handleKeyDown Backspace with selection calls onSuggestDelete for selection range', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: {
        content: { size: 100 },
        textBetween: vi.fn().mockReturnValue('selected'),
      },
      selection: { from: 5, to: 15 },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    const event = { key: 'Backspace' };
    const result = propsSpec.handleKeyDown(view, event);
    expect(result).toBe(true);
    expect(onSuggestDelete).toHaveBeenCalledWith(5, 15, 'selected');
  });

  it('handleKeyDown returns false for non-delete keys even in suggestingMode', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const state = buildState({ anchors: [], activeSuggestionId: null, suggestingMode: true });
    const view = {
      state: Object.assign(state, { selection: { from: 5, to: 5 } }),
      dispatch: vi.fn(),
    } as unknown;
    const event = { key: 'Enter' };
    const result = propsSpec.handleKeyDown(view, event);
    expect(result).toBe(false);
    expect(onSuggestDelete).not.toHaveBeenCalled();
  });

  it('handleKeyDown Backspace at position 0 does not call onSuggestDelete', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: { content: { size: 100 }, textBetween: vi.fn() },
      selection: { from: 0, to: 0 },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    const result = propsSpec.handleKeyDown(view, { key: 'Backspace' });
    expect(result).toBe(true);
    expect(onSuggestDelete).not.toHaveBeenCalled();
  });

  it('handleKeyDown Delete at end of doc does not call onSuggestDelete', () => {
    const onSuggestDelete = vi.fn();
    const plugin = createSuggestionPlugin({ onSuggestDelete });
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      suggestionPlugin: { anchors: [], activeSuggestionId: null, suggestingMode: true },
      doc: { content: { size: 100 }, textBetween: vi.fn() },
      selection: { from: 100, to: 100 },
    };
    const view = { state: mockState, dispatch: vi.fn() } as unknown;
    const result = propsSpec.handleKeyDown(view, { key: 'Delete' });
    expect(result).toBe(true);
    expect(onSuggestDelete).not.toHaveBeenCalled();
  });
});
