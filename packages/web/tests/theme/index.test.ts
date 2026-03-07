import { describe, it, expect } from 'vitest';
import { theme, serifStack, sansStack, monoStack, dmSansStack } from '../../src/theme/index.js';

/* Extract light palette from colorSchemes. We cast through unknown
   because MUI v7's colorSchemes type is not fully resolved by the
   strict TS/ESLint combo. */
interface LightScheme {
  palette: {
    primary: { main: string };
    secondary: { main: string };
    error: { main: string };
    warning: { main: string };
    success: { main: string };
    background: { default: string; paper: string };
    text: { primary: string; secondary: string };
  };
}

function getLightPalette(): LightScheme {
  return (theme as unknown as { colorSchemes: { light: LightScheme } }).colorSchemes.light;
}

describe('theme', () => {
  it('uses DM Sans as default font family', () => {
    expect(theme.typography.fontFamily).toContain('DM Sans');
  });

  it('uses Source Serif 4 for h1-h6', () => {
    expect(theme.typography.h1.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h2.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h3.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h4.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h5.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h6.fontFamily).toContain('Source Serif 4');
  });

  it('maps primary color to brand light purple', () => {
    const lp = getLightPalette();
    expect(lp.palette.primary.main).toBe('#8027FF');
  });

  it('maps error color to #DC2626', () => {
    const lp = getLightPalette();
    expect(lp.palette.error.main).toBe('#DC2626');
  });

  it('sets the default shape borderRadius to radius-lg (12)', () => {
    expect(theme.shape.borderRadius).toBe(12);
  });

  it('uses white (#FFFFFF) as the default background', () => {
    const lp = getLightPalette();
    expect(lp.palette.background.default).toBe('#FFFFFF');
  });

  it('uses white (#FFFFFF) for paper', () => {
    const lp = getLightPalette();
    expect(lp.palette.background.paper).toBe('#FFFFFF');
  });

  it('uses #12111A for text.primary', () => {
    const lp = getLightPalette();
    expect(lp.palette.text.primary).toBe('#12111A');
  });

  it('uses #6B6D82 for text.secondary', () => {
    const lp = getLightPalette();
    expect(lp.palette.text.secondary).toBe('#6B6D82');
  });

  it('disables button text transform', () => {
    expect(theme.typography.button.textTransform).toBe('none');
  });

  it('maps warning color to #D97706', () => {
    const lp = getLightPalette();
    expect(lp.palette.warning.main).toBe('#D97706');
  });

  it('maps success color to #059669', () => {
    const lp = getLightPalette();
    expect(lp.palette.success.main).toBe('#059669');
  });

  describe('exported font stacks', () => {
    it('exports serifStack containing Source Serif 4', () => {
      expect(serifStack).toContain('Source Serif 4');
    });

    it('exports sansStack containing Source Sans 3', () => {
      expect(sansStack).toContain('Source Sans 3');
    });

    it('exports monoStack containing JetBrains Mono', () => {
      expect(monoStack).toContain('JetBrains Mono');
    });

    it('exports dmSansStack containing DM Sans', () => {
      expect(dmSansStack).toContain('DM Sans');
    });
  });

  describe('typography variants', () => {
    it('subtitle1 uses DM Sans font, 0.875rem, weight 600', () => {
      expect(theme.typography.subtitle1.fontFamily).toContain('DM Sans');
      expect(theme.typography.subtitle1.fontSize).toBe('0.875rem');
      expect(theme.typography.subtitle1.fontWeight).toBe(600);
    });

    it('subtitle2 uses DM Sans font, 0.875rem, weight 600', () => {
      expect(theme.typography.subtitle2.fontFamily).toContain('DM Sans');
      expect(theme.typography.subtitle2.fontSize).toBe('0.875rem');
      expect(theme.typography.subtitle2.fontWeight).toBe(600);
    });

    it('body1 uses DM Sans font, 0.875rem, weight 400, lineHeight 1.5', () => {
      expect(theme.typography.body1.fontFamily).toContain('DM Sans');
      expect(theme.typography.body1.fontSize).toBe('0.875rem');
      expect(theme.typography.body1.fontWeight).toBe(400);
      expect(theme.typography.body1.lineHeight).toBe(1.5);
    });

    it('body2 uses DM Sans font, 0.8125rem, weight 500', () => {
      expect(theme.typography.body2.fontFamily).toContain('DM Sans');
      expect(theme.typography.body2.fontSize).toBe('0.8125rem');
      expect(theme.typography.body2.fontWeight).toBe(500);
    });

    it('caption uses DM Sans font, 0.75rem, weight 400', () => {
      expect(theme.typography.caption.fontFamily).toContain('DM Sans');
      expect(theme.typography.caption.fontSize).toBe('0.75rem');
      expect(theme.typography.caption.fontWeight).toBe(400);
    });

    it('overline uses DM Sans font, 0.6875rem, weight 600, uppercase, letterSpacing 0.06em', () => {
      expect(theme.typography.overline.fontFamily).toContain('DM Sans');
      expect(theme.typography.overline.fontSize).toBe('0.6875rem');
      expect(theme.typography.overline.fontWeight).toBe(600);
      expect(theme.typography.overline.textTransform).toBe('uppercase');
      expect(theme.typography.overline.letterSpacing).toBe('0.06em');
    });
  });
});
