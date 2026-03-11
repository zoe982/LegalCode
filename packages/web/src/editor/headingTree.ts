import type { Node } from '@milkdown/kit/prose/model';

export interface HeadingEntry {
  /** Heading depth 1-4 */
  level: number;
  /** Raw text content of the heading node */
  text: string;
  /** ProseMirror position of the heading node */
  pos: number;
  /** Position of the end of the section (start of next same-or-higher heading, or doc end) */
  endPos: number;
  /** First ~50 chars of body text below the heading */
  bodyPreview: string;
  /** Computed hierarchical number, e.g. "1.", "1.1", "1.1.1", "1.1.1.1". Empty string for title entry. */
  number: string;
  /** True if this heading is the document title (first H1 in the document, gets no number) */
  isTitle: boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Raw entry before endPos / bodyPreview are resolved */
interface RawEntry {
  level: number;
  text: string;
  pos: number;
  /** start pos of the first non-heading node after this heading */
  bodyStartPos: number;
  number: string;
  isTitle: boolean;
}

/** Minimal shape we access on a doc-like object */
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

interface TopLevelNode {
  node: NodeLike;
  pos: number;
}

/** Named counter state — avoids unsafe indexed-tuple access under noUncheckedIndexedAccess */
interface Counters {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
}

// ---------------------------------------------------------------------------
// Memoisation cache (WeakMap — keyed by doc identity, GC-friendly)
// ---------------------------------------------------------------------------

const cache = new WeakMap<object, HeadingEntry[]>();

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

/**
 * Walk a ProseMirror document and return an array of {@link HeadingEntry} objects
 * with computed hierarchical legal numbering.
 *
 * The function is pure and deterministic. Results are memoised by document
 * object identity so repeated calls with the same (immutable) doc are free.
 */
export function extractHeadingTree(doc: Node): HeadingEntry[] {
  const docObj = doc as unknown as object;

  const cached = cache.get(docObj);
  if (cached !== undefined) {
    return cached;
  }

  const docLike = doc as unknown as DocLike;

  // ------------------------------------------------------------------
  // Pass 1: collect all top-level nodes with positions, in document order.
  // ------------------------------------------------------------------

  const topLevel: TopLevelNode[] = [];

  docLike.forEach((node, offset) => {
    topLevel.push({ node, pos: offset });
  });

  // ------------------------------------------------------------------
  // Pass 2: build raw entries with numbering
  // ------------------------------------------------------------------

  const counters: Counters = { h1: 0, h2: 0, h3: 0, h4: 0 };

  const rawEntries: RawEntry[] = [];

  // Pre-scan: count H1 headings to determine if level shifting is needed.
  // When there's exactly one H1 (the title) and all other headings are H2+,
  // we shift levels down by 1 so H2→numbers as H1, H3→H2, etc.
  let h1Count = 0;
  for (const { node } of topLevel) {
    if (node.type.name !== 'heading') continue;
    const l = (node.attrs as { level?: unknown } | undefined)?.level;
    if (l === 1) h1Count += 1;
  }

  // Track whether we've seen the very first heading in the document
  let firstHeadingSeen = false;
  // Only shift levels when there's a title H1 and no other H1s in the doc
  let shiftLevels = false;

  for (const { node, pos } of topLevel) {
    if (node.type.name !== 'heading') continue;

    const rawLevel = (node.attrs as { level?: unknown } | undefined)?.level;
    const level = typeof rawLevel === 'number' ? rawLevel : 0;
    if (level < 1 || level > 4) continue;

    // Title detection: if the very first heading in the document is H1, treat it as title
    if (!firstHeadingSeen) {
      firstHeadingSeen = true;
      if (level === 1) {
        // Shift levels only when this is the only H1 (no numbered H1 sections)
        shiftLevels = h1Count === 1;
        // bodyStartPos: the position immediately after this heading node
        const bodyStartPos = pos + node.nodeSize;
        rawEntries.push({
          level,
          text: node.textContent,
          pos,
          bodyStartPos,
          number: '',
          isTitle: true,
        });
        continue;
      }
    }

    // When title exists and no other H1s, shift levels: H2→1, H3→2, H4→3
    const numberLevel =
      shiftLevels && level > 1 ? ((level - 1) as 1 | 2 | 3 | 4) : (level as 1 | 2 | 3 | 4);

    // Increment this level's counter and reset all deeper counters
    // For the first H1 after a title, we still start from 1 (counters unchanged since 0)
    incrementCounters(counters, numberLevel);

    const number = buildNumber(counters, numberLevel);

    // bodyStartPos: the position immediately after this heading node
    const bodyStartPos = pos + node.nodeSize;

    rawEntries.push({ level, text: node.textContent, pos, bodyStartPos, number, isTitle: false });
  }

  // ------------------------------------------------------------------
  // Pass 3: resolve endPos and bodyPreview for each entry
  // ------------------------------------------------------------------

  const docEnd = docLike.nodeSize - 1;

  const entries: HeadingEntry[] = rawEntries.map((entry, idx) => {
    // Find the next heading at the same or higher (lower number) level
    let endPos = docEnd;
    for (let j = idx + 1; j < rawEntries.length; j++) {
      const next = rawEntries[j];
      if (next !== undefined && next.level <= entry.level) {
        endPos = next.pos;
        break;
      }
    }

    // Collect body text from top-level nodes between this heading end and section end
    const bodyText = topLevel
      .filter(({ node, pos }) => {
        if (node.type.name === 'heading') return false;
        return pos >= entry.bodyStartPos && pos < endPos;
      })
      .map(({ node }) => node.textContent)
      .join(' ')
      .trim();

    const bodyPreview = bodyText.length > 50 ? bodyText.slice(0, 50) + '...' : bodyText;

    return {
      level: entry.level,
      text: entry.text,
      pos: entry.pos,
      endPos,
      bodyPreview,
      number: entry.number,
      isTitle: entry.isTitle,
    };
  });

  cache.set(docObj, entries);
  return entries;
}

// ---------------------------------------------------------------------------
// Counter helpers
// ---------------------------------------------------------------------------

function incrementCounters(counters: Counters, level: 1 | 2 | 3 | 4): void {
  if (level === 1) {
    counters.h1 += 1;
    counters.h2 = 0;
    counters.h3 = 0;
    counters.h4 = 0;
  } else if (level === 2) {
    counters.h2 += 1;
    counters.h3 = 0;
    counters.h4 = 0;
  } else if (level === 3) {
    counters.h3 += 1;
    counters.h4 = 0;
  } else {
    counters.h4 += 1;
  }
}

function buildNumber(counters: Counters, level: 1 | 2 | 3 | 4): string {
  const h1 = String(counters.h1);
  const h2 = String(counters.h2);
  const h3Str = String(counters.h3);
  const h4 = String(counters.h4);

  if (level === 1) return `${h1}.`;
  if (level === 2) return `${h1}.${h2}`;
  if (level === 3) return `${h1}.${h2}.${h3Str}`;
  return `${h1}.${h2}.${h3Str}.${h4}`;
}
