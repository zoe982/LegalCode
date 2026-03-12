/**
 * legalListUtils.ts
 *
 * Pure utility functions for parsing, generating, and detecting legal-style
 * list labels (a. b. c. / A. B. / i. ii. iii. / I. II. III.).
 *
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegalListType = 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches a legal list prefix at the start of a line, e.g. "a. " or "XIV. " */
export const LEGAL_LIST_ITEM_REGEX = /^([a-zA-Z]+)\.\s/;

/** Standard subtractive Roman numeral table (descending order). */
const ROMAN_TABLE: readonly (readonly [number, string])[] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

// ---------------------------------------------------------------------------
// toRoman
// ---------------------------------------------------------------------------

/**
 * Convert a positive integer to a lowercase Roman numeral string.
 *
 * Examples: 1 → 'i', 4 → 'iv', 9 → 'ix', 14 → 'xiv'
 */
export function toRoman(n: number): string {
  let remaining = n;
  let result = '';

  for (const [value, numeral] of ROMAN_TABLE) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// fromRoman
// ---------------------------------------------------------------------------

/**
 * Convert a Roman numeral string (case-insensitive) to a positive integer.
 * Returns null if the string is not a valid Roman numeral in standard
 * subtractive notation.
 *
 * Validation is performed by round-tripping through toRoman.
 */
export function fromRoman(s: string): number | null {
  if (s.length === 0) return null;

  const lower = s.toLowerCase();

  // Only Roman numeral characters are allowed.
  if (!/^[ivxlcdm]+$/.test(lower)) return null;

  // Parse value using the standard subtractive algorithm.
  // Use reduce over the character array — for...of gives typed `string` items
  // with no undefined, avoiding uncovered ?? branches.
  const charValue = (ch: string): number => {
    if (ch === 'i') return 1;
    if (ch === 'v') return 5;
    if (ch === 'x') return 10;
    if (ch === 'l') return 50;
    if (ch === 'c') return 100;
    if (ch === 'd') return 500;
    return 1000; // 'm' — only remaining valid char after the regex guard
  };

  // .split('') is safe here: roman numeral chars are single-byte ASCII.
  const lowerChars = lower.split('');
  const total = lowerChars.reduce((acc, ch, idx) => {
    const current = charValue(ch);
    const nextCh = lowerChars[idx + 1];
    const next = nextCh !== undefined ? charValue(nextCh) : 0;
    return current < next ? acc - current : acc + current;
  }, 0);

  // Validate by round-tripping: ensure toRoman(total) === lower.
  if (toRoman(total) !== lower) return null;

  return total;
}

// ---------------------------------------------------------------------------
// indexToLabel
// ---------------------------------------------------------------------------

/**
 * Convert a 0-based index to a list label string for the given list type.
 *
 * - lower-alpha: 0→'a', 1→'b', …, 25→'z'
 * - upper-alpha: 0→'A', 1→'B', …, 25→'Z'
 * - lower-roman: 0→'i', 1→'ii', …  (toRoman(index + 1))
 * - upper-roman: 0→'I', 1→'II', …
 */
export function indexToLabel(index: number, listType: LegalListType): string {
  switch (listType) {
    case 'lower-alpha':
      return String.fromCharCode(97 + index); // 'a' = 97

    case 'upper-alpha':
      return String.fromCharCode(65 + index); // 'A' = 65

    case 'lower-roman':
      return toRoman(index + 1);

    case 'upper-roman':
      return toRoman(index + 1).toUpperCase();
  }
}

// ---------------------------------------------------------------------------
// labelToIndex
// ---------------------------------------------------------------------------

/**
 * Convert a label string back to a 0-based index for the given list type.
 * Returns null if the label is not valid for that list type.
 */
export function labelToIndex(label: string, listType: LegalListType): number | null {
  if (label.length === 0) return null;

  switch (listType) {
    case 'lower-alpha': {
      // Must be exactly one lowercase letter a–z.
      if (!/^[a-z]$/.test(label)) return null;
      return label.charCodeAt(0) - 97;
    }

    case 'upper-alpha': {
      // Must be exactly one uppercase letter A–Z.
      if (!/^[A-Z]$/.test(label)) return null;
      return label.charCodeAt(0) - 65;
    }

    case 'lower-roman': {
      // Must be all lowercase and parse as a valid Roman numeral.
      if (label !== label.toLowerCase()) return null;
      const n = fromRoman(label);
      if (n === null) return null;
      return n - 1;
    }

    case 'upper-roman': {
      // Must be all uppercase and parse as a valid Roman numeral.
      if (label !== label.toUpperCase()) return null;
      const n = fromRoman(label.toLowerCase());
      if (n === null) return null;
      return n - 1;
    }
  }
}

// ---------------------------------------------------------------------------
// detectListType
// ---------------------------------------------------------------------------

/**
 * Detect what kind of legal list a label (and optional following label)
 * belongs to.
 *
 * Disambiguation rules for ambiguous 'i'/'I':
 * - 'i' followed by 'ii'  → lower-roman
 * - 'i' alone or next ≠ 'ii' → lower-alpha (the letter "i")
 * - 'I' followed by 'II'  → upper-roman
 * - 'I' alone or next ≠ 'II' → upper-alpha (the letter "I")
 *
 * For multi-character labels that are valid Roman sequences, Roman is returned.
 * Returns null when the label cannot be identified.
 */
export function detectListType(
  firstLabel: string,
  secondLabel: string | undefined,
): LegalListType | null {
  if (firstLabel.length === 0) return null;

  const isLower = firstLabel === firstLabel.toLowerCase();
  const isUpper = firstLabel === firstLabel.toUpperCase();

  // Must be purely alphabetic.
  if (!/^[a-zA-Z]+$/.test(firstLabel)) return null;

  // --- Multi-character labels -------------------------------------------------
  // If it's more than one character it can only be Roman.
  if (firstLabel.length > 1) {
    if (isLower) {
      // Validate that firstLabel is a valid Roman numeral.
      if (fromRoman(firstLabel) === null) return null;
      // Optionally validate sequence with secondLabel.
      if (secondLabel !== undefined) {
        if (!/^[a-z]+$/.test(secondLabel)) return 'lower-roman';
        const a = fromRoman(firstLabel);
        const b = fromRoman(secondLabel);
        if (a !== null && b !== null && b !== a + 1) return null;
      }
      return 'lower-roman';
    }

    if (isUpper) {
      const lowerFirst = firstLabel.toLowerCase();
      if (fromRoman(lowerFirst) === null) return null;
      if (secondLabel !== undefined) {
        if (!/^[A-Z]+$/.test(secondLabel)) return 'upper-roman';
        const a = fromRoman(lowerFirst);
        const b = fromRoman(secondLabel.toLowerCase());
        if (a !== null && b !== null && b !== a + 1) return null;
      }
      return 'upper-roman';
    }
  }

  // --- Single-character labels ------------------------------------------------
  // firstLabel is exactly one letter.

  if (isLower) {
    // Special-case 'i': ambiguous between lower-roman and lower-alpha.
    if (firstLabel === 'i') {
      if (secondLabel === 'ii') return 'lower-roman';
      return 'lower-alpha';
    }

    // For any other single lowercase letter: lower-alpha.
    return 'lower-alpha';
  }

  // isUpper must be true here: the label passed the /^[a-zA-Z]+$/ guard and
  // is length 1, so it is either lower or upper — exhaustive.
  // Special-case 'I': ambiguous between upper-roman and upper-alpha.
  if (firstLabel === 'I') {
    if (secondLabel === 'II') return 'upper-roman';
    return 'upper-alpha';
  }

  // For any other single uppercase letter: upper-alpha.
  return 'upper-alpha';
}
