import { describe, it, expect } from 'vitest';
import { theme } from '../../src/theme/index.js';

/* Extract light palette from colorSchemes. We cast through unknown
   because MUI v7's colorSchemes type is not fully resolved by the
   strict TS/ESLint combo. */
interface LightScheme {
  palette: {
    primary: { main: string };
    secondary: { main: string };
    error: { main: string };
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
});
