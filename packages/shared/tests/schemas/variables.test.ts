import { describe, it, expect } from 'vitest';
import {
  variableTypeSchema,
  variableDefinitionSchema,
  variablesArraySchema,
} from '../../src/schemas/variables.js';

describe('variableTypeSchema', () => {
  it('accepts all valid types', () => {
    const validTypes = ['text', 'date', 'signature', 'address', 'number', 'currency', 'custom'];
    for (const type of validTypes) {
      const result = variableTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = variableTypeSchema.safeParse('email');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = variableTypeSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = variableTypeSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects undefined', () => {
    const result = variableTypeSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it('rejects numeric value', () => {
    const result = variableTypeSchema.safeParse(1);
    expect(result.success).toBe(false);
  });
});

describe('variableDefinitionSchema', () => {
  it('validates a minimal valid text variable', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'party-name',
      name: 'Party Name',
      type: 'text',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('party-name');
      expect(result.data.name).toBe('Party Name');
      expect(result.data.type).toBe('text');
      expect(result.data.customType).toBeUndefined();
    }
  });

  it('validates a variable with customType', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'eff-date',
      name: 'Effective Date',
      type: 'custom',
      customType: 'ISO 8601',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customType).toBe('ISO 8601');
    }
  });

  it('allows customType to be undefined (not present)', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'sig-1',
      name: 'Signature',
      type: 'signature',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customType).toBeUndefined();
    }
  });

  it('rejects missing id', () => {
    const result = variableDefinitionSchema.safeParse({
      name: 'Party Name',
      type: 'text',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'party-name',
      type: 'text',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'party-name',
      name: 'Party Name',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type value', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'party-name',
      name: 'Party Name',
      type: 'email',
    });
    expect(result.success).toBe(false);
  });

  it('validates all seven types', () => {
    const types = ['text', 'date', 'signature', 'address', 'number', 'currency', 'custom'] as const;
    for (const type of types) {
      const result = variableDefinitionSchema.safeParse({
        id: `var-${type}`,
        name: `Var ${type}`,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty string id', () => {
    const result = variableDefinitionSchema.safeParse({
      id: '',
      name: 'Party Name',
      type: 'text',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string name', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'party-name',
      name: '',
      type: 'text',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a very long name string (up to reasonable limit)', () => {
    const longName = 'A'.repeat(200);
    const result = variableDefinitionSchema.safeParse({
      id: 'long-var',
      name: longName,
      type: 'text',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-string id', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 42,
      name: 'Party Name',
      type: 'text',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string customType', () => {
    const result = variableDefinitionSchema.safeParse({
      id: 'var-1',
      name: 'Var 1',
      type: 'custom',
      customType: 123,
    });
    expect(result.success).toBe(false);
  });
});

describe('variablesArraySchema', () => {
  it('validates an empty array', () => {
    const result = variablesArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('validates an array with one variable', () => {
    const result = variablesArraySchema.safeParse([
      { id: 'party-name', name: 'Party Name', type: 'text' },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('validates an array with multiple variables', () => {
    const result = variablesArraySchema.safeParse([
      { id: 'party-name', name: 'Party Name', type: 'text' },
      { id: 'eff-date', name: 'Effective Date', type: 'date' },
      { id: 'sig-1', name: 'Signature', type: 'signature', customType: 'wet-ink' },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });

  it('rejects an array containing an invalid variable', () => {
    const result = variablesArraySchema.safeParse([
      { id: 'party-name', name: 'Party Name', type: 'text' },
      { id: 'bad', name: 'Bad', type: 'not-a-type' },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects non-array input', () => {
    const result = variablesArraySchema.safeParse({ id: 'x', name: 'X', type: 'text' });
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = variablesArraySchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
