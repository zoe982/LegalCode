import { describe, it, expect } from 'vitest';
import { getSuggestionColor } from '../../src/utils/suggestionColors.js';

describe('getSuggestionColor', () => {
  it('returns fallback color for empty string email', () => {
    expect(getSuggestionColor('')).toBe('#6B6D82');
  });

  it('returns fallback color for undefined email', () => {
    expect(getSuggestionColor(undefined)).toBe('#6B6D82');
  });

  it('returns fallback color for null email', () => {
    expect(getSuggestionColor(null)).toBe('#6B6D82');
  });

  it('returns a color from the palette (starts with # and length 7)', () => {
    const color = getSuggestionColor('user@example.com');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('same email always returns the same color (deterministic)', () => {
    const email = 'alice@acme.com';
    const color1 = getSuggestionColor(email);
    const color2 = getSuggestionColor(email);
    expect(color1).toBe(color2);
  });

  it('different emails can return different colors', () => {
    // Test at least 3 emails to ensure variation
    const colors = new Set([
      getSuggestionColor('a@example.com'),
      getSuggestionColor('b@example.com'),
      getSuggestionColor('c@example.com'),
      getSuggestionColor('zebra@example.com'),
      getSuggestionColor('alpha@test.org'),
    ]);
    // At least 2 distinct colors among 5 different emails
    expect(colors.size).toBeGreaterThan(1);
  });

  it('returns valid hex color for known email', () => {
    const validColors = [
      '#E63946',
      '#457B9D',
      '#2A9D8F',
      '#E9C46A',
      '#6A4C93',
      '#D4A574',
      '#4A90D9',
      '#7CB342',
    ];
    const color = getSuggestionColor('someone@example.com');
    // The color should be either from the palette or the fallback
    expect([...validColors, '#6B6D82']).toContain(color);
  });

  it('caching: returns same result for repeated calls with same email', () => {
    const email = 'repeated@example.com';
    const first = getSuggestionColor(email);
    const second = getSuggestionColor(email);
    const third = getSuggestionColor(email);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('handles emails with special characters', () => {
    const color = getSuggestionColor('user+tag@sub.domain.com');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('returns consistent color across multiple unique emails', () => {
    const emails = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
    for (const email of emails) {
      const c1 = getSuggestionColor(email);
      const c2 = getSuggestionColor(email);
      expect(c1).toBe(c2);
    }
  });
});
