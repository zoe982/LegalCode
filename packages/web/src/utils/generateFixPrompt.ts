import type { ErrorLogEntry } from '@legalcode/shared';

function extractFilePaths(stack: string): string[] {
  // Match patterns like "at Component (file.tsx:line)" or "(file.ts:line:col)"
  // eslint-disable-next-line security/detect-unsafe-regex -- runs on internal error stacks only, not user input
  const fileRegex = /(?:at\s+\S+\s+\(|at\s+|\()([^\s()]+\.(?:tsx?|jsx?|mjs|cjs):\d+(?::\d+)?)\)?/g;
  const paths = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(stack)) !== null) {
    const filePath = match[1];
    if (filePath) {
      // Extract just the filename
      const parts = filePath.split('/');
      const filename = parts[parts.length - 1];
      if (filename) {
        // split always returns at least one element; ?? satisfies noUncheckedIndexedAccess
        /* v8 ignore next */
        paths.add(filename.split(':')[0] ?? filename);
      }
    }
  }

  return [...paths];
}

export function generateFixPrompt(entry: ErrorLogEntry): string {
  const filePaths = entry.stack ? extractFilePaths(entry.stack) : [];

  const sections: string[] = [];

  // Error context
  sections.push(`## Error Context

- **Source:** ${entry.source}
- **Severity:** ${entry.severity}
- **URL:** ${entry.url ?? 'N/A'}
- **First seen:** ${entry.timestamp}
- **Last seen:** ${entry.lastSeenAt}
- **Occurrence count:** ${String(entry.occurrenceCount)}
- **Error ID:** ${entry.id}`);

  // Error message
  sections.push(`## Error Message

\`\`\`
${entry.message}
\`\`\``);

  // Stack trace
  if (entry.stack) {
    sections.push(`## Stack Trace

\`\`\`
${entry.stack}
\`\`\``);
  } else {
    sections.push(`## Stack Trace

No stack trace available.`);
  }

  // File paths
  if (filePaths.length > 0) {
    sections.push(`## Relevant Files

${filePaths.map((f) => `- \`${f}\``).join('\n')}`);
  }

  // Instructions
  sections.push(`## Instructions

1. Read the relevant source files listed above
2. Identify the root cause of the error
3. Write a failing test that reproduces the issue
4. Implement the fix (minimal changes only)
5. Verify: \`pnpm test && pnpm typecheck && pnpm lint\``);

  // Resolution
  sections.push(`## Resolution

Mark as resolved after fixing:

\`\`\`bash
curl -X PATCH https://legalcode.ax1access.com/admin/errors/${entry.id}/resolve
\`\`\`

Or include in commit message:
\`\`\`
Fixes-Error: ${entry.id}
\`\`\``);

  // Project notes
  sections.push(`## Project Notes

- TypeScript strict mode (noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- 95% per-file coverage minimum — TDD is mandatory
- React 19 + MUI v7 + TanStack Query v5 + Hono v4
- ESLint strict-type-checked, zero warnings`);

  return sections.join('\n\n');
}
