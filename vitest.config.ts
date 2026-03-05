import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
    include: ['packages/**/tests/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        perFile: true,
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'e2e/', '**/*.d.ts', '**/*.config.*', '**/mocks/**'],
    },
  },
});
