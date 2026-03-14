import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register/react': path.resolve(
        import.meta.dirname,
        'packages/web/tests/__mocks__/virtual-pwa-register-react.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
    include: ['packages/**/tests/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    environmentMatchGlobs: [
      ['packages/api/**/*.test.ts', 'node'],
      ['packages/shared/**/*.test.ts', 'node'],
    ],
    teardownTimeout: 5000,
    forceRerunTriggers: ['**/vitest.config.*', '**/vitest.setup.*'],
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
      exclude: [
        'node_modules/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mocks/**',
        '**/main.tsx', // React entry point — not unit-testable
        '**/types/**', // Pure type files — no runtime code
      ],
    },
  },
});
