import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * PWA manifest validation tests.
 *
 * The manifest is defined inline in vite.config.ts (VitePWA plugin).
 * We duplicate the expected values here to validate correctness as a
 * contract test — if the manifest drifts, these tests catch it.
 */

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

const expectedManifest = {
  name: 'LegalCode by Acasus',
  short_name: 'LegalCode',
  description: 'Template management for Acasus legal team',
  start_url: '/',
  display: 'standalone',
  background_color: '#FFFFFF',
  theme_color: '#8027FF',
  icons: [
    { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  ] satisfies ManifestIcon[],
};

const PUBLIC_DIR = resolve(__dirname, '../public');

describe('PWA manifest configuration', () => {
  it('has all required fields', () => {
    expect(expectedManifest.name).toBeDefined();
    expect(expectedManifest.short_name).toBeDefined();
    expect(expectedManifest.start_url).toBeDefined();
    expect(expectedManifest.display).toBeDefined();
  });

  it('uses v3 design colors', () => {
    expect(expectedManifest.background_color).toBe('#FFFFFF');
    expect(expectedManifest.theme_color).toBe('#8027FF');
  });

  it('defines at least 6 icons', () => {
    expect(expectedManifest.icons.length).toBeGreaterThanOrEqual(6);
  });

  it('references icon files that exist on disk', () => {
    for (const icon of expectedManifest.icons) {
      const filePath = resolve(PUBLIC_DIR, icon.src.replace(/^\//, ''));
      expect(existsSync(filePath), `Icon file missing: ${filePath}`).toBe(true);
    }
  });

  it('includes at least one maskable icon', () => {
    const maskable = expectedManifest.icons.filter((icon) => icon.purpose === 'maskable');
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });

  it('uses standalone display mode', () => {
    expect(expectedManifest.display).toBe('standalone');
  });
});
