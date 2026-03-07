import { describe, it, expect } from 'vitest';
import type { ErrorLogEntry } from '@legalcode/shared';

const { generateFixPrompt } = await import('../../src/utils/generateFixPrompt.js');

const baseEntry: ErrorLogEntry = {
  id: 'err-001',
  timestamp: '2026-03-06T10:00:00Z',
  source: 'frontend',
  severity: 'error',
  message: 'Cannot read properties of undefined (reading "map")',
  stack:
    'TypeError: Cannot read properties of undefined (reading "map")\n    at TemplateList (TemplateList.tsx:42:15)\n    at renderWithHooks (react-dom.js:100)',
  metadata: null,
  url: 'https://legalcode.ax1access.com/templates',
  userId: 'user-1',
  status: 'open',
  resolvedAt: null,
  resolvedBy: null,
  fingerprint: 'fp-abc',
  occurrenceCount: 3,
  lastSeenAt: '2026-03-07T08:00:00Z',
};

describe('generateFixPrompt', () => {
  it('includes error context section', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('frontend');
    expect(prompt).toContain('error');
    expect(prompt).toContain('https://legalcode.ax1access.com/templates');
    expect(prompt).toContain('2026-03-06');
    expect(prompt).toContain('2026-03-07');
    expect(prompt).toContain('3');
  });

  it('includes error message in code block', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('Cannot read properties of undefined');
    expect(prompt).toContain('```');
  });

  it('includes stack trace in code block', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('TemplateList.tsx:42');
    expect(prompt).toContain('```');
  });

  it('extracts file paths from stack trace', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('TemplateList.tsx');
  });

  it('includes resolution instructions', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('pnpm test');
    expect(prompt).toContain('pnpm typecheck');
    expect(prompt).toContain('pnpm lint');
  });

  it('includes PATCH curl command with error id', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('curl');
    expect(prompt).toContain('/admin/errors/err-001/resolve');
  });

  it('includes Fixes-Error commit convention', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('Fixes-Error: err-001');
  });

  it('includes project notes', () => {
    const prompt = generateFixPrompt(baseEntry);

    expect(prompt).toContain('strict');
    expect(prompt).toContain('95%');
    expect(prompt).toContain('TDD');
  });

  it('handles null stack trace', () => {
    const entry: ErrorLogEntry = { ...baseEntry, stack: null };
    const prompt = generateFixPrompt(entry);

    expect(prompt).toContain('No stack trace available');
  });

  it('handles null URL', () => {
    const entry: ErrorLogEntry = { ...baseEntry, url: null };
    const prompt = generateFixPrompt(entry);

    expect(prompt).toContain('N/A');
  });

  it('handles backend source', () => {
    const entry: ErrorLogEntry = { ...baseEntry, source: 'backend' };
    const prompt = generateFixPrompt(entry);

    expect(prompt).toContain('backend');
  });

  it('handles critical severity', () => {
    const entry: ErrorLogEntry = { ...baseEntry, severity: 'critical' };
    const prompt = generateFixPrompt(entry);

    expect(prompt).toContain('critical');
  });

  it('handles stack with multiple file references', () => {
    const entry: ErrorLogEntry = {
      ...baseEntry,
      stack:
        'Error\n    at Component (src/components/Foo.tsx:10:5)\n    at hook (src/hooks/useBar.ts:20:3)\n    at Object.<anonymous> (src/utils/baz.ts:5:1)',
    };
    const prompt = generateFixPrompt(entry);

    expect(prompt).toContain('Foo.tsx');
    expect(prompt).toContain('useBar.ts');
    expect(prompt).toContain('baz.ts');
  });

  it('handles stack with no recognizable file paths', () => {
    const entry: ErrorLogEntry = {
      ...baseEntry,
      stack: 'Error\n    at <anonymous>',
    };
    const prompt = generateFixPrompt(entry);

    // Should still generate a valid prompt without crashing
    expect(prompt).toContain('Error');
  });
});
