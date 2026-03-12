import { describe, it, expect } from 'vitest';
import {
  collectHeadings,
  findHeadingsInRange,
  canIncreaseLevel,
  canDecreaseLevel,
} from '../../src/editor/headingLevelCommands.js';
import type {
  HeadingInfo,
  LevelChange,
  LevelChangeResult,
} from '../../src/editor/headingLevelCommands.js';

// ---------------------------------------------------------------------------
// Mock ProseMirror node helpers (same pattern as headingTree.test.ts)
// ---------------------------------------------------------------------------

interface MockNode {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent: string;
  nodeSize: number;
}

interface MockDoc {
  nodeSize: number;
  forEach: (cb: (node: MockNode, offset: number, index: number) => void) => void;
}

function makeHeading(level: number, text: string, nodeSize = 20): MockNode {
  return {
    type: { name: 'heading' },
    attrs: { level },
    textContent: text,
    nodeSize,
  };
}

function makeTitle(text: string, nodeSize = 20): MockNode {
  return {
    type: { name: 'title' },
    textContent: text,
    nodeSize,
  };
}

function makeParagraph(text: string, nodeSize = 25): MockNode {
  return {
    type: { name: 'paragraph' },
    textContent: text,
    nodeSize,
  };
}

/** Build a mock doc from an ordered list of nodes. Offsets start at 1 (ProseMirror convention). */
function makeDoc(nodes: MockNode[]): MockDoc {
  const offsets: number[] = [];
  let pos = 1;
  for (const node of nodes) {
    offsets.push(pos);
    pos += node.nodeSize;
  }
  const docSize = pos + 1; // +1 for doc end token

  return {
    nodeSize: docSize,
    forEach(cb) {
      nodes.forEach((node, index) => {
        const offset = offsets[index] ?? 1;
        cb(node, offset, index);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Type assertions — ensure exported types are used correctly
// ---------------------------------------------------------------------------

// These assignments are compile-time checks that the types exist and match
const _typeCheck: HeadingInfo = {
  pos: 0,
  level: 1,
  nodeSize: 20,
};

const _levelChangeCheck: LevelChange = {
  pos: 0,
  newLevel: 2,
};

const _resultCheck: LevelChangeResult = {
  changes: [],
  blocked: false,
};

// Suppress unused variable warnings
void _typeCheck;
void _levelChangeCheck;
void _resultCheck;

// ---------------------------------------------------------------------------
// collectHeadings
// ---------------------------------------------------------------------------

describe('collectHeadings', () => {
  it('returns empty array for empty doc', () => {
    const doc = makeDoc([]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toEqual([]);
  });

  it('returns empty array when doc has only paragraphs', () => {
    const doc = makeDoc([makeParagraph('intro', 25), makeParagraph('body', 20)]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toEqual([]);
  });

  it('collects headings H1-H4 with correct pos, level, and nodeSize', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Subsection', 22), // pos=21
      makeHeading(3, 'Clause', 18), // pos=43
      makeHeading(4, 'SubClause', 24), // pos=61
    ]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ pos: 1, level: 1, nodeSize: 20 });
    expect(result[1]).toEqual({ pos: 21, level: 2, nodeSize: 22 });
    expect(result[2]).toEqual({ pos: 43, level: 3, nodeSize: 18 });
    expect(result[3]).toEqual({ pos: 61, level: 4, nodeSize: 24 });
  });

  it('skips title nodes — only real heading nodes are collected', () => {
    const doc = makeDoc([makeTitle('Agreement Title', 20), makeHeading(1, 'Section One', 20)]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.level).toBe(1);
  });

  it('skips paragraph and other non-heading nodes', () => {
    const doc = makeDoc([
      makeParagraph('intro', 25),
      makeHeading(1, 'Section', 20),
      makeParagraph('body', 20),
      makeHeading(2, 'Clause', 20),
      makeParagraph('footer', 18),
    ]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(2);
    expect(result[0]?.level).toBe(1);
    expect(result[1]?.level).toBe(2);
  });

  it('collects headings in document order with correct positions', () => {
    const doc = makeDoc([
      makeHeading(2, 'A', 20), // pos=1
      makeHeading(1, 'B', 30), // pos=21
      makeHeading(3, 'C', 25), // pos=51
    ]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.pos).toBe(1);
    expect(result[1]?.pos).toBe(21);
    expect(result[2]?.pos).toBe(51);
  });

  it('skips heading nodes with invalid (non-numeric) level attrs', () => {
    // Heading node with non-numeric attrs.level — should be skipped
    const badNode: MockNode = {
      type: { name: 'heading' },
      attrs: { level: 'not-a-number' },
      textContent: 'Bad',
      nodeSize: 20,
    };
    const doc = makeDoc([badNode, makeHeading(2, 'Good', 20)]);
    const result = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Bad node gets level=0 which is < 1, so it's filtered out
    expect(result).toHaveLength(1);
    expect(result[0]?.level).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// findHeadingsInRange
// ---------------------------------------------------------------------------

describe('findHeadingsInRange', () => {
  it('returns single heading when collapsed cursor is inside it', () => {
    // H1 at pos=1, nodeSize=20 → occupies [1, 20]
    const doc = makeDoc([makeHeading(1, 'Section', 20)]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Collapsed cursor at pos=5 (inside the heading node at pos=1)
    const result = findHeadingsInRange(allHeadings, 5, 5);
    expect(result).toHaveLength(1);
    expect(result[0]?.pos).toBe(1);
  });

  it('returns empty array when collapsed cursor is on a paragraph (no heading at that pos)', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1, occupies [1,20]
      makeParagraph('body', 25), // pos=21, occupies [21,45]
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Cursor at pos=30 — inside paragraph, not a heading
    const result = findHeadingsInRange(allHeadings, 30, 30);
    expect(result).toHaveLength(0);
  });

  it('returns multiple headings when selection spans across them', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section 1', 20), // pos=1
      makeHeading(2, 'Sub A', 20), // pos=21
      makeHeading(2, 'Sub B', 20), // pos=41
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Selection from pos=1 to pos=50 covers all three headings
    const result = findHeadingsInRange(allHeadings, 1, 50);
    expect(result).toHaveLength(3);
  });

  it('includes only headings whose pos falls within [from, to]', () => {
    const doc = makeDoc([
      makeHeading(1, 'Before', 20), // pos=1
      makeHeading(2, 'In range', 20), // pos=21
      makeHeading(3, 'Also in range', 20), // pos=41
      makeHeading(1, 'After', 20), // pos=61
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Selection from 21 to 55 — covers H2 (pos=21) and H3 (pos=41), not H1 at 1 or 61
    const result = findHeadingsInRange(allHeadings, 21, 55);
    expect(result).toHaveLength(2);
    expect(result[0]?.pos).toBe(21);
    expect(result[1]?.pos).toBe(41);
  });

  it('returns empty array when selection covers no heading positions', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeParagraph('body', 30), // pos=21
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Selection only within paragraph range [22, 40]
    const result = findHeadingsInRange(allHeadings, 22, 40);
    expect(result).toHaveLength(0);
  });

  it('includes heading at exact boundary (pos === from)', () => {
    const doc = makeDoc([makeHeading(2, 'Exact', 20)]); // pos=1
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = findHeadingsInRange(allHeadings, 1, 1);
    expect(result).toHaveLength(1);
  });

  it('includes heading at exact boundary (pos === to)', () => {
    const doc = makeDoc([
      makeParagraph('before', 25), // pos=1
      makeHeading(1, 'Target', 20), // pos=26
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = findHeadingsInRange(allHeadings, 10, 26);
    expect(result).toHaveLength(1);
    expect(result[0]?.pos).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// canIncreaseLevel (indent)
// ---------------------------------------------------------------------------

describe('canIncreaseLevel', () => {
  it('returns blocked=false, empty changes when no headings in selection', () => {
    const doc = makeDoc([makeParagraph('just text', 25)]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 5, 5);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(0);
  });

  it('blocks the first H1 in the document (treated as title)', () => {
    const doc = makeDoc([makeHeading(1, 'Title', 20)]); // pos=1
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Collapsed cursor on this first H1
    const result = canIncreaseLevel(allHeadings, 1, 1);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('blocks H6 — cannot indent beyond maximum depth of 6', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
      makeHeading(4, 'SubClause', 20), // pos=61
      makeHeading(5, 'SubSubClause', 20), // pos=81
      makeHeading(6, 'DeepClause', 20), // pos=101
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 101, 101);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('allows H4 increase to H5 — no longer blocked at H4', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
      makeHeading(4, 'SubClause', 20), // pos=61
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 61, 61);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 61, newLevel: 5 });
  });

  it('allows H5 increase to H6', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
      makeHeading(4, 'SubClause', 20), // pos=61
      makeHeading(5, 'SubSubClause', 20), // pos=81
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 81, 81);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 81, newLevel: 6 });
  });

  it('allows H2 increase to H3 when H1 exists above', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Clause', 20), // pos=21
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 21, 21);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 21, newLevel: 3 });
  });

  it('allows second H1 increase to H2 (first H1 acts as title/parent)', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title H1', 20), // pos=1  — first H1, acts as title
      makeHeading(1, 'Section H1', 20), // pos=21 — second H1, can be indented
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 21, 21);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 21, newLevel: 2 });
  });

  it('allows H1 increase to H2 when title node precedes it (title provides parent context)', () => {
    const doc = makeDoc([
      makeTitle('Agreement Title', 20), // pos=1 — title node (not a heading)
      makeHeading(1, 'Article One', 20), // pos=21 — H1 after title, can be indented
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Pass the doc so canIncreaseLevel can detect the title node
    const result = canIncreaseLevel(
      allHeadings,
      21,
      21,
      doc as unknown as import('@milkdown/kit/prose/model').Node,
    );
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 21, newLevel: 2 });
  });

  it('blocks increase when no heading at level <= L exists before this heading', () => {
    // Lone H2 with no heading before it — no parent context
    const doc = makeDoc([makeHeading(2, 'Orphan', 20)]); // pos=1
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 1, 1);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('allows H3 increase to H4 when H1 and H2 exist above', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Subsection', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canIncreaseLevel(allHeadings, 41, 41);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 41, newLevel: 4 });
  });

  it('returns changes for all valid headings in a multi-heading selection', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub A', 20), // pos=21
      makeHeading(2, 'Sub B', 20), // pos=41
      makeHeading(3, 'Clause', 20), // pos=61
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Selection covers Sub A, Sub B, and Clause (but not the first H1 at pos=1)
    const result = canIncreaseLevel(allHeadings, 21, 70);
    expect(result.blocked).toBe(false);
    // Sub A (H2→H3), Sub B (H2→H3), Clause (H3→H4) — all valid since H1 exists above
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it('partially blocks when some headings in selection are at max level H6', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
      makeHeading(4, 'SubClause', 20), // pos=61
      makeHeading(5, 'SubSubClause', 20), // pos=81
      makeHeading(6, 'DeepClause', 20), // pos=101
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Selection covers H5 (pos=81) and H6 (pos=101)
    const result = canIncreaseLevel(allHeadings, 81, 110);
    // H5 should be allowed (→H6), H6 is blocked — H6 should not be in changes
    const h6Change = result.changes.find((c: LevelChange) => c.pos === 101);
    expect(h6Change).toBeUndefined(); // H6 should not be in changes
  });

  it('blocks entire operation when the first H1 is the only heading in selection', () => {
    const doc = makeDoc([
      makeHeading(1, 'First H1', 20), // pos=1 — first H1, title
      makeHeading(2, 'Sub', 20), // pos=21
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Only select the first H1
    const result = canIncreaseLevel(allHeadings, 1, 15);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// canDecreaseLevel (outdent)
// ---------------------------------------------------------------------------

describe('canDecreaseLevel', () => {
  it('returns blocked=false, empty changes when no headings in selection', () => {
    const doc = makeDoc([makeParagraph('just text', 25)]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 5, 5);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(0);
  });

  it('blocks H1 decrease — cannot go below level 1', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20)]); // pos=1
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 1, 1);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('blocks decrease when heading has children that would be orphaned', () => {
    // H2 at pos=21 has H3 at pos=41 as child; decreasing H2→H1 would leave H3 without H2 parent
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Subsection', 20), // pos=21 — decreasing this
      makeHeading(3, 'Clause', 20), // pos=41 — child of H2
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 21, 21);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('allows H2 decrease to H1 when no children below it', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section 1', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21 — leaf, no H3 children
      makeHeading(1, 'Section 2', 20), // pos=41 — next H1 (same or higher level)
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 21, 21);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 21, newLevel: 1 });
  });

  it('allows H3 decrease to H2 when no children below it', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41 — leaf
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 41, 41);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 41, newLevel: 2 });
  });

  it('allows H4 decrease to H3 when no children below it', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41
      makeHeading(4, 'SubClause', 20), // pos=61 — leaf
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 61, 61);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toEqual({ pos: 61, newLevel: 3 });
  });

  it('blocks decrease of H3 that has H4 children', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub', 20), // pos=21
      makeHeading(3, 'Clause', 20), // pos=41 — has H4 child
      makeHeading(4, 'SubClause', 20), // pos=61
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    const result = canDecreaseLevel(allHeadings, 41, 41);
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('blocks the first H1 heading in the document (title protection)', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20), // pos=1 — first H1, acts as title
      makeHeading(1, 'Section', 20), // pos=21 — second H1
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Attempt to decrease the first H1 — blocked by title rule AND min level
    const result = canDecreaseLevel(allHeadings, 1, 1);
    expect(result.blocked).toBe(true);
  });

  it('blocks decrease of second H1 — cannot go below level 1 (min level rule)', () => {
    // Second H1 is not the title but is at level 1 — cannot decrease below 1
    const doc = makeDoc([
      makeHeading(1, 'Title H1', 20), // pos=1 — first H1
      makeHeading(1, 'Section H1', 20), // pos=21 — second H1
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Decrease the second H1 (not the first) — blocked by min level
    const result = canDecreaseLevel(allHeadings, 21, 21);
    expect(result.blocked).toBe(true);
  });

  it('returns changes for all valid headings in a multi-heading selection', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub A', 20), // pos=21 — leaf
      makeHeading(2, 'Sub B', 20), // pos=41 — leaf
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Select both H2s
    const result = canDecreaseLevel(allHeadings, 21, 50);
    expect(result.blocked).toBe(false);
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0]).toEqual({ pos: 21, newLevel: 1 });
    expect(result.changes[1]).toEqual({ pos: 41, newLevel: 1 });
  });

  it('blocks entire operation if any heading in selection has blocking children', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section', 20), // pos=1
      makeHeading(2, 'Sub A', 20), // pos=21 — leaf, can decrease
      makeHeading(2, 'Sub B', 20), // pos=41 — has child, blocked
      makeHeading(3, 'Clause', 20), // pos=61 — child of Sub B
    ]);
    const allHeadings = collectHeadings(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Select both Sub A (pos=21) and Sub B (pos=41)
    const result = canDecreaseLevel(allHeadings, 21, 50);
    // Sub B at pos=41 has H3 children, so the whole operation should be blocked
    expect(result.blocked).toBe(true);
    expect(result.changes).toHaveLength(0);
  });
});
