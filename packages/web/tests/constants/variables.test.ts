import { describe, it, expect } from 'vitest';
import {
  TYPE_ICONS,
  TYPE_LABELS,
  VARIABLE_COLORS,
  ALL_VARIABLE_TYPES,
} from '../../src/constants/variables.js';
import type { VariableType } from '@legalcode/shared';

const ALL_TYPES: VariableType[] = [
  'text',
  'date',
  'address',
  'currency',
  'signature',
  'number',
  'custom',
];

// ---------------------------------------------------------------------------
// TYPE_ICONS
// ---------------------------------------------------------------------------

describe('TYPE_ICONS', () => {
  it('is defined', () => {
    expect(TYPE_ICONS).toBeDefined();
  });

  it('has all 7 variable types', () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_ICONS).toHaveProperty(type);
    }
  });

  it('text maps to T', () => {
    expect(TYPE_ICONS.text).toBe('T');
  });

  it('date maps to D', () => {
    expect(TYPE_ICONS.date).toBe('D');
  });

  it('address maps to @', () => {
    expect(TYPE_ICONS.address).toBe('@');
  });

  it('currency maps to $', () => {
    expect(TYPE_ICONS.currency).toBe('$');
  });

  it('signature maps to S', () => {
    expect(TYPE_ICONS.signature).toBe('S');
  });

  it('number maps to #', () => {
    expect(TYPE_ICONS.number).toBe('#');
  });

  it('custom maps to *', () => {
    expect(TYPE_ICONS.custom).toBe('*');
  });

  it('has exactly 7 entries', () => {
    expect(Object.keys(TYPE_ICONS)).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// TYPE_LABELS
// ---------------------------------------------------------------------------

describe('TYPE_LABELS', () => {
  it('is defined', () => {
    expect(TYPE_LABELS).toBeDefined();
  });

  it('has all 7 variable types', () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_LABELS).toHaveProperty(type);
    }
  });

  it('text maps to Text', () => {
    expect(TYPE_LABELS.text).toBe('Text');
  });

  it('date maps to Date', () => {
    expect(TYPE_LABELS.date).toBe('Date');
  });

  it('address maps to Address', () => {
    expect(TYPE_LABELS.address).toBe('Address');
  });

  it('currency maps to Currency', () => {
    expect(TYPE_LABELS.currency).toBe('Currency');
  });

  it('signature maps to Signature', () => {
    expect(TYPE_LABELS.signature).toBe('Signature');
  });

  it('number maps to Number', () => {
    expect(TYPE_LABELS.number).toBe('Number');
  });

  it('custom maps to Custom', () => {
    expect(TYPE_LABELS.custom).toBe('Custom');
  });

  it('has exactly 7 entries', () => {
    expect(Object.keys(TYPE_LABELS)).toHaveLength(7);
  });

  it('all labels are non-empty strings', () => {
    for (const type of ALL_TYPES) {
      expect(typeof TYPE_LABELS[type]).toBe('string');
      expect(TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// VARIABLE_COLORS
// ---------------------------------------------------------------------------

describe('VARIABLE_COLORS', () => {
  it('is defined', () => {
    expect(VARIABLE_COLORS).toBeDefined();
  });

  it('has all 7 variable types', () => {
    for (const type of ALL_TYPES) {
      expect(VARIABLE_COLORS).toHaveProperty(type);
    }
  });

  it('each entry has a color property', () => {
    for (const type of ALL_TYPES) {
      expect(VARIABLE_COLORS[type]).toHaveProperty('color');
    }
  });

  it('each entry has a bg property', () => {
    for (const type of ALL_TYPES) {
      expect(VARIABLE_COLORS[type]).toHaveProperty('bg');
    }
  });

  it('all color values are non-empty strings', () => {
    for (const type of ALL_TYPES) {
      expect(typeof VARIABLE_COLORS[type].color).toBe('string');
      expect(VARIABLE_COLORS[type].color.length).toBeGreaterThan(0);
    }
  });

  it('all bg values are non-empty strings', () => {
    for (const type of ALL_TYPES) {
      expect(typeof VARIABLE_COLORS[type].bg).toBe('string');
      expect(VARIABLE_COLORS[type].bg.length).toBeGreaterThan(0);
    }
  });

  it('text has color #8027FF', () => {
    expect(VARIABLE_COLORS.text.color).toBe('#8027FF');
  });

  it('text has bg #8027FF14', () => {
    expect(VARIABLE_COLORS.text.bg).toBe('#8027FF14');
  });

  it('date has color #2563EB', () => {
    expect(VARIABLE_COLORS.date.color).toBe('#2563EB');
  });

  it('date has bg #2563EB14', () => {
    expect(VARIABLE_COLORS.date.bg).toBe('#2563EB14');
  });

  it('address has color #D97706', () => {
    expect(VARIABLE_COLORS.address.color).toBe('#D97706');
  });

  it('address has bg #D9770614', () => {
    expect(VARIABLE_COLORS.address.bg).toBe('#D9770614');
  });

  it('currency has color #059669', () => {
    expect(VARIABLE_COLORS.currency.color).toBe('#059669');
  });

  it('currency has bg #05966914', () => {
    expect(VARIABLE_COLORS.currency.bg).toBe('#05966914');
  });

  it('signature has color #DB2777', () => {
    expect(VARIABLE_COLORS.signature.color).toBe('#DB2777');
  });

  it('signature has bg #DB277714', () => {
    expect(VARIABLE_COLORS.signature.bg).toBe('#DB277714');
  });

  it('number has color #0D9488', () => {
    expect(VARIABLE_COLORS.number.color).toBe('#0D9488');
  });

  it('number has bg #0D948814', () => {
    expect(VARIABLE_COLORS.number.bg).toBe('#0D948814');
  });

  it('custom has color #6B6D82', () => {
    expect(VARIABLE_COLORS.custom.color).toBe('#6B6D82');
  });

  it('custom has bg #6B6D8214', () => {
    expect(VARIABLE_COLORS.custom.bg).toBe('#6B6D8214');
  });

  it('has exactly 7 entries', () => {
    expect(Object.keys(VARIABLE_COLORS)).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// ALL_VARIABLE_TYPES
// ---------------------------------------------------------------------------

describe('ALL_VARIABLE_TYPES', () => {
  it('is defined', () => {
    expect(ALL_VARIABLE_TYPES).toBeDefined();
  });

  it('contains all 7 types', () => {
    expect(ALL_VARIABLE_TYPES).toHaveLength(7);
    for (const type of ALL_TYPES) {
      expect(ALL_VARIABLE_TYPES).toContain(type);
    }
  });
});
