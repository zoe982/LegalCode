import { describe, it, expect } from 'vitest';
import { theme, serifStack, sansStack, monoStack } from '../../src/theme/index.js';

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
  };
}

function getLightPalette(): LightScheme {
  return (theme as unknown as { colorSchemes: { light: LightScheme } }).colorSchemes.light;
}

describe('theme', () => {
  it('uses Source Sans 3 as default font family', () => {
    expect(theme.typography.fontFamily).toContain('Source Sans 3');
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

  it('maps error color to destructive red', () => {
    const lp = getLightPalette();
    expect(lp.palette.error.main).toBe('#D32F2F');
  });

  it('sets the default shape borderRadius to radius-lg (12)', () => {
    expect(theme.shape.borderRadius).toBe(12);
  });

  it('uses beige as the default background', () => {
    const lp = getLightPalette();
    expect(lp.palette.background.default).toBe('#EFE3D3');
  });

  it('uses elevated surface for paper', () => {
    const lp = getLightPalette();
    expect(lp.palette.background.paper).toBe('#F7F0E6');
  });

  it('disables button text transform', () => {
    expect(theme.typography.button.textTransform).toBe('none');
  });

  it('maps warning color to dark goldenrod', () => {
    const lp = getLightPalette();
    expect(lp.palette.warning.main).toBe('#B8860B');
  });

  it('maps success color to dark green', () => {
    const lp = getLightPalette();
    expect(lp.palette.success.main).toBe('#2D6A4F');
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
  });

  describe('typography variants', () => {
    it('subtitle1 uses sans font, 1rem, weight 600', () => {
      expect(theme.typography.subtitle1.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.subtitle1.fontSize).toBe('1rem');
      expect(theme.typography.subtitle1.fontWeight).toBe(600);
    });

    it('subtitle2 uses sans font, 0.875rem, weight 600', () => {
      expect(theme.typography.subtitle2.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.subtitle2.fontSize).toBe('0.875rem');
      expect(theme.typography.subtitle2.fontWeight).toBe(600);
    });

    it('body1 uses sans font, 0.9375rem, weight 400, lineHeight 1.5', () => {
      expect(theme.typography.body1.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.body1.fontSize).toBe('0.9375rem');
      expect(theme.typography.body1.fontWeight).toBe(400);
      expect(theme.typography.body1.lineHeight).toBe(1.5);
    });

    it('body2 uses sans font, 0.8125rem, weight 500', () => {
      expect(theme.typography.body2.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.body2.fontSize).toBe('0.8125rem');
      expect(theme.typography.body2.fontWeight).toBe(500);
    });

    it('caption uses sans font, 0.75rem, weight 400', () => {
      expect(theme.typography.caption.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.caption.fontSize).toBe('0.75rem');
      expect(theme.typography.caption.fontWeight).toBe(400);
    });

    it('overline uses sans font, 0.6875rem, weight 600, uppercase, letterSpacing 0.06em', () => {
      expect(theme.typography.overline.fontFamily).toContain('Source Sans 3');
      expect(theme.typography.overline.fontSize).toBe('0.6875rem');
      expect(theme.typography.overline.fontWeight).toBe(600);
      expect(theme.typography.overline.textTransform).toBe('uppercase');
      expect(theme.typography.overline.letterSpacing).toBe('0.06em');
    });
  });
});
