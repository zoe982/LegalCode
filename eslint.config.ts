import eslint from '@eslint/js';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

// eslint-disable-next-line @typescript-eslint/no-deprecated -- migrate to defineConfig when typescript-eslint supports it natively
export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'eslint.config.ts',
            'vitest.config.ts',
            'vitest.setup.ts',
            'playwright.config.ts',
            'packages/web/vite.config.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/coverage/',
      '**/.wrangler/',
      'drizzle/',
      'drizzle.config.ts',
      'pw-auth.mjs',
    ],
  },
  // Security plugin — applied globally, noisy false-positive rules disabled
  {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- eslint-plugin-security lacks proper TS types
    plugins: { security },
    rules: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- eslint-plugin-security lacks proper TS types
      ...(security.configs?.recommended?.rules as Record<string, unknown>),
      // These produce too many false positives for zero-warning policy
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
);
