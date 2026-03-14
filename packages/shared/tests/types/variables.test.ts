import { describe, it, expect } from 'vitest';
import type { VariableType, VariableDefinition } from '../../src/types/variables.js';

describe('VariableType', () => {
  it('includes all seven valid variable types', () => {
    const types: VariableType[] = [
      'text',
      'date',
      'signature',
      'address',
      'number',
      'currency',
      'custom',
    ];
    expect(types).toHaveLength(7);
  });

  it('accepts text as a VariableType', () => {
    const t: VariableType = 'text';
    expect(t).toBe('text');
  });

  it('accepts date as a VariableType', () => {
    const t: VariableType = 'date';
    expect(t).toBe('date');
  });

  it('accepts signature as a VariableType', () => {
    const t: VariableType = 'signature';
    expect(t).toBe('signature');
  });

  it('accepts address as a VariableType', () => {
    const t: VariableType = 'address';
    expect(t).toBe('address');
  });

  it('accepts number as a VariableType', () => {
    const t: VariableType = 'number';
    expect(t).toBe('number');
  });

  it('accepts currency as a VariableType', () => {
    const t: VariableType = 'currency';
    expect(t).toBe('currency');
  });

  it('accepts custom as a VariableType', () => {
    const t: VariableType = 'custom';
    expect(t).toBe('custom');
  });
});

describe('VariableDefinition', () => {
  it('accepts a minimal valid definition without customType', () => {
    const def: VariableDefinition = {
      id: 'party-name',
      name: 'Party Name',
      type: 'text',
    };
    expect(def.id).toBe('party-name');
    expect(def.name).toBe('Party Name');
    expect(def.type).toBe('text');
    expect(def.customType).toBeUndefined();
  });

  it('accepts a definition with an optional customType', () => {
    const def: VariableDefinition = {
      id: 'eff-date',
      name: 'Effective Date',
      type: 'custom',
      customType: 'ISO 8601',
    };
    expect(def.customType).toBe('ISO 8601');
  });

  it('accepts all seven variable types in a definition', () => {
    const types: VariableType[] = [
      'text',
      'date',
      'signature',
      'address',
      'number',
      'currency',
      'custom',
    ];
    for (const type of types) {
      const def: VariableDefinition = { id: `var-${type}`, name: `Var ${type}`, type };
      expect(def.type).toBe(type);
    }
  });

  it('can be used in an array', () => {
    const defs: VariableDefinition[] = [
      { id: 'a', name: 'A', type: 'text' },
      { id: 'b', name: 'B', type: 'date' },
    ];
    expect(defs).toHaveLength(2);
  });
});
