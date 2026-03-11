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

  // 2. Single H1 heading → treated as title (number "")
  it('single H1 heading → treated as title with empty number', () => {
    const doc = makeDoc([makeHeading(1, 'Introduction', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[0]?.level).toBe(1);
    expect(result[0]?.text).toBe('Introduction');
  });

  // 3. Multiple H1 headings → first is title, rest sequential "1.", "2."
  it('multiple H1 headings → first is title, rest number sequentially', () => {
    const doc = makeDoc([
      makeHeading(1, 'Alpha', 20),
      makeHeading(1, 'Beta', 20),
      makeHeading(1, 'Gamma', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('2.');
  });

  // 4. H1 + H2 hierarchy → title gets '', second H1 gets "1.", H2s get "1.1", "1.2"
  it('H1 + H2 hierarchy: first H1 is title, subsequent H1 numbers correctly', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // 5. Full H1-H4 hierarchy (with title H1 + numbered section H1)
  it('full H1-H4 hierarchy produces correct numbers', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // 6. Multiple sections with mixed levels (title H1 + two numbered H1 sections)
  it('multiple sections with mixed levels', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // 7. H3 without parent H2 → still numbers correctly using last known parent
  it('H3 without parent H2 still numbers correctly', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // 8. endPos calculation: section ends at next same-or-higher heading
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

  // 9. endPos for last heading: ends at doc end (nodeSize - 1)
  it('endPos for last heading is doc end', () => {
    // doc nodeSize = 1 (start) + 20 (heading) + 1 (end) = 22
    const doc = makeDoc([makeHeading(1, 'Only', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // doc.nodeSize = 22, last pos = doc.nodeSize - 1 = 21
    expect(result[0]?.endPos).toBe(doc.nodeSize - 1);
  });

  // 10. bodyPreview: first ~50 chars of body text
  it('bodyPreview contains first ~50 chars of body text after heading', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20), makeParagraph('Short paragraph text', 30)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('Short paragraph text');
  });

  // 11. bodyPreview truncation with "..." for long text
  it('bodyPreview truncates long text with ellipsis', () => {
    const longText = 'A'.repeat(80);
    const doc = makeDoc([makeHeading(1, 'Section', 20), makeParagraph(longText, 90)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('A'.repeat(50) + '...');
  });

  // 12. Empty bodyPreview when heading has no body text
  it('bodyPreview is empty string when heading has no body', () => {
    const doc = makeDoc([makeHeading(1, 'Only heading', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.bodyPreview).toBe('');
  });

  // 13. Headings deeper than H4 are ignored
  it('headings deeper than H4 are ignored', () => {
    const doc = makeDoc([
      makeHeading(1, 'H1', 20),
      makeHeading(5, 'H5', 20),
      makeHeading(6, 'H6', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.level).toBe(1);
  });

  // 14. Only heading nodes are extracted; paragraphs etc. are skipped
  it('only heading nodes are extracted', () => {
    const doc = makeDoc([
      makeParagraph('intro paragraph', 25),
      makeHeading(1, 'Section', 20),
      makeParagraph('body paragraph', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('Section');
  });

  // 15. Memoization: same doc reference returns same array instance
  it('same doc reference returns same result (referential equality)', () => {
    const doc = makeDoc([makeHeading(1, 'Section', 20)]);
    const proseMirrorDoc = doc as unknown as import('@milkdown/kit/prose/model').Node;
    const result1 = extractHeadingTree(proseMirrorDoc);
    const result2 = extractHeadingTree(proseMirrorDoc);
    expect(result1).toBe(result2);
  });

  // Extra: pos field is correct for each heading
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

  // Extra: H4 sequential numbering under same H3
  it('multiple H4 entries under same H3 number sequentially', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // Extra: H3 decimal counter resets when H2 changes
  it('H3 decimal counter resets when parent H2 changes', () => {
    const doc = makeDoc([
      makeHeading(1, 'Title', 20),
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

  // Extra: text field matches the heading's textContent
  it('text field matches heading textContent', () => {
    const doc = makeDoc([makeHeading(2, 'My Heading Text', 20)]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result[0]?.text).toBe('My Heading Text');
  });

  // Extra: HeadingEntry type shape
  it('each HeadingEntry has the correct shape', () => {
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
  });

  // Title skip: first H1 is treated as title
  it('first H1 is treated as title with empty number and isTitle true', () => {
    const doc = makeDoc([
      makeHeading(1, 'My Agreement', 20),
      makeHeading(1, 'Definitions', 20),
      makeHeading(2, 'General', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.number).toBe('');
    expect(result[0]?.isTitle).toBe(true);
    // Second H1 starts numbering from 1.
    expect(result[1]?.number).toBe('1.');
    expect(result[1]?.isTitle).toBe(false);
    expect(result[2]?.number).toBe('1.1');
    expect(result[2]?.isTitle).toBe(false);
  });

  // Title skip: subsequent H1s after title still number from 1.
  it('subsequent H1s after title still number from 1.', () => {
    const doc = makeDoc([
      makeHeading(1, 'Contract Title', 20),
      makeHeading(1, 'Section A', 20),
      makeHeading(1, 'Section B', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.isTitle).toBe(true);
    expect(result[0]?.number).toBe('');
    expect(result[1]?.number).toBe('1.');
    expect(result[2]?.number).toBe('2.');
  });

  // Title skip: if first heading is H2, no title treatment
  it('first heading that is H2 (not H1) is NOT treated as title', () => {
    const doc = makeDoc([
      makeHeading(2, 'Subsection First', 20),
      makeHeading(1, 'Main Section', 20),
    ]);
    const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(2);
    expect(result[0]?.isTitle).toBe(false);
    expect(result[0]?.number).toBe('0.1'); // H2 before any H1 → h1=0, h2=1
    expect(result[1]?.isTitle).toBe(false);
    expect(result[1]?.number).toBe('1.');
  });

  // ---------------------------------------------------------------------------
  // Real document structures — title-aware level shifting
  // ---------------------------------------------------------------------------
  describe('real document structures', () => {
    // 1. Standard contract: title H1, H2 sections, H3 clauses
    // When a title H1 exists and no further H1s appear, H2s should shift
    // down and number as H1 (1., 2., 3.) and H3s as H2 (1.1, 1.2, etc.)
    it('standard contract: title + H2 sections + H3 clauses', () => {
      const doc = makeDoc([
        makeHeading(1, 'Master Services Agreement', 20),
        makeHeading(2, 'Purpose', 20),
        makeHeading(3, 'Clause A', 20),
        makeHeading(3, 'Clause B', 20),
        makeHeading(2, 'Services', 20),
        makeHeading(3, 'Clause C', 20),
        makeHeading(3, 'Clause D', 20),
        makeHeading(2, 'Term', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(8);
      // Title H1 → no number
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      // H2s shift to act as H1-level numbered sections
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

    // 2. Deep contract: title + H2 + H3 + H4 sub-clauses
    // All levels shift down by 1 when a title H1 is present and no further H1s exist
    it('deep contract: title + H2 + H3 + H4 sub-clauses', () => {
      const doc = makeDoc([
        makeHeading(1, 'Engagement Letter', 20),
        makeHeading(2, 'Definitions', 20),
        makeHeading(3, 'General Terms', 20),
        makeHeading(4, 'Interpretation rules', 20),
        makeHeading(4, 'Currency conventions', 20),
        makeHeading(3, 'Specific Terms', 20),
        makeHeading(2, 'Obligations', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(7);
      // Title H1
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      // H2 → numbers as top-level section
      expect(result[1]?.text).toBe('Definitions');
      expect(result[1]?.number).toBe('1.');
      // H3 → numbers as second-level
      expect(result[2]?.text).toBe('General Terms');
      expect(result[2]?.number).toBe('1.1');
      // H4 → numbers as third-level
      expect(result[3]?.text).toBe('Interpretation rules');
      expect(result[3]?.number).toBe('1.1.1');
      expect(result[4]?.text).toBe('Currency conventions');
      expect(result[4]?.number).toBe('1.1.2');
      // H3 sibling
      expect(result[5]?.text).toBe('Specific Terms');
      expect(result[5]?.number).toBe('1.2');
      // Second H2 section
      expect(result[6]?.text).toBe('Obligations');
      expect(result[6]?.number).toBe('2.');
    });

    // 3. No-title doc: H2 sections with no H1 — no shifting, H2s number as subsections
    // When there is no title H1 at all, H2s behave as before (0.1, 0.2, …)
    it('no-title doc: H2 sections number as subsections under implicit H1=0', () => {
      const doc = makeDoc([makeHeading(2, 'Background', 20), makeHeading(2, 'Scope', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(2);
      // No title treatment — first heading is H2, not H1
      expect(result[0]?.isTitle).toBe(false);
      expect(result[0]?.number).toBe('0.1');
      expect(result[1]?.isTitle).toBe(false);
      expect(result[1]?.number).toBe('0.2');
    });

    // 4. Mixed: title H1, then H1 sections, then H2 subsections
    // When subsequent H1s exist after the title, shifting does NOT apply;
    // H1s number normally (1., 2.) and H2s nest under them (1.1)
    it('mixed: title + H1 sections + H2 subsections', () => {
      const doc = makeDoc([
        makeHeading(1, 'Annual Report', 20),
        makeHeading(1, 'Part I', 20),
        makeHeading(2, 'Chapter 1', 20),
        makeHeading(1, 'Part II', 20),
      ]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(4);
      // Title H1
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
      // Subsequent H1s number normally (no shifting — other H1s are present)
      expect(result[1]?.text).toBe('Part I');
      expect(result[1]?.number).toBe('1.');
      expect(result[2]?.text).toBe('Chapter 1');
      expect(result[2]?.number).toBe('1.1');
      expect(result[3]?.text).toBe('Part II');
      expect(result[3]?.number).toBe('2.');
    });

    // 5. Single title heading: just one H1, no other content
    // The lone H1 is the title; result has one entry with isTitle=true and number=''
    it('single title heading: just title, no numbered content', () => {
      const doc = makeDoc([makeHeading(1, 'Non-Disclosure Agreement', 20)]);
      const result = extractHeadingTree(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(1);
      expect(result[0]?.isTitle).toBe(true);
      expect(result[0]?.number).toBe('');
    });
  });
});
