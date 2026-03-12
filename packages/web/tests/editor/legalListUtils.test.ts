import { describe, it, expect } from 'vitest';
import {
  toRoman,
  fromRoman,
  indexToLabel,
  labelToIndex,
  detectListType,
  LEGAL_LIST_ITEM_REGEX,
} from '../../src/editor/legalListUtils.js';
import type { LegalListType } from '../../src/editor/legalListUtils.js';

// ---------------------------------------------------------------------------
// toRoman
// ---------------------------------------------------------------------------

describe('toRoman', () => {
  it('converts 1 to i', () => {
    expect(toRoman(1)).toBe('i');
  });

  it('converts 2 to ii', () => {
    expect(toRoman(2)).toBe('ii');
  });

  it('converts 3 to iii', () => {
    expect(toRoman(3)).toBe('iii');
  });

  it('converts 4 to iv (subtractive)', () => {
    expect(toRoman(4)).toBe('iv');
  });

  it('converts 5 to v', () => {
    expect(toRoman(5)).toBe('v');
  });

  it('converts 6 to vi', () => {
    expect(toRoman(6)).toBe('vi');
  });

  it('converts 7 to vii', () => {
    expect(toRoman(7)).toBe('vii');
  });

  it('converts 8 to viii', () => {
    expect(toRoman(8)).toBe('viii');
  });

  it('converts 9 to ix (subtractive)', () => {
    expect(toRoman(9)).toBe('ix');
  });

  it('converts 10 to x', () => {
    expect(toRoman(10)).toBe('x');
  });

  it('converts 11 to xi', () => {
    expect(toRoman(11)).toBe('xi');
  });

  it('converts 14 to xiv (subtractive)', () => {
    expect(toRoman(14)).toBe('xiv');
  });

  it('converts 19 to xix', () => {
    expect(toRoman(19)).toBe('xix');
  });

  it('converts 20 to xx', () => {
    expect(toRoman(20)).toBe('xx');
  });

  it('converts 40 to xl (subtractive)', () => {
    expect(toRoman(40)).toBe('xl');
  });

  it('converts 50 to l', () => {
    expect(toRoman(50)).toBe('l');
  });

  it('converts 90 to xc (subtractive)', () => {
    expect(toRoman(90)).toBe('xc');
  });

  it('converts 100 to c', () => {
    expect(toRoman(100)).toBe('c');
  });

  it('converts 400 to cd (subtractive)', () => {
    expect(toRoman(400)).toBe('cd');
  });

  it('converts 500 to d', () => {
    expect(toRoman(500)).toBe('d');
  });

  it('converts 900 to cm (subtractive)', () => {
    expect(toRoman(900)).toBe('cm');
  });

  it('converts 1000 to m', () => {
    expect(toRoman(1000)).toBe('m');
  });

  it('converts 1994 to mcmxciv', () => {
    expect(toRoman(1994)).toBe('mcmxciv');
  });

  it('converts 3999 to mmmcmxcix', () => {
    expect(toRoman(3999)).toBe('mmmcmxcix');
  });

  it('returns lowercase roman numerals', () => {
    const result = toRoman(8);
    expect(result).toBe(result.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// fromRoman
// ---------------------------------------------------------------------------

describe('fromRoman', () => {
  it('converts i to 1', () => {
    expect(fromRoman('i')).toBe(1);
  });

  it('converts ii to 2', () => {
    expect(fromRoman('ii')).toBe(2);
  });

  it('converts iii to 3', () => {
    expect(fromRoman('iii')).toBe(3);
  });

  it('converts iv to 4', () => {
    expect(fromRoman('iv')).toBe(4);
  });

  it('converts v to 5', () => {
    expect(fromRoman('v')).toBe(5);
  });

  it('converts ix to 9', () => {
    expect(fromRoman('ix')).toBe(9);
  });

  it('converts x to 10', () => {
    expect(fromRoman('x')).toBe(10);
  });

  it('converts xiv to 14', () => {
    expect(fromRoman('xiv')).toBe(14);
  });

  it('converts xl to 40', () => {
    expect(fromRoman('xl')).toBe(40);
  });

  it('converts xc to 90', () => {
    expect(fromRoman('xc')).toBe(90);
  });

  it('converts cd to 400', () => {
    expect(fromRoman('cd')).toBe(400);
  });

  it('converts cm to 900', () => {
    expect(fromRoman('cm')).toBe(900);
  });

  it('converts mcmxciv to 1994', () => {
    expect(fromRoman('mcmxciv')).toBe(1994);
  });

  it('handles uppercase input by treating as lowercase', () => {
    expect(fromRoman('IV')).toBe(4);
  });

  it('returns null for empty string', () => {
    expect(fromRoman('')).toBeNull();
  });

  it('returns null for purely alphabetic non-roman string "abc"', () => {
    expect(fromRoman('abc')).toBeNull();
  });

  it('returns null for string with invalid roman characters', () => {
    expect(fromRoman('xyz')).toBeNull();
  });

  it('returns null for strings with numbers', () => {
    expect(fromRoman('1')).toBeNull();
  });

  it('returns null for strings with spaces', () => {
    expect(fromRoman('i v')).toBeNull();
  });

  it('returns null for strings that cannot be decoded as valid roman numerals', () => {
    // "iiii" is not valid in standard subtractive notation — fromRoman must
    // round-trip through toRoman to validate
    expect(fromRoman('iiii')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// indexToLabel
// ---------------------------------------------------------------------------

describe('indexToLabel', () => {
  describe('lower-alpha', () => {
    it('index 0 → a', () => {
      expect(indexToLabel(0, 'lower-alpha')).toBe('a');
    });

    it('index 1 → b', () => {
      expect(indexToLabel(1, 'lower-alpha')).toBe('b');
    });

    it('index 2 → c', () => {
      expect(indexToLabel(2, 'lower-alpha')).toBe('c');
    });

    it('index 25 → z', () => {
      expect(indexToLabel(25, 'lower-alpha')).toBe('z');
    });

    it('index 8 → i (letter i, not roman)', () => {
      expect(indexToLabel(8, 'lower-alpha')).toBe('i');
    });
  });

  describe('upper-alpha', () => {
    it('index 0 → A', () => {
      expect(indexToLabel(0, 'upper-alpha')).toBe('A');
    });

    it('index 1 → B', () => {
      expect(indexToLabel(1, 'upper-alpha')).toBe('B');
    });

    it('index 25 → Z', () => {
      expect(indexToLabel(25, 'upper-alpha')).toBe('Z');
    });

    it('index 8 → I (letter I, not roman)', () => {
      expect(indexToLabel(8, 'upper-alpha')).toBe('I');
    });
  });

  describe('lower-roman', () => {
    it('index 0 → i', () => {
      expect(indexToLabel(0, 'lower-roman')).toBe('i');
    });

    it('index 1 → ii', () => {
      expect(indexToLabel(1, 'lower-roman')).toBe('ii');
    });

    it('index 2 → iii', () => {
      expect(indexToLabel(2, 'lower-roman')).toBe('iii');
    });

    it('index 3 → iv', () => {
      expect(indexToLabel(3, 'lower-roman')).toBe('iv');
    });

    it('index 4 → v', () => {
      expect(indexToLabel(4, 'lower-roman')).toBe('v');
    });

    it('index 8 → ix', () => {
      expect(indexToLabel(8, 'lower-roman')).toBe('ix');
    });

    it('index 25 → xxvi', () => {
      expect(indexToLabel(25, 'lower-roman')).toBe('xxvi');
    });
  });

  describe('upper-roman', () => {
    it('index 0 → I', () => {
      expect(indexToLabel(0, 'upper-roman')).toBe('I');
    });

    it('index 1 → II', () => {
      expect(indexToLabel(1, 'upper-roman')).toBe('II');
    });

    it('index 3 → IV', () => {
      expect(indexToLabel(3, 'upper-roman')).toBe('IV');
    });

    it('index 8 → IX', () => {
      expect(indexToLabel(8, 'upper-roman')).toBe('IX');
    });

    it('index 25 → XXVI', () => {
      expect(indexToLabel(25, 'upper-roman')).toBe('XXVI');
    });
  });
});

// ---------------------------------------------------------------------------
// labelToIndex
// ---------------------------------------------------------------------------

describe('labelToIndex', () => {
  describe('lower-alpha', () => {
    it('a → 0', () => {
      expect(labelToIndex('a', 'lower-alpha')).toBe(0);
    });

    it('b → 1', () => {
      expect(labelToIndex('b', 'lower-alpha')).toBe(1);
    });

    it('z → 25', () => {
      expect(labelToIndex('z', 'lower-alpha')).toBe(25);
    });

    it('i → 8 (letter i, not roman)', () => {
      expect(labelToIndex('i', 'lower-alpha')).toBe(8);
    });

    it('returns null for uppercase letter in lower-alpha', () => {
      expect(labelToIndex('A', 'lower-alpha')).toBeNull();
    });

    it('returns null for multi-char non-alpha label', () => {
      expect(labelToIndex('aa', 'lower-alpha')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(labelToIndex('', 'lower-alpha')).toBeNull();
    });
  });

  describe('upper-alpha', () => {
    it('A → 0', () => {
      expect(labelToIndex('A', 'upper-alpha')).toBe(0);
    });

    it('B → 1', () => {
      expect(labelToIndex('B', 'upper-alpha')).toBe(1);
    });

    it('Z → 25', () => {
      expect(labelToIndex('Z', 'upper-alpha')).toBe(25);
    });

    it('returns null for lowercase letter in upper-alpha', () => {
      expect(labelToIndex('a', 'upper-alpha')).toBeNull();
    });
  });

  describe('lower-roman', () => {
    it('i → 0', () => {
      expect(labelToIndex('i', 'lower-roman')).toBe(0);
    });

    it('ii → 1', () => {
      expect(labelToIndex('ii', 'lower-roman')).toBe(1);
    });

    it('iv → 3', () => {
      expect(labelToIndex('iv', 'lower-roman')).toBe(3);
    });

    it('ix → 8', () => {
      expect(labelToIndex('ix', 'lower-roman')).toBe(8);
    });

    it('returns null for invalid roman numeral string', () => {
      expect(labelToIndex('abc', 'lower-roman')).toBeNull();
    });

    it('returns null for uppercase roman in lower-roman context', () => {
      expect(labelToIndex('IV', 'lower-roman')).toBeNull();
    });
  });

  describe('upper-roman', () => {
    it('I → 0', () => {
      expect(labelToIndex('I', 'upper-roman')).toBe(0);
    });

    it('II → 1', () => {
      expect(labelToIndex('II', 'upper-roman')).toBe(1);
    });

    it('IV → 3', () => {
      expect(labelToIndex('IV', 'upper-roman')).toBe(3);
    });

    it('IX → 8', () => {
      expect(labelToIndex('IX', 'upper-roman')).toBe(8);
    });

    it('returns null for invalid roman numeral string', () => {
      expect(labelToIndex('ABC', 'upper-roman')).toBeNull();
    });

    it('returns null for lowercase roman in upper-roman context', () => {
      expect(labelToIndex('iv', 'upper-roman')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// detectListType
// ---------------------------------------------------------------------------

describe('detectListType', () => {
  describe('lower-alpha detection', () => {
    it('detects a single lowercase letter as lower-alpha', () => {
      expect(detectListType('a', undefined)).toBe('lower-alpha');
    });

    it('detects b as lower-alpha', () => {
      expect(detectListType('b', undefined)).toBe('lower-alpha');
    });

    it('detects a followed by b as lower-alpha', () => {
      expect(detectListType('a', 'b')).toBe('lower-alpha');
    });

    it('detects c followed by d as lower-alpha', () => {
      expect(detectListType('c', 'd')).toBe('lower-alpha');
    });
  });

  describe('upper-alpha detection', () => {
    it('detects a single uppercase letter as upper-alpha', () => {
      expect(detectListType('A', undefined)).toBe('upper-alpha');
    });

    it('detects B as upper-alpha', () => {
      expect(detectListType('B', undefined)).toBe('upper-alpha');
    });

    it('detects A followed by B as upper-alpha', () => {
      expect(detectListType('A', 'B')).toBe('upper-alpha');
    });
  });

  describe('lower-roman detection', () => {
    it('detects i followed by ii as lower-roman', () => {
      expect(detectListType('i', 'ii')).toBe('lower-roman');
    });

    it('detects iv followed by v as lower-roman', () => {
      expect(detectListType('iv', 'v')).toBe('lower-roman');
    });

    it('detects ii followed by iii as lower-roman', () => {
      expect(detectListType('ii', 'iii')).toBe('lower-roman');
    });

    it('detects ix followed by x as lower-roman', () => {
      expect(detectListType('ix', 'x')).toBe('lower-roman');
    });
  });

  describe('upper-roman detection', () => {
    it('detects I followed by II as upper-roman', () => {
      expect(detectListType('I', 'II')).toBe('upper-roman');
    });

    it('detects IV followed by V as upper-roman', () => {
      expect(detectListType('IV', 'V')).toBe('upper-roman');
    });

    it('detects II followed by III as upper-roman', () => {
      expect(detectListType('II', 'III')).toBe('upper-roman');
    });

    it('detects IX followed by X as upper-roman', () => {
      expect(detectListType('IX', 'X')).toBe('upper-roman');
    });
  });

  describe('i/I disambiguation', () => {
    it('single i. with no next item → lower-alpha (letter i)', () => {
      expect(detectListType('i', undefined)).toBe('lower-alpha');
    });

    it('single i. with next item NOT ii → lower-alpha', () => {
      expect(detectListType('i', 'j')).toBe('lower-alpha');
    });

    it('single i. with next item a → lower-alpha', () => {
      expect(detectListType('i', 'a')).toBe('lower-alpha');
    });

    it('single I. with no next item → upper-alpha (letter I)', () => {
      expect(detectListType('I', undefined)).toBe('upper-alpha');
    });

    it('single I. with next item NOT II → upper-alpha', () => {
      expect(detectListType('I', 'J')).toBe('upper-alpha');
    });

    it('i followed by ii → lower-roman', () => {
      expect(detectListType('i', 'ii')).toBe('lower-roman');
    });

    it('I followed by II → upper-roman', () => {
      expect(detectListType('I', 'II')).toBe('upper-roman');
    });
  });

  describe('multi-character lower-roman edge cases', () => {
    it('returns null for multi-char lowercase that is not a valid roman numeral', () => {
      // 'ab' passes the alpha check but fails fromRoman
      expect(detectListType('ab', undefined)).toBeNull();
    });

    it('returns lower-roman when secondLabel is defined but not all lowercase', () => {
      // 'iv' is valid roman; secondLabel 'V' is not all lowercase → still lower-roman
      expect(detectListType('iv', 'V')).toBe('lower-roman');
    });

    it('returns null for lower-roman sequence where secondLabel is not the next numeral', () => {
      // 'iv' (4) followed by 'vi' (6) — not consecutive → null
      expect(detectListType('iv', 'vi')).toBeNull();
    });

    it('returns lower-roman for valid multi-char roman with undefined secondLabel', () => {
      expect(detectListType('iv', undefined)).toBe('lower-roman');
    });
  });

  describe('multi-character upper-roman edge cases', () => {
    it('returns null for multi-char uppercase that is not a valid roman numeral', () => {
      // 'AB' passes the alpha/upper check but fails fromRoman
      expect(detectListType('AB', undefined)).toBeNull();
    });

    it('returns upper-roman when secondLabel is defined but not all uppercase', () => {
      // 'IV' is valid roman; secondLabel 'v' is not all uppercase → still upper-roman
      expect(detectListType('IV', 'v')).toBe('upper-roman');
    });

    it('returns null for upper-roman sequence where secondLabel is not the next numeral', () => {
      // 'IV' (4) followed by 'VI' (6) — not consecutive → null
      expect(detectListType('IV', 'VI')).toBeNull();
    });

    it('returns upper-roman for valid multi-char roman with undefined secondLabel', () => {
      expect(detectListType('IV', undefined)).toBe('upper-roman');
    });
  });

  describe('invalid labels', () => {
    it('returns null for numeric label', () => {
      expect(detectListType('1', undefined)).toBeNull();
    });

    it('returns null for empty string label', () => {
      expect(detectListType('', undefined)).toBeNull();
    });

    it('returns null for label with special characters', () => {
      expect(detectListType('@', undefined)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// LEGAL_LIST_ITEM_REGEX
// ---------------------------------------------------------------------------

describe('LEGAL_LIST_ITEM_REGEX', () => {
  it('matches lowercase alpha prefix "a. "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('a. Some text')).toBe(true);
  });

  it('matches uppercase alpha prefix "B. "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('B. Some text')).toBe(true);
  });

  it('matches lowercase roman "iv. "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('iv. Item text')).toBe(true);
  });

  it('matches uppercase roman "XIV. "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('XIV. Item text')).toBe(true);
  });

  it('captures the label part in group 1', () => {
    const match = LEGAL_LIST_ITEM_REGEX.exec('abc. text');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('abc');
  });

  it('does not match numeric prefix "1. "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('1. Item')).toBe(false);
  });

  it('does not match prefix without trailing space "a."', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('a.Item')).toBe(false);
  });

  it('does not match prefix with only space but no dot "a "', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('a Item')).toBe(false);
  });

  it('does not match empty string', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('')).toBe(false);
  });

  it('does not match prefix with dot but no letter "2. text"', () => {
    expect(LEGAL_LIST_ITEM_REGEX.test('2. text')).toBe(false);
  });

  it('matches at the start of the string', () => {
    // The regex anchors to start with ^
    expect(LEGAL_LIST_ITEM_REGEX.test('   a. text')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type export smoke test
// ---------------------------------------------------------------------------

describe('LegalListType type', () => {
  it('accepts valid LegalListType values', () => {
    const types: LegalListType[] = ['lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'];
    expect(types).toHaveLength(4);
  });
});
