import { variableDefinitionSchema } from '@legalcode/shared';
import type { VariableDefinition } from '@legalcode/shared';

// ---------------------------------------------------------------------------
// VARIABLE_REF_REGEX
// Matches {{var:some-id}} with id chars: letters, digits, underscores, hyphens.
// ---------------------------------------------------------------------------
export const VARIABLE_REF_REGEX = /\{\{var:([a-zA-Z0-9_-]+)\}\}/g;

// ---------------------------------------------------------------------------
// generateVariableId
// Slugifies a name and appends 4 random hex chars for uniqueness.
// ---------------------------------------------------------------------------
export function generateVariableId(name: string): string {
  const slug = name
    .toLowerCase()
    // Replace any non-alphanumeric characters (except hyphens) with spaces
    .replace(/[^a-z0-9\s-]/g, ' ')
    // Collapse whitespace and hyphens into a single hyphen
    .replace(/[\s-]+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  const suffix = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');

  return slug.length > 0 ? `${slug}-${suffix}` : suffix;
}

// ---------------------------------------------------------------------------
// Minimal YAML parser — handles the subset we need:
//   - Top-level key: value (string)
//   - Top-level key: (followed by indented list items)
//   - List items: - field: "value" (quoted or unquoted)
// ---------------------------------------------------------------------------

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseMinimalYaml(yamlText: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlText.split('\n');

  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Top-level key: value  (no leading spaces)
    if (!line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('-')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        i++;
        continue;
      }

      const key = line.slice(0, colonIdx).trim();
      const rest = line.slice(colonIdx + 1).trim();

      if (rest.length > 0) {
        // Scalar value on the same line
        result[key] = stripQuotes(rest);
        i++;
      } else {
        // Look ahead for list items (indented lines starting with -)
        i++;
        const listItems: Record<string, string>[] = [];
        let currentItem: Record<string, string> | null = null;

        while (i < lines.length) {
          const innerLine = lines[i] ?? '';

          // End of list: empty line at top level or new top-level key
          if (innerLine.trim() === '') {
            i++;
            break;
          }

          // New top-level key (no indent) — stop parsing this list
          if (
            !innerLine.startsWith(' ') &&
            !innerLine.startsWith('\t') &&
            !innerLine.startsWith('-')
          ) {
            break;
          }

          const trimmedInner = innerLine.trim();

          if (trimmedInner.startsWith('- ')) {
            // New list item
            if (currentItem !== null) {
              listItems.push(currentItem);
            }
            currentItem = {};
            const fieldStr = trimmedInner.slice(2); // remove "- "
            const innerColonIdx = fieldStr.indexOf(':');
            if (innerColonIdx !== -1) {
              const fieldKey = fieldStr.slice(0, innerColonIdx).trim();
              const fieldVal = fieldStr.slice(innerColonIdx + 1).trim();
              currentItem[fieldKey] = stripQuotes(fieldVal);
            }
            i++;
          } else if (trimmedInner.startsWith('-') && trimmedInner.length === 1) {
            // Bare "-" — new empty item
            if (currentItem !== null) {
              listItems.push(currentItem);
            }
            currentItem = {};
            i++;
          } else {
            // Field within current list item
            const innerColonIdx = trimmedInner.indexOf(':');
            if (innerColonIdx !== -1 && currentItem !== null) {
              const fieldKey = trimmedInner.slice(0, innerColonIdx).trim();
              const fieldVal = trimmedInner.slice(innerColonIdx + 1).trim();
              currentItem[fieldKey] = stripQuotes(fieldVal);
            }
            i++;
          }
        }

        // Push the last item if any
        if (currentItem !== null) {
          listItems.push(currentItem);
        }

        result[key] = listItems;
      }
    } else {
      i++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Minimal YAML serializer — handles:
//   - Top-level string key-value pairs (quoted)
//   - Top-level arrays of objects (as YAML list blocks)
// ---------------------------------------------------------------------------

function serializeObjectToYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item as Record<string, unknown>);
          let first = true;
          for (const [fieldKey, fieldVal] of entries) {
            if (fieldVal === undefined) continue;
            let serializedVal: string;
            if (typeof fieldVal === 'string') {
              serializedVal = `"${fieldVal}"`;
            } else if (typeof fieldVal === 'number' || typeof fieldVal === 'boolean') {
              serializedVal = String(fieldVal);
            } else {
              continue; // skip non-primitive values
            }
            if (first) {
              lines.push(`  - ${fieldKey}: ${serializedVal}`);
              first = false;
            } else {
              lines.push(`    ${fieldKey}: ${serializedVal}`);
            }
          }
        }
      }
    } else if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// parseFrontmatter
// Splits a markdown string into { frontmatter, body }.
// Returns frontmatter: null when no --- block is found.
// ---------------------------------------------------------------------------

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown> | null;
  body: string;
}

export function parseFrontmatter(md: string): ParsedFrontmatter {
  if (!md.startsWith('---')) {
    return { frontmatter: null, body: md };
  }

  // Find the closing ---
  const afterOpening = md.slice(3);
  // The closing delimiter must be on its own line
  const closingMatch = /\n---(\n|$)/.exec(afterOpening);
  if (!closingMatch) {
    return { frontmatter: null, body: md };
  }

  const yamlText = afterOpening.slice(0, closingMatch.index);
  const body = afterOpening.slice(closingMatch.index + closingMatch[0].length);

  const frontmatter = parseMinimalYaml(yamlText);
  return { frontmatter, body };
}

// ---------------------------------------------------------------------------
// serializeFrontmatter
// Reassembles frontmatter + body into a markdown string.
// ---------------------------------------------------------------------------

export function serializeFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  const yamlContent = serializeObjectToYaml(frontmatter);
  const yamlBlock = yamlContent.length > 0 ? `---\n${yamlContent}\n---\n` : `---\n---\n`;
  return `${yamlBlock}${body}`;
}

// ---------------------------------------------------------------------------
// extractVariables
// Reads the `variables` array from frontmatter and Zod-validates each entry.
// Returns only valid VariableDefinition items (invalid entries are skipped).
// ---------------------------------------------------------------------------

export function extractVariables(
  frontmatter: Record<string, unknown> | null,
): VariableDefinition[] {
  if (frontmatter === null) return [];

  const raw = frontmatter.variables;
  if (!Array.isArray(raw)) return [];

  const result: VariableDefinition[] = [];
  for (const item of raw) {
    const parsed = variableDefinitionSchema.safeParse(item);
    if (parsed.success) {
      result.push(parsed.data);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// updateVariables
// Returns a new frontmatter object with the variables array replaced/added.
// All other keys are preserved.
// ---------------------------------------------------------------------------

export function updateVariables(
  frontmatter: Record<string, unknown> | null,
  variables: VariableDefinition[],
): Record<string, unknown> {
  const base = frontmatter ?? {};
  return { ...base, variables };
}
