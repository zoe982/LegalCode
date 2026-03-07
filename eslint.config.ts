import eslint from '@eslint/js';
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
);
