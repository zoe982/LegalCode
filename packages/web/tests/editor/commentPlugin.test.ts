import { describe, it, expect, vi } from 'vitest';
import {
  createCommentPlugin,
  commentPluginKey,
  type SelectionInfo,
  type CommentAnchor,
} from '../../src/editor/commentPlugin.js';

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

vi.mock('@milkdown/kit/prose/view', () => {
  const MockDecoration = {
    inline(from: number, to: number, attrs: Record<string, unknown>) {
      return { from, to, attrs };
    },
  };

  const MockDecorationSet = {
    empty: { decorations: [] },
    create(_doc: unknown, decorations: unknown[]) {
      return { decorations };
    },
  };

  return {
    Decoration: MockDecoration,
    DecorationSet: MockDecorationSet,
  };
});

// Helper to extract spec from plugin
function getSpec(plugin: unknown) {
  return (plugin as { spec: Record<string, unknown> }).spec;
}

function getStateSpec(plugin: unknown) {
  return getSpec(plugin).state as {
    init: () => unknown;
    apply: (tr: unknown, prev: unknown) => unknown;
  };
}

function getPropsSpec(plugin: unknown) {
  return getSpec(plugin).props as {
    decorations: (state: unknown) => unknown;
  };
}

function getViewSpec(plugin: unknown) {
  return getSpec(plugin).view as () => {
    update: (view: unknown) => void;
  };
}

