import type { Node } from '@milkdown/kit/prose/model';

/**
 * A heading found in the ProseMirror document with its position and metadata.
 */
export interface HeadingInfo {
  /** ProseMirror position of the heading node */
  pos: number;
  /** Heading level 1-6 */
  level: number;
  /** Size of the heading node */
  nodeSize: number;
}

/**
 * A single heading level change to be applied as a ProseMirror transaction.
 */
export interface LevelChange {
  /** ProseMirror position of the heading to change */
  pos: number;
  /** The new heading level to set */
  newLevel: number;
}

/**
 * Result of a level change validation — either a list of changes to apply,
 * or a blocked signal indicating the operation is not permitted.
 */
export interface LevelChangeResult {
  /** The heading changes to apply, empty if none are valid */
  changes: LevelChange[];
  /** True if the entire operation is blocked (e.g., title protection, max depth) */
  blocked: boolean;
}

// Minimal doc-like interface for walking node children
interface DocLike {
  nodeSize: number;
  forEach: (cb: (node: NodeLike, offset: number, index: number) => void) => void;
}

interface NodeLike {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent: string;
  nodeSize: number;
}

/**
 * Walk a ProseMirror document and collect all heading nodes with their
 * positions, levels, and sizes.
 *
 * Title nodes (type.name === 'title') are skipped — only real heading nodes
 * are included in the result.
 */
export function collectHeadings(doc: Node): HeadingInfo[] {
  const docLike = doc as unknown as DocLike;
  const headings: HeadingInfo[] = [];

  docLike.forEach((node, offset) => {
    if (node.type.name !== 'heading') return;
    const rawLevel = (node.attrs as { level?: unknown } | undefined)?.level;
    const level = typeof rawLevel === 'number' ? rawLevel : 0;
    if (level < 1 || level > 6) return;
    headings.push({ pos: offset, level, nodeSize: node.nodeSize });
  });

  return headings;
}

/**
 * Walk the document to check if a title node (type.name === 'title') exists.
 * Used to determine whether the first H1 should be treated as the document title.
 */
function docHasTitleNode(doc: Node): boolean {
  const docLike = doc as unknown as DocLike;
  let found = false;
  docLike.forEach((node) => {
    if (node.type.name === 'title') found = true;
  });
  return found;
}

/**
 * Find all headings whose position falls within [from, to].
 *
 * For a collapsed cursor (from === to), finds any heading whose node range
 * [pos, pos + nodeSize) contains the cursor position.
 */
export function findHeadingsInRange(
  headings: HeadingInfo[],
  from: number,
  to: number,
): HeadingInfo[] {
  if (from === to) {
    // Collapsed cursor — find the heading whose node contains the cursor
    return headings.filter((h) => from >= h.pos && from < h.pos + h.nodeSize);
  }
  // Range selection — include headings whose pos falls in [from, to]
  return headings.filter((h) => h.pos >= from && h.pos <= to);
}

/**
 * Determine if the selected headings can be indented (level increased by 1).
 *
 * Rules:
 * - Blocked if the target heading is the first H1 AND no title node exists in
 *   the document (the first H1 acts as document title when there's no title node)
 * - An H1 following a title node is NOT treated as the document title
 * - Blocked if all selected headings are at the maximum depth (H4)
 * - Blocked if no heading at level <= L exists before the target (no parent context)
 * - Returns all valid changes; blocked=true if the whole operation must be rejected
 */
export function canIncreaseLevel(
  headings: HeadingInfo[],
  from: number,
  to: number,
  doc?: Node,
): LevelChangeResult {
  const targets = findHeadingsInRange(headings, from, to);
  if (targets.length === 0) {
    return { changes: [], blocked: false };
  }

  // Find the first H1 in the document (index 0-based in headings array)
  const firstH1Index = headings.findIndex((h) => h.level === 1);
  // Title node present: if so, first H1 is NOT treated as a title heading
  const titleNodePresent = doc !== undefined ? docHasTitleNode(doc) : false;

  const changes: LevelChange[] = [];

  for (const target of targets) {
    const targetIndex = headings.indexOf(target);

    // Block: first H1 is the document title (only when no explicit title node)
    if (targetIndex === firstH1Index && target.level === 1 && !titleNodePresent) {
      return { changes: [], blocked: true };
    }

    // Skip headings already at maximum depth — but don't block the whole operation
    if (target.level >= 4) {
      continue;
    }

    // Block: no heading at level <= L before this position (no parent context).
    // Exception: if the doc has a title node, it acts as level-0 context for H1s.
    const hasPrecedingContext =
      (titleNodePresent && target.level === 1) ||
      headings.slice(0, targetIndex).some((h) => h.level <= target.level);

    if (!hasPrecedingContext) {
      return { changes: [], blocked: true };
    }

    changes.push({ pos: target.pos, newLevel: target.level + 1 });
  }

  // If all targets were at max level (skipped), treat as blocked
  if (changes.length === 0) {
    return { changes: [], blocked: true };
  }

  return { changes, blocked: false };
}

/**
 * Determine if the selected headings can be outdented (level decreased by 1).
 *
 * Rules:
 * - Blocked if the target heading is H1 (cannot go below level 1)
 * - Blocked if the target heading is the first H1 (title protection)
 * - Blocked if decreasing would orphan child headings (headings deeper than L
 *   that immediately follow and have no other parent at level L)
 * - Returns all valid changes; blocked=true if the whole operation must be rejected
 */
export function canDecreaseLevel(
  headings: HeadingInfo[],
  from: number,
  to: number,
): LevelChangeResult {
  const targets = findHeadingsInRange(headings, from, to);
  if (targets.length === 0) {
    return { changes: [], blocked: false };
  }

  // Find the index of the first H1 in the document (acts as title)
  const firstH1Index = headings.findIndex((h) => h.level === 1);

  const changes: LevelChange[] = [];

  for (const target of targets) {
    const targetIndex = headings.indexOf(target);

    // Block: first H1 is title
    if (targetIndex === firstH1Index && target.level === 1) {
      return { changes: [], blocked: true };
    }

    // Block: already at minimum level
    if (target.level <= 1) {
      return { changes: [], blocked: true };
    }

    // Block: decreasing would orphan children
    // Scan headings after this one until we reach a heading at level <= newLevel
    const newLevel = target.level - 1;
    for (let i = targetIndex + 1; i < headings.length; i++) {
      const next = headings[i];
      /* v8 ignore next */
      if (next === undefined) break;
      // Stop if we reach a heading at level <= newLevel (end of this section)
      if (next.level <= newLevel) break;
      // If there's a heading deeper than target.level, it would be orphaned
      if (next.level > target.level) {
        return { changes: [], blocked: true };
      }
    }

    changes.push({ pos: target.pos, newLevel });
  }

  return { changes, blocked: false };
}
