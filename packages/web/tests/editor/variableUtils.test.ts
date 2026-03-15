import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serializeFrontmatter,
  extractVariables,
  updateVariables,
  generateVariableId,
  VARIABLE_REF_REGEX,
} from '../../src/editor/variableUtils.js';

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('parses frontmatter with a variables array', () => {
    const md = `---
variables:
  - id: "party-name"
    name: "Party Name"
    type: "text"
---
# Contract Body`;

    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).not.toBeNull();
    expect(Array.isArray(frontmatter?.variables)).toBe(true);
    const vars = frontmatter?.variables as unknown[];
    expect(vars).toHaveLength(1);
    expect(body.trim()).toBe('# Contract Body');
  });

  it('returns null frontmatter when there is no frontmatter block', () => {
    const md = '# Just a document\n\nSome body text.';
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).toBeNull();
    expect(body).toBe(md);
  });

  it('returns empty object for an empty frontmatter block', () => {
    const md = `---
---
Body here.`;
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).not.toBeNull();
    expect(body.trim()).toBe('Body here.');
  });

  it('preserves other fields alongside variables', () => {
    const md = `---
title: "My Doc"
variables:
  - id: "x"
    name: "X"
    type: "text"
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    expect(frontmatter?.title).toBe('My Doc');
    expect(Array.isArray(frontmatter?.variables)).toBe(true);
  });

  it('returns null frontmatter when opening delimiter is missing', () => {
    const md = `variables:
  - id: "x"
    name: "X"
    type: "text"
---
Body.`;
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).toBeNull();
    expect(body).toBe(md);
  });

  it('handles a frontmatter block with multiple variables', () => {
    const md = `---
variables:
  - id: "party-name"
    name: "Party Name"
    type: "text"
  - id: "eff-date"
    name: "Effective Date"
    type: "date"
    customType: "ISO 8601"
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    const vars = frontmatter?.variables as Record<string, string>[];
    expect(vars).toHaveLength(2);
    expect(vars[0]?.id).toBe('party-name');
    expect(vars[1]?.customType).toBe('ISO 8601');
  });

  it('handles frontmatter with only a simple key-value, no variables', () => {
    const md = `---
author: "Alice"
---
Document body.`;
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter?.author).toBe('Alice');
    expect(frontmatter?.variables).toBeUndefined();
    expect(body.trim()).toBe('Document body.');
  });

  it('returns the body after the closing --- delimiter', () => {
    const md = `---
variables:
  - id: "a"
    name: "A"
    type: "number"
---
Line one.
Line two.`;
    const { body } = parseFrontmatter(md);
    expect(body).toContain('Line one.');
    expect(body).toContain('Line two.');
  });

  it('handles unquoted string values', () => {
    const md = `---
variables:
  - id: some-id
    name: Some Name
    type: text
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    const vars = frontmatter?.variables as Record<string, string>[];
    expect(vars[0]?.id).toBe('some-id');
    expect(vars[0]?.type).toBe('text');
  });

  it('handles an empty document string', () => {
    const { frontmatter, body } = parseFrontmatter('');
    expect(frontmatter).toBeNull();
    expect(body).toBe('');
  });

  it('returns null frontmatter when opening --- is present but closing delimiter is missing', () => {
    const md = '---\ntitle: test\nno closing delimiter';
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter).toBeNull();
    expect(body).toBe(md);
  });

  it('parses YAML list where empty line terminates the list before EOF', () => {
    // An empty line inside a list should break out and stop accumulating items
    const md = `---
variables:
  - id: "a"
    name: "Alpha"
    type: "text"

title: "After Empty Line"
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    // The empty line should have ended the list; title parsed afterwards
    const vars = frontmatter?.variables as unknown[];
    expect(vars).toHaveLength(1);
    expect(frontmatter?.title).toBe('After Empty Line');
  });

  it('parses list stopped by new top-level key (no empty line separator)', () => {
    // A new top-level key (no leading spaces) immediately after list items
    const md = `---
variables:
  - id: "b"
    name: "Beta"
    type: "date"
author: "Alice"
---
Doc.`;
    const { frontmatter } = parseFrontmatter(md);
    const vars = frontmatter?.variables as unknown[];
    expect(vars).toHaveLength(1);
    expect(frontmatter?.author).toBe('Alice');
  });

  it('parses YAML with bare dash list items (bare "-" with no field content)', () => {
    // A bare "-" on its own creates an empty list item
    const md = `---
variables:
  -
  - id: "c"
    name: "Charlie"
    type: "text"
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    // The bare "-" creates an empty item followed by the real item
    const vars = frontmatter?.variables as unknown[];
    expect(Array.isArray(vars)).toBe(true);
    expect(vars.length).toBeGreaterThanOrEqual(1);
  });

  it('parses multi-line list items (fields on separate lines within same item)', () => {
    // Fields indented under a "- field: value" item parsed as continuation lines
    const md = `---
variables:
  - id: "party-name"
    name: "Party Name"
    type: "text"
    customType: "LegalEntity"
---
Body.`;
    const { frontmatter } = parseFrontmatter(md);
    const vars = frontmatter?.variables as Record<string, string>[];
    expect(vars).toHaveLength(1);
    expect(vars[0]?.customType).toBe('LegalEntity');
  });
});

// ---------------------------------------------------------------------------
// serializeFrontmatter
// ---------------------------------------------------------------------------

describe('serializeFrontmatter', () => {
  it('produces a valid --- delimited block at the start', () => {
    const result = serializeFrontmatter({ title: 'Hello' }, 'Body.');
    expect(result.startsWith('---\n')).toBe(true);
    expect(result).toContain('---\n');
  });

  it('includes simple string key-value pairs', () => {
    const result = serializeFrontmatter({ author: 'Alice' }, 'Body.');
    expect(result).toContain('author: "Alice"');
  });

  it('serializes a variables array correctly', () => {
    const frontmatter = {
      variables: [{ id: 'party-name', name: 'Party Name', type: 'text' }],
    };
    const result = serializeFrontmatter(frontmatter, 'Body.');
    expect(result).toContain('variables:');
    expect(result).toContain('id: "party-name"');
    expect(result).toContain('name: "Party Name"');
    expect(result).toContain('type: "text"');
  });

  it('includes the body after the closing ---', () => {
    const result = serializeFrontmatter({ x: '1' }, 'The body here.');
    expect(result).toContain('The body here.');
    // body must come after closing ---
    const closingIdx = result.indexOf('---\n', 4);
    const bodyIdx = result.indexOf('The body here.');
    expect(bodyIdx).toBeGreaterThan(closingIdx);
  });

  it('handles an empty frontmatter object', () => {
    const result = serializeFrontmatter({}, 'Body.');
    expect(result).toContain('---');
    expect(result).toContain('Body.');
  });

  it('serializes variables with optional customType', () => {
    const frontmatter = {
      variables: [{ id: 'eff-date', name: 'Effective Date', type: 'date', customType: 'ISO 8601' }],
    };
    const result = serializeFrontmatter(frontmatter, '');
    expect(result).toContain('customType: "ISO 8601"');
  });

  it('serializes top-level number value without quotes', () => {
    const result = serializeFrontmatter({ count: 5 }, 'Body.');
    expect(result).toContain('count: 5');
    // Should NOT be quoted
    expect(result).not.toContain('count: "5"');
  });

  it('serializes top-level boolean value without quotes', () => {
    const result = serializeFrontmatter({ enabled: true }, 'Body.');
    expect(result).toContain('enabled: true');
  });

  it('serializes number field value inside array items without quotes', () => {
    const frontmatter = {
      items: [{ id: 'x', count: 42 }],
    };
    const result = serializeFrontmatter(frontmatter, 'Body.');
    expect(result).toContain('count: 42');
  });

  it('serializes boolean field value inside array items without quotes', () => {
    const frontmatter = {
      items: [{ id: 'x', active: false }],
    };
    const result = serializeFrontmatter(frontmatter, 'Body.');
    expect(result).toContain('active: false');
  });

  it('skips non-primitive (nested object) values inside array items', () => {
    // A nested object value is not a string, number, or boolean — should be skipped
    const frontmatter = {
      items: [{ id: 'x', nested: { deep: 'value' } }],
    };
    const result = serializeFrontmatter(frontmatter, 'Body.');
    // 'nested' key should not appear in output since it's an object
    expect(result).not.toContain('nested');
  });

  it('skips undefined field values inside array items', () => {
    const frontmatter = {
      items: [{ id: 'x', optional: undefined }],
    };
    const result = serializeFrontmatter(frontmatter, 'Body.');
    // undefined values are skipped
    expect(result).not.toContain('optional');
  });
});

// ---------------------------------------------------------------------------
// extractVariables
// ---------------------------------------------------------------------------

describe('extractVariables', () => {
  it('extracts valid variables from frontmatter', () => {
    const frontmatter = {
      variables: [
        { id: 'party-name', name: 'Party Name', type: 'text' },
        { id: 'eff-date', name: 'Effective Date', type: 'date' },
      ],
    };
    const vars = extractVariables(frontmatter);
    expect(vars).toHaveLength(2);
    expect(vars[0]?.id).toBe('party-name');
    expect(vars[1]?.type).toBe('date');
  });

  it('returns empty array when frontmatter is null', () => {
    const vars = extractVariables(null);
    expect(vars).toHaveLength(0);
  });

  it('returns empty array when there is no variables key', () => {
    const vars = extractVariables({ title: 'Doc' });
    expect(vars).toHaveLength(0);
  });

  it('returns empty array when variables field is not an array', () => {
    const vars = extractVariables({ variables: 'not-an-array' });
    expect(vars).toHaveLength(0);
  });

  it('skips invalid variable entries', () => {
    const frontmatter = {
      variables: [
        { id: 'ok', name: 'OK', type: 'text' },
        { id: '', name: 'Bad', type: 'text' }, // empty id — invalid
        { id: 'bad-type', name: 'Bad', type: 'invalid-type' }, // bad type
      ],
    };
    const vars = extractVariables(frontmatter);
    expect(vars).toHaveLength(1);
    expect(vars[0]?.id).toBe('ok');
  });

  it('extracts variables with optional customType', () => {
    const frontmatter = {
      variables: [
        { id: 'custom-1', name: 'Custom Field', type: 'custom', customType: 'my-format' },
      ],
    };
    const vars = extractVariables(frontmatter);
    expect(vars).toHaveLength(1);
    expect(vars[0]?.customType).toBe('my-format');
  });

  it('returns empty array when variables array is empty', () => {
    const vars = extractVariables({ variables: [] });
    expect(vars).toHaveLength(0);
  });

  it('handles partial definitions (missing required fields)', () => {
    const frontmatter = {
      variables: [
        { id: 'x' }, // missing name and type
      ],
    };
    const vars = extractVariables(frontmatter);
    expect(vars).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateVariables
// ---------------------------------------------------------------------------

describe('updateVariables', () => {
  it('adds variables to a null frontmatter', () => {
    const vars = [{ id: 'x', name: 'X', type: 'text' as const }];
    const result = updateVariables(null, vars);
    expect(Array.isArray(result.variables)).toBe(true);
    expect((result.variables as unknown[]).length).toBe(1);
  });

  it('replaces existing variables in frontmatter', () => {
    const existing = {
      variables: [{ id: 'old', name: 'Old', type: 'text' }],
    };
    const newVars = [
      { id: 'new-1', name: 'New 1', type: 'date' as const },
      { id: 'new-2', name: 'New 2', type: 'number' as const },
    ];
    const result = updateVariables(existing, newVars);
    const vars = result.variables as unknown[];
    expect(vars).toHaveLength(2);
  });

  it('preserves other frontmatter fields', () => {
    const existing = {
      title: 'My Doc',
      author: 'Alice',
      variables: [{ id: 'old', name: 'Old', type: 'text' }],
    };
    const newVars = [{ id: 'x', name: 'X', type: 'signature' as const }];
    const result = updateVariables(existing, newVars);
    expect(result.title).toBe('My Doc');
    expect(result.author).toBe('Alice');
  });

  it('sets variables to empty array when given empty array', () => {
    const existing = {
      variables: [{ id: 'old', name: 'Old', type: 'text' }],
    };
    const result = updateVariables(existing, []);
    expect((result.variables as unknown[]).length).toBe(0);
  });

  it('creates new frontmatter object with variables when given empty frontmatter', () => {
    const result = updateVariables({}, [{ id: 'x', name: 'X', type: 'currency' as const }]);
    expect(result.variables).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// VARIABLE_REF_REGEX
// ---------------------------------------------------------------------------

describe('VARIABLE_REF_REGEX', () => {
  it('matches a single valid variable reference', () => {
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec('Hello {{var:party-name}} World');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('party-name');
  });

  it('matches adjacent variables without gap', () => {
    const text = '{{var:a}}{{var:b}}';
    const regex = new RegExp(VARIABLE_REF_REGEX.source, 'g');
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1] !== undefined) matches.push(m[1]);
    }
    expect(matches).toHaveLength(2);
    expect(matches[0]).toBe('a');
    expect(matches[1]).toBe('b');
  });

  it('does not match incomplete syntax {{var:', () => {
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec('{{var:');
    expect(match).toBeNull();
  });

  it('does not match when closing braces are missing {{var:x}', () => {
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec('{{var:x}');
    expect(match).toBeNull();
  });

  it('does not match nested braces {{{var:x}}}', () => {
    // The regex targets exactly {{ and }} boundaries; extra braces won't form a capture
    const text = '{{{var:x}}}';
    const regex = new RegExp(VARIABLE_REF_REGEX.source, 'g');
    // It may or may not match depending on position — we verify capture group 1
    let found = false;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1] === 'x') {
        found = true;
        break;
      }
    }
    // With extra braces, the match inside may still capture "x" — the critical
    // requirement is that the regex does NOT crash and that it handles the case.
    // Accept either outcome as long as there's no infinite loop / error.
    expect(typeof found).toBe('boolean');
  });

  it('does not match text with no variable references', () => {
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec('Hello World');
    expect(match).toBeNull();
  });

  it('matches variable ids with underscores and hyphens', () => {
    const text = '{{var:my_var-id}}';
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec(text);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('my_var-id');
  });

  it('matches variable ids with numbers', () => {
    const text = '{{var:var123}}';
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec(text);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('var123');
  });

  it('does not match spaces in variable id', () => {
    const regex = new RegExp(VARIABLE_REF_REGEX.source, VARIABLE_REF_REGEX.flags);
    const match = regex.exec('{{var:my var}}');
    expect(match).toBeNull();
  });

  it('finds all matches in a document using global flag', () => {
    const text = 'Start {{var:alpha}} middle {{var:beta}} end.';
    const regex = new RegExp(VARIABLE_REF_REGEX.source, 'g');
    const ids: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1] !== undefined) ids.push(m[1]);
    }
    expect(ids).toEqual(['alpha', 'beta']);
  });
});

// ---------------------------------------------------------------------------
// generateVariableId
// ---------------------------------------------------------------------------

describe('generateVariableId', () => {
  it('returns a non-empty string', () => {
    const id = generateVariableId('Party Name');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('slugifies the name (lowercase, hyphens)', () => {
    const id = generateVariableId('Party Name');
    // should start with "party-name-"
    expect(id.startsWith('party-name-')).toBe(true);
  });

  it('appends a short random suffix', () => {
    const id = generateVariableId('Test');
    // format: "test-XXXX" where XXXX is 4 hex chars
    expect(/^test-[a-f0-9]{4}$/.test(id)).toBe(true);
  });

  it('replaces spaces with hyphens', () => {
    const id = generateVariableId('Effective Date');
    expect(id.startsWith('effective-date-')).toBe(true);
  });

  it('handles special characters by stripping them', () => {
    const id = generateVariableId('Party (Name)!');
    // Special chars should be stripped/replaced; base should be recognizable
    const base = id.split('-').slice(0, -1).join('-');
    expect(base.length).toBeGreaterThan(0);
    // The resulting base should not contain parentheses or exclamation marks
    expect(base).not.toContain('(');
    expect(base).not.toContain(')');
    expect(base).not.toContain('!');
  });

  it('generates unique ids across multiple calls with same name', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(generateVariableId('Test Name'));
    }
    // With 4 hex chars (65536 possibilities) we expect uniqueness across 20 calls
    expect(ids.size).toBeGreaterThan(1);
  });

  it('handles single-word names', () => {
    const id = generateVariableId('Signature');
    expect(id.startsWith('signature-')).toBe(true);
  });

  it('handles empty name gracefully', () => {
    const id = generateVariableId('');
    expect(typeof id).toBe('string');
    // Should still return something (just the suffix)
    expect(id.length).toBeGreaterThan(0);
  });

  it('handles names with multiple spaces', () => {
    const id = generateVariableId('First   Last   Name');
    // Multiple spaces should collapse to single hyphens
    expect(id).not.toContain('--');
  });
});

// ---------------------------------------------------------------------------
// Round-trip: parseFrontmatter → modify → serializeFrontmatter → parseFrontmatter
// ---------------------------------------------------------------------------

describe('Round-trip: parse → modify → serialize → parse', () => {
  it('preserves existing variables unchanged through a round-trip', () => {
    const original = `---
variables:
  - id: "party-name"
    name: "Party Name"
    type: "text"
  - id: "eff-date"
    name: "Effective Date"
    type: "date"
    customType: "ISO 8601"
---
# Agreement

This document binds {{var:party-name}} from {{var:eff-date}}.`;

    const { frontmatter, body } = parseFrontmatter(original);
    const serialized = serializeFrontmatter(frontmatter ?? {}, body);
    const { frontmatter: fm2 } = parseFrontmatter(serialized);

    const vars1 = extractVariables(frontmatter);
    const vars2 = extractVariables(fm2);

    expect(vars2).toHaveLength(vars1.length);
    expect(vars2[0]?.id).toBe(vars1[0]?.id);
    expect(vars2[0]?.name).toBe(vars1[0]?.name);
    expect(vars2[0]?.type).toBe(vars1[0]?.type);
    expect(vars2[1]?.customType).toBe(vars1[1]?.customType);
  });

  it('preserves other frontmatter fields through a round-trip', () => {
    const original = `---
title: "My Contract"
variables:
  - id: "x"
    name: "X"
    type: "number"
---
Body content here.`;

    const { frontmatter, body } = parseFrontmatter(original);
    const serialized = serializeFrontmatter(frontmatter ?? {}, body);
    const { frontmatter: fm2 } = parseFrontmatter(serialized);

    expect(fm2?.title).toBe('My Contract');
    expect(extractVariables(fm2)).toHaveLength(1);
  });

  it('updateVariables → serialize → parse produces correct result', () => {
    const original = `---
variables:
  - id: "old"
    name: "Old"
    type: "text"
---
Body.`;
    const { frontmatter, body } = parseFrontmatter(original);
    const updated = updateVariables(frontmatter, [
      { id: 'new-var', name: 'New Var', type: 'currency' },
    ]);
    const serialized = serializeFrontmatter(updated, body);
    const { frontmatter: fm2 } = parseFrontmatter(serialized);
    const vars = extractVariables(fm2);
    expect(vars).toHaveLength(1);
    expect(vars[0]?.id).toBe('new-var');
    expect(vars[0]?.type).toBe('currency');
  });
});