describe('commentPlugin', () => {
  it('commentPluginKey is defined', () => {
    expect(commentPluginKey).toBeDefined();
    expect((commentPluginKey as unknown as { key: string }).key).toBe('commentPlugin');
  });

  it('createCommentPlugin returns a Plugin instance', () => {
    const plugin = createCommentPlugin();
    expect(plugin).toBeDefined();
    expect((plugin as unknown as { key: unknown }).key).toBe(commentPluginKey);
  });

  it('createCommentPlugin accepts options', () => {
    const onSelectionChange = vi.fn();
    const plugin = createCommentPlugin({ onSelectionChange });
    expect(plugin).toBeDefined();
  });

  it('plugin state init returns correct defaults', () => {
    const plugin = createCommentPlugin();
    const initial = getStateSpec(plugin).init() as {
      selection: SelectionInfo;
      anchors: CommentAnchor[];
      activeCommentId: string | null;
    };
    expect(initial.selection.hasSelection).toBe(false);
    expect(initial.selection.text).toBe('');
    expect(initial.selection.buttonPosition).toBeNull();
    expect(initial.anchors).toEqual([]);
    expect(initial.activeCommentId).toBeNull();
  });

  it('plugin state apply with meta updates anchors', () => {
    const plugin = createCommentPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const newAnchors: CommentAnchor[] = [{ commentId: 'c1', from: 10, to: 20, resolved: false }];
    const mockTr = { getMeta: () => ({ anchors: newAnchors }) };

    const result = stateSpec.apply(mockTr, prev) as { anchors: CommentAnchor[] };
    expect(result.anchors).toEqual(newAnchors);
  });

  it('plugin state apply with activeCommentId meta', () => {
    const plugin = createCommentPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const mockTr = { getMeta: () => ({ activeCommentId: 'c1' }) };
    const result = stateSpec.apply(mockTr, prev) as { activeCommentId: string | null };
    expect(result.activeCommentId).toBe('c1');
  });

  it('plugin state apply with activeCommentId: null clears activeCommentId', () => {
    const plugin = createCommentPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    // First set activeCommentId to 'c1'
    const setTr = { getMeta: () => ({ activeCommentId: 'c1' }) };
    const withActive = stateSpec.apply(setTr, prev) as { activeCommentId: string | null };
    expect(withActive.activeCommentId).toBe('c1');

    // Now explicitly set to null — should clear it
    const clearTr = { getMeta: () => ({ activeCommentId: null }) };
    const cleared = stateSpec.apply(clearTr, withActive) as { activeCommentId: string | null };
    expect(cleared.activeCommentId).toBeNull();
  });

  it('plugin state apply without meta returns previous state', () => {
    const plugin = createCommentPlugin();
    const stateSpec = getStateSpec(plugin);
    const prev = stateSpec.init();

    const mockTr = { getMeta: () => undefined };
    const result = stateSpec.apply(mockTr, prev);
    expect(result).toBe(prev);
  });

  // --- decorations prop ---

  it('decorations returns empty when no anchors', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = {
      commentPlugin: { anchors: [], activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState);
    expect(result).toEqual({ decorations: [] });
  });

  it('decorations returns empty when pluginState is null', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const mockState = { doc: { content: { size: 100 } } };
    const result = propsSpec.decorations(mockState);
    expect(result).toEqual({ decorations: [] });
  });

  it('decorations creates inline decorations for valid anchors', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [{ commentId: 'c1', from: 5, to: 15, resolved: false }];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as {
      decorations: { from: number; to: number; attrs: Record<string, string> }[];
    };
    expect(result.decorations).toHaveLength(1);
    expect(result.decorations[0]?.from).toBe(5);
    expect(result.decorations[0]?.to).toBe(15);
    expect(result.decorations[0]?.attrs.class).toBe('comment-highlight');
    expect(result.decorations[0]?.attrs.style).toContain('rgba(245,166,35,0.2)');
  });

  it('decorations include data-comment-id attribute', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [{ commentId: 'c1', from: 5, to: 15, resolved: false }];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as {
      decorations: { from: number; to: number; attrs: Record<string, string> }[];
    };
    expect(result.decorations[0]?.attrs['data-comment-id']).toBe('c1');
  });

  it('decorations applies active style when anchor matches activeCommentId', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [{ commentId: 'c1', from: 5, to: 15, resolved: false }];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: 'c1' },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as {
      decorations: { from: number; to: number; attrs: Record<string, string> }[];
    };
    expect(result.decorations[0]?.attrs.class).toBe('comment-highlight comment-highlight--active');
    expect(result.decorations[0]?.attrs.style).toContain('rgba(245,166,35,0.33)');
  });

  it('decorations applies resolved style for resolved anchors', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [{ commentId: 'c1', from: 5, to: 15, resolved: true }];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as {
      decorations: { from: number; to: number; attrs: Record<string, string> }[];
    };
    expect(result.decorations[0]?.attrs.style).toContain('rgba(245,166,35,0.1)');
  });

  it('decorations skips anchors with from >= to', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [
      { commentId: 'c1', from: 15, to: 5, resolved: false },
      { commentId: 'c2', from: 10, to: 10, resolved: false },
    ];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(0);
  });

  it('decorations skips out-of-range anchors', () => {
    const plugin = createCommentPlugin();
    const propsSpec = getPropsSpec(plugin);
    const anchors: CommentAnchor[] = [
      { commentId: 'c1', from: -1, to: 5, resolved: false },
      { commentId: 'c2', from: 5, to: 200, resolved: false },
    ];
    const mockState = {
      commentPlugin: { anchors, activeCommentId: null },
      doc: { content: { size: 100 } },
    };
    const result = propsSpec.decorations(mockState) as { decorations: unknown[] };
    expect(result.decorations).toHaveLength(0);
  });

  // --- view callback ---

  it('view update calls onSelectionChange with no selection', () => {
    const onSelectionChange = vi.fn();
    const plugin = createCommentPlugin({ onSelectionChange });
    const viewSpec = getViewSpec(plugin);
    const viewReturn = viewSpec();

    const mockView = {
      state: {
        selection: { from: 5, to: 5, empty: true },
        doc: { textBetween: vi.fn().mockReturnValue('') },
      },
      dom: { getBoundingClientRect: () => ({ top: 0, left: 0 }) },
      coordsAtPos: vi.fn(),
    };

    viewReturn.update(mockView);
    expect(onSelectionChange).toHaveBeenCalledWith(
      { hasSelection: false, text: '', buttonPosition: null },
      undefined,
    );
  });

  it('view update calls onSelectionChange with selection and position', () => {
    const onSelectionChange = vi.fn();
    const plugin = createCommentPlugin({ onSelectionChange });
    const viewSpec = getViewSpec(plugin);
    const viewReturn = viewSpec();

    const mockView = {
      state: {
        selection: { from: 5, to: 15, empty: false },
        doc: { textBetween: vi.fn().mockReturnValue('selected') },
      },
      dom: { getBoundingClientRect: () => ({ top: 100, left: 50 }) },
      coordsAtPos: vi.fn().mockReturnValue({ bottom: 120, left: 80 }),
    };

    viewReturn.update(mockView);
    expect(onSelectionChange).toHaveBeenCalledWith(
      {
        hasSelection: true,
        text: 'selected',
        buttonPosition: { top: 24, left: 30 },
      },
      { from: 5, to: 15, text: 'selected' },
    );
  });

  it('view update handles coordsAtPos errors gracefully', () => {
    const onSelectionChange = vi.fn();
    const plugin = createCommentPlugin({ onSelectionChange });
    const viewSpec = getViewSpec(plugin);
    const viewReturn = viewSpec();

    const mockView = {
      state: {
        selection: { from: 5, to: 15, empty: false },
        doc: { textBetween: vi.fn().mockReturnValue('text') },
      },
      dom: { getBoundingClientRect: () => ({ top: 0, left: 0 }) },
      coordsAtPos: vi.fn().mockImplementation(() => {
        throw new Error('Position out of range');
      }),
    };

    viewReturn.update(mockView);
    expect(onSelectionChange).toHaveBeenCalledWith(
      { hasSelection: true, text: 'text', buttonPosition: null },
      { from: 5, to: 15, text: 'text' },
    );
  });

  it('view update works without onSelectionChange option', () => {
    const plugin = createCommentPlugin();
    const viewSpec = getViewSpec(plugin);
    const viewReturn = viewSpec();

    const mockView = {
      state: {
        selection: { from: 0, to: 0, empty: true },
        doc: { textBetween: vi.fn() },
      },
      dom: { getBoundingClientRect: () => ({ top: 0, left: 0 }) },
      coordsAtPos: vi.fn(),
    };

    expect(() => {
      viewReturn.update(mockView);
    }).not.toThrow();
  });

  // --- Type shape tests ---

  it('SelectionInfo type has correct shape', () => {
    const info: SelectionInfo = {
      hasSelection: true,
      text: 'selected text',
      buttonPosition: { top: 100, left: 200 },
    };
    expect(info.hasSelection).toBe(true);
    expect(info.text).toBe('selected text');
    expect(info.buttonPosition).toEqual({ top: 100, left: 200 });
  });

  it('CommentAnchor type has correct shape', () => {
    const anchor: CommentAnchor = {
      commentId: 'c1',
      from: 10,
      to: 20,
      resolved: false,
    };
    expect(anchor.commentId).toBe('c1');
    expect(anchor.from).toBe(10);
    expect(anchor.to).toBe(20);
    expect(anchor.resolved).toBe(false);
  });

  it('SelectionInfo with null buttonPosition', () => {
    const info: SelectionInfo = {
      hasSelection: false,
      text: '',
      buttonPosition: null,
    };
    expect(info.buttonPosition).toBeNull();
  });
});
