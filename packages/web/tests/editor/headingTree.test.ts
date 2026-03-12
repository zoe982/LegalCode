import { describe, it, expect } from 'vitest';
import { extractHeadingTree } from '../../src/editor/headingTree.js';
import type { HeadingEntry } from '../../src/editor/headingTree.js';

// ---------------------------------------------------------------------------
// Mock ProseMirror node helpers
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
  // Pre-compute offsets: doc starts at pos 1
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
// Tests
// ---------------------------------------------------------------------------

describe('extractHeadingTree', () => {
  // 1. Empty doc returns empty array
  it('returns empty array for empty doc', () => {
    const doc = makeDoc([]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toEqual([]);
  });

  // 2. Title node → isTitle=true, number='', hasChildren computed correctly
  it('title node → isTitle=true with empty number', () => {
    const doc = makeDoc([makeTitle('My Agreement', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[0]?.level).toBe(0);
    expect(result[0]?.text).toBe('My Agreement');
    expect(result[0]?.hasChildren).toBe(false);
  });

  // 3. Title node + H1 sections → title gets '', H1s get "1.", "2."
  it('title node + H1 sections → title has no number, H1s numbered 1., 2.', () => {
    const doc = makeDoc([
      makeTitle('Contract Title', 20),
      makeHeading(1, 'Section A', 20),
      makeHeading(1, 'Section B', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[0]?.hasChildren).toBe(true);
    expect(result[1]?.number).toBe('1.');
    expect(result[1]?.isTitle).toBe(false);
    expect(result[1]?.hasChildren).toBe(false);
    expect(result[2]?.number).toBe('2.');
    expect(result[2]?.isTitle).toBe(false);
    expect(result[2]?.hasChildren).toBe(false);
  });

  // 4. H1 headings with no title node — numbered 1., 2., 3.
  it('H1 headings with no title node are numbered sequentially', () => {
    const doc = makeDoc([
      makeHeading(1, 'Alpha', 20),
      makeHeading(1, 'Beta', 20),
      makeHeading(1, 'Gamma', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.number).toBe('1.');
    expect(result[0]?.isTitle).toBe(false);
    expect(result[1]?.number).toBe('2.');
    expect(result[2]?.number).toBe('3.');
  });

  // 5. Title + H1 + H2 hierarchy
  it('title + H1 + H2 hierarchy produces correct numbers', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'Top', 20),
      makeHeading(2, 'Sub A', 20),
      makeHeading(2, 'Sub B', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(4);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('1.1');
    expect(result[3]?.number).toBe('1.2');
  });

  // 6. Full H1-H4 hierarchy with title node
  it('full H1-H4 hierarchy produces correct numbers', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'Section', 20),
      makeHeading(2, 'Subsection', 20),
      makeHeading(3, 'Clause', 20),
      makeHeading(4, 'SubClause', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(5);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('1.1');
    expect(result[3]?.number).toBe('1.1.1');
    expect(result[4]?.number).toBe('1.1.1.1');
  });

  // 7. Full H1-H6 hierarchy produces correct numbers
  it('H5 and H6 headings are included and numbered correctly', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'S1', 20),
      makeHeading(2, 'S1.1', 20),
      makeHeading(3, 'S1.1.1', 20),
      makeHeading(4, 'S1.1.1.1', 20),
      makeHeading(5, 'S1.1.1.1.1', 20),
      makeHeading(6, 'S1.1.1.1.1.1', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(7);
    expect(result[0]?.number).toBe('');
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('1.1');
    expect(result[3]?.number).toBe('1.1.1');
    expect(result[4]?.number).toBe('1.1.1.1');
    expect(result[5]?.number).toBe('1.1.1.1.1');
    expect(result[6]?.number).toBe('1.1.1.1.1.1');
  });

  // 8. H5 and H6 sequential numbering
  it('multiple H5 entries under same H4 number sequentially', () => {
    const doc = makeDoc([
      makeHeading(1, 'S1', 20),
      makeHeading(2, 'S1.1', 20),
      makeHeading(3, 'S1.1.1', 20),
      makeHeading(4, 'S1.1.1.1', 20),
      makeHeading(5, 'Deep A', 20),
      makeHeading(5, 'Deep B', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(6);
    expect(result[4]?.number).toBe('1.1.1.1.1');
    expect(result[5]?.number).toBe('1.1.1.1.2');
  });

  // 9. H6 sequential numbering
  it('multiple H6 entries under same H5 number sequentially', () => {
    const doc = makeDoc([
      makeHeading(1, 'S1', 20),
      makeHeading(5, 'Deep', 20),
      makeHeading(6, 'Leaf A', 20),
      makeHeading(6, 'Leaf B', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(4);
    expect(result[2]?.number).toBe('1.0.0.0.1.1');
    expect(result[3]?.number).toBe('1.0.0.0.1.2');
  });

  // 10. Multiple sections with mixed levels
  it('multiple sections with mixed levels', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'S1', 20),
      makeHeading(2, 'S1.1', 20),
      makeHeading(2, 'S1.2', 20),
      makeHeading(1, 'S2', 20),
      makeHeading(2, 'S2.1', 20),
      makeHeading(3, 'S2.1.1', 20),
      makeHeading(3, 'S2.1.2', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(8);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('1.1');
    expect(result[3]?.number).toBe('1.2');
    expect(result[4]?.number).toBe('2.');
    expect(result[5]?.number).toBe('2.1');
    expect(result[6]?.number).toBe('2.1.1');
    expect(result[7]?.number).toBe('2.1.2');
  });

  // 11. H3 without parent H2 → still numbers correctly using last known parent
  it('H3 without parent H2 still numbers correctly', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'Section', 20),
      // No H2 — jump straight to H3
      makeHeading(3, 'Clause', 20),
      makeHeading(3, 'Clause2', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(4);
    expect(result[0]?.isTitle).toBe(true);
    expect(result[1]?.number).toBe('1.');
    // H3 counter resets under the current H1, no H2 parent — uses "0" for missing H2
    expect(result[2]?.number).toBe('1.0.1');
    expect(result[3]?.number).toBe('1.0.2');
  });

  // 12. endPos calculation: section ends at next same-or-higher heading
  it('endPos for a section ends at the start of the next same-level heading', () => {
    // H1(pos=1, size=20), H1(pos=21, size=20)
    const doc = makeDoc([makeHeading(1, 'A', 20), makeHeading(1, 'B', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // First heading starts at 1, ends where second heading starts
    expect(result[0]?.pos).toBe(1);
    expect(result[0]?.endPos).toBe(21);
  });

  // endPos: H2 ends at next H1 (higher level)
  it('endPos for H2 ends at next H1 (same-or-higher level)', () => {
    const doc = makeDoc([
      makeHeading(1, 'Section 1', 20), // pos 1
      makeHeading(2, 'Sub', 20), // pos 21
      makeHeading(1, 'Section 2', 20), // pos 41
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // H2 at pos 21 should end at H1 at pos 41
    expect(result[1]?.endPos).toBe(41);
  });

  // 13. endPos for last heading: ends at doc end (nodeSize - 1)
  it('endPos for last heading is doc end', () => {
    // doc nodeSize = 1 (start) + 20 (heading) + 1 (end) = 22
    const doc = makeDoc([makeHeading(1, 'Only', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // doc.nodeSize = 22, last pos = doc.nodeSize - 1 = 21
    expect(result[0]?.endPos).toBe(doc.nodeSize - 1);
  });

  // 14. bodyPreview: first ~50 chars of body text
  it('bodyPreview contains first ~50 chars of body text after heading', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20), makeParagraph('Short paragraph text', 30)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('Short paragraph text');
  });

  // 15. bodyPreview truncation with "..." for long text
  it('bodyPreview truncates long text with ellipsis', () => {
    const longText = 'A'.repeat(80);
    const doc = makeDoc([makeHeading(1, 'Section', 20), makeParagraph(longText, 90)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('A'.repeat(50) + '...');
  });

  // 16. Empty bodyPreview when heading has no body text
  it('bodyPreview is empty string when heading has no body', () => {
    const doc = makeDoc([makeHeading(1, 'Only heading', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('');
  });

  // 17. Headings deeper than H6 are ignored
  it('headings deeper than H6 are ignored', () => {
    const doc = makeDoc([
      makeHeading(1, 'H1', 20),
      makeHeading(5, 'H5', 20),
      makeHeading(6, 'H6', 20),
      makeHeading(7, 'H7', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.level).toBe(1);
    expect(result[1]?.level).toBe(5);
    expect(result[2]?.level).toBe(6);
  });

  // 18. Only heading and title nodes are extracted; paragraphs etc. are skipped
  it('only heading/title nodes are extracted', () => {
    const doc = makeDoc([
      makeParagraph('intro paragraph', 25),
      makeHeading(1, 'Section', 20),
      makeParagraph('body paragraph', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('Section');
  });

  // 19. Memoization: same doc reference returns same array instance
  it('same doc reference returns same result (referential equality)', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20)]);
    const proseMirrorDoc = doc as unknown as import('@milkdown/kit/prose/model').Node;
    const result1 = extractHeadingTree(proseMirrorDoc);
    const result2 = extractHeadingTree(proseMirrorDoc);
    expect(result1).toBe(result2);
  });

  // 20. pos field is correct for each heading
  it('pos is the ProseMirror position of the heading node', () => {
    const doc = makeDoc([
      makeHeading(1, 'A', 20), // pos = 1
      makeHeading(1, 'B', 30), // pos = 1 + 20 = 21
      makeHeading(1, 'C', 25), // pos = 21 + 30 = 51
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.pos).toBe(1);
    expect(result[1]?.pos).toBe(21);
    expect(result[2]?.pos).toBe(51);
  });

  // 21. H4 sequential numbering under same H3
  it('multiple H4 entries under same H3 number sequentially', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'S1', 20),
      makeHeading(2, 'S1.1', 20),
      makeHeading(3, 'S1.1.1', 20),
      makeHeading(4, 'Sub-clause 1', 20),
      makeHeading(4, 'Sub-clause 2', 20),
      makeHeading(4, 'Sub-clause 3', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.isTitle).toBe(true);
    expect(result[4]?.number).toBe('1.1.1.1');
    expect(result[5]?.number).toBe('1.1.1.2');
    expect(result[6]?.number).toBe('1.1.1.3');
  });

  // 22. H3 decimal counter resets when H2 changes
  it('H3 decimal counter resets when parent H2 changes', () => {
    const doc = makeDoc([
      makeTitle('Title', 20),
      makeHeading(1, 'S1', 20),
      makeHeading(2, 'S1.1', 20),
      makeHeading(3, 'Clause 1', 20),
      makeHeading(3, 'Clause 2', 20),
      makeHeading(2, 'S1.2', 20),
      makeHeading(3, 'New clause 1', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.isTitle).toBe(true);
    expect(result[3]?.number).toBe('1.1.1');
    expect(result[4]?.number).toBe('1.1.2');
    expect(result[5]?.number).toBe('1.2');
    expect(result[6]?.number).toBe('1.2.1');
  });

  // 23. text field matches the heading's textContent
  it('text field matches heading textContent', () => {
    const doc = makeDoc([makeHeading(2, 'My Heading Text', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.text).toBe('My Heading Text');
  });

  // 24. HeadingEntry type shape — includes hasChildren
  it('each HeadingEntry has the correct shape including hasChildren', () => {
    const doc = makeDoc([makeHeading(1, 'Test', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    // Verify the exported HeadingEntry type is usable and all fields have the right runtime types
    const entry: HeadingEntry | undefined = result[0];
    expect(typeof entry?.level).toBe('number');
    expect(typeof entry?.text).toBe('string');
    expect(typeof entry?.pos).toBe('number');
    expect(typeof entry?.endPos).toBe('number');
    expect(typeof entry?.bodyPreview).toBe('string');
    expect(typeof entry?.number).toBe('string');
    expect(typeof entry?.isTitle).toBe('boolean');
    expect(typeof entry?.hasChildren).toBe('boolean');
  });

  // ---------------------------------------------------------------------------
  // hasChildren computation
  // ---------------------------------------------------------------------------
  describe('hasChildren computation', () => {
    // H1 with H2 children → hasChildren: true
    it('H1 with H2 children → hasChildren: true', () => {
      const doc = makeDoc([makeHeading(1, 'Parent', 20), makeHeading(2, 'Child', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.hasChildren).toBe(true);
    });

    // Leaf H2 (no deeper headings before next same-or-higher) → hasChildren: false
    it('leaf H2 with no children → hasChildren: false', () => {
      const doc = makeDoc([
        makeHeading(1, 'Parent', 20),
        makeHeading(2, 'Leaf A', 20),
        makeHeading(2, 'Leaf B', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[1]?.hasChildren).toBe(false);
      expect(result[2]?.hasChildren).toBe(false);
    });

    // H2 with H3 children → hasChildren: true
    it('H2 with H3 children → hasChildren: true', () => {
      const doc = makeDoc([
        makeHeading(1, 'S1', 20),
        makeHeading(2, 'S1.1', 20),
        makeHeading(3, 'Clause', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[1]?.hasChildren).toBe(true);
      expect(result[2]?.hasChildren).toBe(false);
    });

    // Title node with heading children → hasChildren: true
    it('title node with heading children → hasChildren: true', () => {
      const doc = makeDoc([makeTitle('My Agreement', 20), makeHeading(1, 'Section', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.hasChildren).toBe(true);
    });

    // Title node with no headings → hasChildren: false
    it('title node alone → hasChildren: false', () => {
      const doc = makeDoc([makeTitle('Only Title', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.hasChildren).toBe(false);
    });

    // Deeper hierarchy: hasChildren true at every non-leaf level
    it('deep hierarchy: every non-leaf level has hasChildren true', () => {
      const doc = makeDoc([
        makeHeading(1, 'S1', 20),
        makeHeading(2, 'S1.1', 20),
        makeHeading(3, 'S1.1.1', 20),
        makeHeading(4, 'Leaf', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.hasChildren).toBe(true); // H1 → has H2
      expect(result[1]?.hasChildren).toBe(true); // H2 → has H3
      expect(result[2]?.hasChildren).toBe(true); // H3 → has H4
      expect(result[3]?.hasChildren).toBe(false); // H4 → leaf
    });

    // hasChildren stops at next same-or-higher heading
    it('H2 is NOT a parent if next entry is a sibling H2', () => {
      const doc = makeDoc([
        makeHeading(1, 'S1', 20),
        makeHeading(2, 'S1.1', 20),
        makeHeading(2, 'S1.2', 20), // sibling, not child
        makeHeading(3, 'S1.2.1', 20), // child of S1.2, not S1.1
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[1]?.hasChildren).toBe(false); // S1.1 has no children before S1.2
      expect(result[2]?.hasChildren).toBe(true); // S1.2 has S1.2.1 as child
    });

    // hasChildren with H5/H6 levels
    it('H4 with H5 child → hasChildren: true', () => {
      const doc = makeDoc([
        makeHeading(1, 'S1', 20),
        makeHeading(4, 'Deep', 20),
        makeHeading(5, 'Deeper', 20),
        makeHeading(6, 'Deepest', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[1]?.hasChildren).toBe(true); // H4 has H5
      expect(result[2]?.hasChildren).toBe(true); // H5 has H6
      expect(result[3]?.hasChildren).toBe(false); // H6 leaf
    });
  });

  // ---------------------------------------------------------------------------
  // Standard contract structure tests (no level-shifting)
  // ---------------------------------------------------------------------------
  describe('standard document structures', () => {
    // 1. Standard contract: title node + H1 sections + H2 clauses
    it('standard contract: title node + H1 sections + H2 clauses', () => {
      const doc = makeDoc([
        makeTitle('Master Services Agreement', 20),
        makeHeading(1, 'Purpose', 20),
        makeHeading(2, 'Clause A', 20),
        makeHeading(2, 'Clause B', 20),
        makeHeading(1, 'Services', 20),
        makeHeading(2, 'Clause C', 20),
        makeHeading(2, 'Clause D', 20),
        makeHeading(1, 'Term', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(8);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      expect(result[1]?.text).toBe('Purpose');
      expect(result[1]?.number).toBe('1.');
      expect(result[2]?.text).toBe('Clause A');
      expect(result[2]?.number).toBe('1.1');
      expect(result[3]?.text).toBe('Clause B');
      expect(result[3]?.number).toBe('1.2');
      expect(result[4]?.text).toBe('Services');
      expect(result[4]?.number).toBe('2.');
      expect(result[5]?.text).toBe('Clause C');
      expect(result[5]?.number).toBe('2.1');
      expect(result[6]?.text).toBe('Clause D');
      expect(result[6]?.number).toBe('2.2');
      expect(result[7]?.text).toBe('Term');
      expect(result[7]?.number).toBe('3.');
    });

    // 2. Deep contract: title node + H1 + H2 + H3 sub-clauses
    it('deep contract: title node + H1 + H2 + H3 sub-clauses', () => {
      const doc = makeDoc([
        makeTitle('Engagement Letter', 20),
        makeHeading(1, 'Definitions', 20),
        makeHeading(2, 'General Terms', 20),
        makeHeading(3, 'Interpretation rules', 20),
        makeHeading(3, 'Currency conventions', 20),
        makeHeading(2, 'Specific Terms', 20),
        makeHeading(1, 'Obligations', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(7);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      expect(result[1]?.text).toBe('Definitions');
      expect(result[1]?.number).toBe('1.');
      expect(result[2]?.text).toBe('General Terms');
      expect(result[2]?.number).toBe('1.1');
      expect(result[3]?.text).toBe('Interpretation rules');
      expect(result[3]?.number).toBe('1.1.1');
      expect(result[4]?.text).toBe('Currency conventions');
      expect(result[4]?.number).toBe('1.1.2');
      expect(result[5]?.text).toBe('Specific Terms');
      expect(result[5]?.number).toBe('1.2');
      expect(result[6]?.text).toBe('Obligations');
      expect(result[6]?.number).toBe('2.');
    });

    // 3. No title node: H1 sections numbered from 1.
    it('no title node: H1 sections numbered from 1.', () => {
      const doc = makeDoc([makeHeading(1, 'Background', 20), makeHeading(1, 'Scope', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(2);
      expect(result[0]?.isTitle).toBe(false);
      expect(result[0]?.number).toBe('1.');
      expect(result[1]?.isTitle).toBe(false);
      expect(result[1]?.number).toBe('2.');
    });

    // 4. No title node: H2 sections with no H1 — number as 0.1, 0.2, ...
    it('no title node: H2 sections with no H1 number as subsections under implicit H1=0', () => {
      const doc = makeDoc([makeHeading(2, 'Background', 20), makeHeading(2, 'Scope', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(2);
      expect(result[0]?.isTitle).toBe(false);
      expect(result[0]?.number).toBe('0.1');
      expect(result[1]?.isTitle).toBe(false);
      expect(result[1]?.number).toBe('0.2');
    });

    // 5. Single title node: just title, no numbered content
    it('single title node: just title, no numbered content', () => {
      const doc = makeDoc([makeTitle('Non-Disclosure Agreement', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(1);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
    });

    // 6. Title + H1 + H2 subsections
    it('title + H1 sections + H2 subsections', () => {
      const doc = makeDoc([
        makeTitle('Annual Report', 20),
        makeHeading(1, 'Part I', 20),
        makeHeading(2, 'Chapter 1', 20),
        makeHeading(1, 'Part II', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(4);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      expect(result[1]?.text).toBe('Part I');
      expect(result[1]?.number).toBe('1.');
      expect(result[2]?.text).toBe('Chapter 1');
      expect(result[2]?.number).toBe('1.1');
      expect(result[3]?.text).toBe('Part II');
      expect(result[3]?.number).toBe('2.');
    });
  });
});
