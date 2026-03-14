/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateVariables } from '../../src/hooks/useTemplateVariables.js';

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock('../../src/editor/variableUtils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/editor/variableUtils.js')>();
  return {
    ...actual,
    generateVariableId: vi.fn((name: string) => `${name.toLowerCase().replace(/\s+/g, '-')}-abcd`),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────

const MARKDOWN_WITH_VARS = `---
variables:
  - id: "client-name-1111"
    name: "Client Name"
    type: "text"
  - id: "sign-date-2222"
    name: "Signing Date"
    type: "date"
---
# Agreement

This is the body.
`;

const MARKDOWN_WITH_EXTRA_FRONTMATTER = `---
title: "My Template"
variables:
  - id: "party-name-3333"
    name: "Party Name"
    type: "text"
---
Body content here.
`;

const MARKDOWN_NO_VARS = `---
title: "Plain Template"
---
Just the body.
`;

const MARKDOWN_NO_FRONTMATTER = `# Heading

Plain markdown with no frontmatter.
`;

// ── Utility: safe array access that throws on undefined ───────────────
function getAt<T>(arr: T[], index: number): T {
  const item = arr[index];
  if (item === undefined) {
    throw new Error(
      `Expected element at index ${String(index)} but array has length ${String(arr.length)}`,
    );
  }
  return item;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useTemplateVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────

  it('starts with an empty variables array', () => {
    const { result } = renderHook(() => useTemplateVariables());
    expect(result.current.variables).toEqual([]);
  });

  // ── addVariable ────────────────────────────────────────────────────

  describe('addVariable', () => {
    it('adds a new variable and returns the definition', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let returned: ReturnType<typeof result.current.addVariable> | undefined;
      act(() => {
        returned = result.current.addVariable('Party Name', 'text');
      });

      expect(result.current.variables).toHaveLength(1);
      const variable = getAt(result.current.variables, 0);
      expect(variable.name).toBe('Party Name');
      expect(variable.type).toBe('text');
      expect(variable.id).toBe('party-name-abcd');
      expect(returned).toEqual(variable);
    });

    it('returns the newly created VariableDefinition', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let def: ReturnType<typeof result.current.addVariable> | undefined;
      act(() => {
        def = result.current.addVariable('Signature', 'signature');
      });

      expect(def).toMatchObject({ name: 'Signature', type: 'signature' });
      expect(typeof def?.id).toBe('string');
    });

    it('generates unique IDs for duplicate names (two variables added)', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Name', 'text');
      });
      act(() => {
        result.current.addVariable('Name', 'date');
      });

      expect(result.current.variables).toHaveLength(2);
    });

    it('includes customType when type is custom', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Entity Type', 'custom', 'LLC');
      });

      const variable = getAt(result.current.variables, 0);
      expect(variable.type).toBe('custom');
      expect(variable.customType).toBe('LLC');
    });

    it('omits customType when type is predefined', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Amount', 'currency');
      });

      const variable = getAt(result.current.variables, 0);
      expect(variable.type).toBe('currency');
      expect(variable.customType).toBeUndefined();
    });

    it('accumulates multiple variables across separate act blocks', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Field A', 'text');
      });
      act(() => {
        result.current.addVariable('Field B', 'date');
      });
      act(() => {
        result.current.addVariable('Field C', 'number');
      });

      expect(result.current.variables).toHaveLength(3);
    });
  });

  // ── renameVariable ─────────────────────────────────────────────────

  describe('renameVariable', () => {
    it('updates the name while keeping the same ID', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Original', 'text');
      });

      const originalId = getAt(result.current.variables, 0).id;

      act(() => {
        result.current.renameVariable(originalId, 'Updated Name');
      });

      expect(result.current.variables).toHaveLength(1);
      const renamed = getAt(result.current.variables, 0);
      expect(renamed.id).toBe(originalId);
      expect(renamed.name).toBe('Updated Name');
    });

    it('is a no-op when the ID is not found', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Existing', 'text');
      });

      const before = [...result.current.variables];

      act(() => {
        result.current.renameVariable('nonexistent-id', 'Should Not Apply');
      });

      expect(result.current.variables).toEqual(before);
    });

    it('does not affect other variables when renaming one', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('First', 'text');
      });
      act(() => {
        result.current.addVariable('Second', 'date');
      });

      const secondId = getAt(result.current.variables, 1).id;

      act(() => {
        result.current.renameVariable(secondId, 'Second Renamed');
      });

      expect(getAt(result.current.variables, 0).name).toBe('First');
      expect(getAt(result.current.variables, 1).name).toBe('Second Renamed');
    });
  });

  // ── retypeVariable ─────────────────────────────────────────────────

  describe('retypeVariable', () => {
    it('changes the type of an existing variable', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Signed By', 'text');
      });

      const v = getAt(result.current.variables, 0);

      act(() => {
        result.current.retypeVariable(v.id, 'signature');
      });

      expect(getAt(result.current.variables, 0).type).toBe('signature');
    });

    it('clears customType when switching from custom to a predefined type', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Entity', 'custom', 'LLC');
      });

      const v = getAt(result.current.variables, 0);

      act(() => {
        result.current.retypeVariable(v.id, 'text');
      });

      const updated = getAt(result.current.variables, 0);
      expect(updated.type).toBe('text');
      expect(updated.customType).toBeUndefined();
    });

    it('sets customType when switching to custom type', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Region', 'text');
      });

      const v = getAt(result.current.variables, 0);

      act(() => {
        result.current.retypeVariable(v.id, 'custom', 'US State');
      });

      const updated = getAt(result.current.variables, 0);
      expect(updated.type).toBe('custom');
      expect(updated.customType).toBe('US State');
    });

    it('is a no-op when the ID is not found', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Stable', 'text');
      });

      const before = [...result.current.variables];

      act(() => {
        result.current.retypeVariable('no-such-id', 'date');
      });

      expect(result.current.variables).toEqual(before);
    });
  });

  // ── deleteVariable ─────────────────────────────────────────────────

  describe('deleteVariable', () => {
    it('removes the variable with the given ID', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('To Delete', 'text');
      });
      act(() => {
        result.current.addVariable('To Keep', 'date');
      });

      const first = getAt(result.current.variables, 0);

      act(() => {
        result.current.deleteVariable(first.id);
      });

      expect(result.current.variables).toHaveLength(1);
      expect(getAt(result.current.variables, 0).name).toBe('To Keep');
    });

    it('is a no-op when the ID is not found', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Keeper', 'text');
      });

      act(() => {
        result.current.deleteVariable('ghost-id');
      });

      expect(result.current.variables).toHaveLength(1);
    });

    it('results in an empty array when the only variable is deleted', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Only One', 'number');
      });

      const v = getAt(result.current.variables, 0);

      act(() => {
        result.current.deleteVariable(v.id);
      });

      expect(result.current.variables).toEqual([]);
    });
  });

  // ── getVariableById ────────────────────────────────────────────────

  describe('getVariableById', () => {
    it('returns the definition for an existing ID', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Find Me', 'address');
      });

      const v = getAt(result.current.variables, 0);
      const found = result.current.getVariableById(v.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('returns undefined when the ID is not found', () => {
      const { result } = renderHook(() => useTemplateVariables());

      const found = result.current.getVariableById('missing');
      expect(found).toBeUndefined();
    });

    it('returns the correct variable among multiple', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Alpha', 'text');
      });
      act(() => {
        result.current.addVariable('Beta', 'date');
      });

      const beta = getAt(result.current.variables, 1);
      const found = result.current.getVariableById(beta.id);

      expect(found?.name).toBe('Beta');
    });
  });

  // ── stripFrontmatter ───────────────────────────────────────────────

  describe('stripFrontmatter', () => {
    it('extracts variables from frontmatter and returns clean body', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let stripped: ReturnType<typeof result.current.stripFrontmatter> | undefined;
      act(() => {
        stripped = result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });

      expect(result.current.variables).toHaveLength(2);
      expect(getAt(result.current.variables, 0).name).toBe('Client Name');
      expect(getAt(result.current.variables, 1).name).toBe('Signing Date');

      expect(stripped?.body).not.toContain('---');
      expect(stripped?.body).toContain('# Agreement');
    });

    it('returns all extracted variables in the returned object', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let stripped: ReturnType<typeof result.current.stripFrontmatter> | undefined;
      act(() => {
        stripped = result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });

      expect(stripped?.variables).toHaveLength(2);
      expect(getAt(stripped?.variables ?? [], 0).id).toBe('client-name-1111');
    });

    it('handles markdown with no frontmatter — returns full body, empty variables', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let stripped: ReturnType<typeof result.current.stripFrontmatter> | undefined;
      act(() => {
        stripped = result.current.stripFrontmatter(MARKDOWN_NO_FRONTMATTER);
      });

      expect(result.current.variables).toEqual([]);
      expect(stripped?.body).toContain('# Heading');
      expect(stripped?.variables).toEqual([]);
    });

    it('handles frontmatter with no variables key — empty variables, body intact', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let stripped: ReturnType<typeof result.current.stripFrontmatter> | undefined;
      act(() => {
        stripped = result.current.stripFrontmatter(MARKDOWN_NO_VARS);
      });

      expect(result.current.variables).toEqual([]);
      expect(stripped?.body).toContain('Just the body.');
    });

    it('handles empty string — returns empty body and empty variables', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let stripped: ReturnType<typeof result.current.stripFrontmatter> | undefined;
      act(() => {
        stripped = result.current.stripFrontmatter('');
      });

      expect(result.current.variables).toEqual([]);
      expect(stripped?.body).toBe('');
    });

    it('replaces previously loaded variables when called again', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });
      expect(result.current.variables).toHaveLength(2);

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_NO_VARS);
      });
      expect(result.current.variables).toHaveLength(0);
    });
  });

  // ── injectFrontmatter ──────────────────────────────────────────────

  describe('injectFrontmatter', () => {
    it('produces valid YAML frontmatter with the current variables', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Buyer', 'text');
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('Contract body.');
      });

      expect(injected).toContain('---');
      expect(injected).toContain('variables:');
      expect(injected).toContain('Buyer');
    });

    it('preserves body content after the frontmatter block', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.addVariable('Seller', 'text');
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('# My Document\n\nSome content.');
      });

      expect(injected).toContain('# My Document');
      expect(injected).toContain('Some content.');
    });

    it('returns body only when variables is empty and no stored frontmatter', () => {
      const { result } = renderHook(() => useTemplateVariables());

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('Just the body.');
      });

      expect(injected).toBe('Just the body.');
    });

    it('preserves non-variable frontmatter fields after round-trip', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_WITH_EXTRA_FRONTMATTER);
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('Body content here.');
      });

      expect(injected).toContain('title:');
      expect(injected).toContain('My Template');
    });

    it('includes all current variables including newly added ones', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });
      act(() => {
        result.current.addVariable('New Field', 'number');
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('Body.');
      });

      expect(injected).toContain('Client Name');
      expect(injected).toContain('Signing Date');
      expect(injected).toContain('New Field');
    });
  });

  // ── Round-trip ─────────────────────────────────────────────────────

  describe('round-trip: strip → modify → inject → strip', () => {
    it('produces consistent state after a full round-trip', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });

      const originalId = getAt(result.current.variables, 0).id;

      act(() => {
        result.current.renameVariable(originalId, 'Counterparty');
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('# Agreement\n\nThis is the body.');
      });

      act(() => {
        result.current.stripFrontmatter(injected ?? '');
      });

      const reloaded = result.current.variables.find((v) => v.id === originalId);
      expect(reloaded).toBeDefined();
      expect(reloaded?.name).toBe('Counterparty');
    });

    it('deleted variable does not appear after inject → strip', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_WITH_VARS);
      });

      const deleteId = getAt(result.current.variables, 1).id;

      act(() => {
        result.current.deleteVariable(deleteId);
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('Body here.');
      });

      act(() => {
        result.current.stripFrontmatter(injected ?? '');
      });

      expect(result.current.variables).toHaveLength(1);
      expect(result.current.variables.find((v) => v.id === deleteId)).toBeUndefined();
    });

    it('added variable appears after inject → strip', () => {
      const { result } = renderHook(() => useTemplateVariables());

      act(() => {
        result.current.stripFrontmatter(MARKDOWN_NO_FRONTMATTER);
      });
      act(() => {
        result.current.addVariable('Brand New', 'currency');
      });

      let injected: string | undefined;
      act(() => {
        injected = result.current.injectFrontmatter('# New doc');
      });

      act(() => {
        result.current.stripFrontmatter(injected ?? '');
      });

      expect(result.current.variables).toHaveLength(1);
      expect(getAt(result.current.variables, 0).name).toBe('Brand New');
    });
  });
});
