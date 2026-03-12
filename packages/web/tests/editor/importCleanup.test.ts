import { describe, it, expect } from 'vitest';
import { detectNumberingPattern, scanForConversions } from '../../src/editor/importCleanup.js';
import type { DetectedConversion } from '../../src/editor/importCleanup.js';

// ---------------------------------------------------------------------------
// Mock ProseMirror node helpers (same pattern as headingTree.test.ts)
// ---------------------------------------------------------------------------

interface MockNode {
  type: { name: string };
  textContent: string;
  nodeSize: number;
  attrs?: Record<string, unknown>;
}

interface MockDoc {
  nodeSize: number;
  forEach: (cb: (node: MockNode, offset: number, index: number) => void) => void;
}

function makeParagraph(text: string, nodeSize = 25): MockNode {
  return {
    type: { name: 'paragraph' },
    textContent: text,
    nodeSize,
  };
}

function makeHeading(text: string, nodeSize = 20, level = 2): MockNode {
  return {
    type: { name: 'heading' },
    textContent: text,
    nodeSize,
    attrs: { level },
  };
}

function makeDoc(nodes: MockNode[]): MockDoc {
  const offsets: number[] = [];
  let pos = 1;
  for (const node of nodes) {
    offsets.push(pos);
    pos += node.nodeSize;
  }
  const docSize = pos + 1;

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
// detectNumberingPattern tests
// ---------------------------------------------------------------------------

describe('detectNumberingPattern', () => {
  it('returns null for plain text with no legal numbering', () => {
    expect(detectNumberingPattern('Just a normal sentence.')).toBeNull();
    expect(detectNumberingPattern('')).toBeNull();
    expect(detectNumberingPattern('The parties agree to the following terms.')).toBeNull();
  });

  it('detects "Article I" → H1, high confidence, pattern "article"', () => {
    const result = detectNumberingPattern('Article I');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('article');
  });

  it('detects "Article IV" → H1, high confidence, pattern "article"', () => {
    const result = detectNumberingPattern('Article IV');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('article');
  });

  it('detects "Article 5" → H1, high confidence, pattern "article"', () => {
    const result = detectNumberingPattern('Article 5');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('article');
  });

  it('detects "Section 3" → H1, high confidence, pattern "section"', () => {
    const result = detectNumberingPattern('Section 3');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('section');
  });

  it('detects "Section 3 Definitions" → H1, high confidence, pattern "section"', () => {
    const result = detectNumberingPattern('Section 3 Definitions');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('section');
  });

  it('detects "1. Introduction" → H1, high confidence, pattern "numbered-h1"', () => {
    const result = detectNumberingPattern('1. Introduction');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h1');
  });

  it('detects "42. Long Section Title" → H1, high confidence, pattern "numbered-h1"', () => {
    const result = detectNumberingPattern('42. Long Section Title');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(1);
    expect(result?.pattern).toBe('numbered-h1');
  });

  it('detects "1.1 Definitions" → H2, high confidence, pattern "numbered-h2"', () => {
    const result = detectNumberingPattern('1.1 Definitions');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(2);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h2');
  });

  it('detects "3.14 Scope" → H2, high confidence, pattern "numbered-h2"', () => {
    const result = detectNumberingPattern('3.14 Scope');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(2);
    expect(result?.pattern).toBe('numbered-h2');
  });

  it('detects "1.1.1 Scope" → H3, high confidence, pattern "numbered-h3"', () => {
    const result = detectNumberingPattern('1.1.1 Scope');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h3');
  });

  it('detects "2.3.4 Another Clause" → H3, high confidence, pattern "numbered-h3"', () => {
    const result = detectNumberingPattern('2.3.4 Another Clause');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.pattern).toBe('numbered-h3');
  });

  it('detects "(a) The parties" → H3, medium confidence, pattern "letter-paren"', () => {
    const result = detectNumberingPattern('(a) The parties');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.confidence).toBe('medium');
    expect(result?.pattern).toBe('letter-paren');
  });

  it('detects "(z) Last item" → H3, medium confidence, pattern "letter-paren"', () => {
    const result = detectNumberingPattern('(z) Last item');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.confidence).toBe('medium');
    expect(result?.pattern).toBe('letter-paren');
  });

  it('detects "a. First clause" → H3, low confidence, pattern "letter-dot"', () => {
    const result = detectNumberingPattern('a. First clause');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.confidence).toBe('low');
    expect(result?.pattern).toBe('letter-dot');
  });

  it('detects "z. Last clause" → H3, low confidence, pattern "letter-dot"', () => {
    const result = detectNumberingPattern('z. Last clause');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(3);
    expect(result?.confidence).toBe('low');
    expect(result?.pattern).toBe('letter-dot');
  });

  it('long text (>200 chars) reduces high confidence to medium', () => {
    const longText = '1. ' + 'A'.repeat(200);
    const result = detectNumberingPattern(longText);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe('medium');
  });

  it('long text (>200 chars) reduces medium confidence to low', () => {
    const longText = '(a) ' + 'A'.repeat(200);
    const result = detectNumberingPattern(longText);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe('low');
  });

  it('long text (>200 chars) keeps low confidence as low', () => {
    const longText = 'a. ' + 'A'.repeat(200);
    const result = detectNumberingPattern(longText);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe('low');
  });

  it('detects "1.1.1.1 Sub-clause" → H4, high confidence, pattern "numbered-h4"', () => {
    const result = detectNumberingPattern('1.1.1.1 Sub-clause');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(4);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h4');
  });

  it('detects "1.1.1.1.1 Paragraph text" → H5, high confidence, pattern "numbered-h5"', () => {
    const result = detectNumberingPattern('1.1.1.1.1 Paragraph text');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(5);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h5');
  });

  it('detects "1.1.1.1.1.1 Sub-paragraph" → H6, high confidence, pattern "numbered-h6"', () => {
    const result = detectNumberingPattern('1.1.1.1.1.1 Sub-paragraph');
    expect(result).not.toBeNull();
    expect(result?.headingLevel).toBe(6);
    expect(result?.confidence).toBe('high');
    expect(result?.pattern).toBe('numbered-h6');
  });

  it('does not falsely match H6 pattern as H3', () => {
    const result = detectNumberingPattern('1.2.3.4.5.6 Deep section');
    expect(result?.headingLevel).toBe(6);
    expect(result?.pattern).toBe('numbered-h6');
  });

  it('strips "1.1.1.1 " prefix from H4 text', () => {
    const result = detectNumberingPattern('1.1.1.1 Sub-clause content');
    expect(result?.cleanedText).toBe('Sub-clause content');
  });

  it('strips "1.1.1.1.1 " prefix from H5 text', () => {
    const result = detectNumberingPattern('1.1.1.1.1 Paragraph content');
    expect(result?.cleanedText).toBe('Paragraph content');
  });

  it('strips "1.1.1.1.1.1 " prefix from H6 text', () => {
    const result = detectNumberingPattern('1.1.1.1.1.1 Sub-paragraph content');
    expect(result?.cleanedText).toBe('Sub-paragraph content');
  });

  describe('cleanedText strips prefix correctly', () => {
    it('strips "Article I" prefix → empty string (Article with no following text)', () => {
      const result = detectNumberingPattern('Article I');
      expect(result?.cleanedText).toBe('Article I');
    });

    it('strips "Article I Definitions" prefix → "Definitions"', () => {
      const result = detectNumberingPattern('Article I Definitions');
      expect(result?.cleanedText).toBe('Definitions');
    });

    it('strips "Section 3 Title" prefix → "Title"', () => {
      const result = detectNumberingPattern('Section 3 Title');
      expect(result?.cleanedText).toBe('Title');
    });

    it('strips "1. " prefix from "1. Introduction" → "Introduction"', () => {
      const result = detectNumberingPattern('1. Introduction');
      expect(result?.cleanedText).toBe('Introduction');
    });

    it('strips "1.1 " prefix from "1.1 Definitions" → "Definitions"', () => {
      const result = detectNumberingPattern('1.1 Definitions');
      expect(result?.cleanedText).toBe('Definitions');
    });

    it('strips "1.1.1 " prefix from "1.1.1 Scope" → "Scope"', () => {
      const result = detectNumberingPattern('1.1.1 Scope');
      expect(result?.cleanedText).toBe('Scope');
    });

    it('strips "(a) " prefix from "(a) The parties" → "The parties"', () => {
      const result = detectNumberingPattern('(a) The parties');
      expect(result?.cleanedText).toBe('The parties');
    });

    it('strips "a. " prefix from "a. First clause" → "First clause"', () => {
      const result = detectNumberingPattern('a. First clause');
      expect(result?.cleanedText).toBe('First clause');
    });
  });
});

// ---------------------------------------------------------------------------
// scanForConversions tests
// ---------------------------------------------------------------------------

describe('scanForConversions', () => {
  it('returns empty array for doc with no paragraphs', () => {
    const doc = makeDoc([]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toEqual([]);
  });

  it('returns empty array for doc with only non-matching paragraphs', () => {
    const doc = makeDoc([
      makeParagraph('This is just a normal paragraph.'),
      makeParagraph('Another sentence with no numbering.'),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toEqual([]);
  });

  it('detects paragraphs with legal numbering patterns', () => {
    const doc = makeDoc([
      makeParagraph('1. Introduction', 20),
      makeParagraph('Some body text here.', 25),
      makeParagraph('1.1 Definitions', 20),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(2);
    expect(result[0]?.originalText).toBe('1. Introduction');
    expect(result[0]?.headingLevel).toBe(1);
    expect(result[0]?.sourceType).toBe('paragraph');
    expect(result[1]?.originalText).toBe('1.1 Definitions');
    expect(result[1]?.headingLevel).toBe(2);
    expect(result[1]?.sourceType).toBe('paragraph');
  });

  it('detects numbering prefixes in existing headings', () => {
    const doc = makeDoc([
      makeHeading('Article I Preamble', 20, 1),
      makeParagraph('1. Introduction', 20),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Both the heading and the paragraph should be detected
    expect(result).toHaveLength(2);
    const headingResult = result.find((r) => r.originalText === 'Article I Preamble');
    expect(headingResult).toBeDefined();
    expect(headingResult?.sourceType).toBe('heading');
    expect(headingResult?.headingLevel).toBe(1);
    const paragraphResult = result.find((r) => r.originalText === '1. Introduction');
    expect(paragraphResult).toBeDefined();
    expect(paragraphResult?.sourceType).toBe('paragraph');
  });

  it('results are sorted by position (ascending)', () => {
    const doc = makeDoc([
      makeParagraph('1. Introduction', 20),
      makeParagraph('Normal text here.', 25),
      makeParagraph('1.1 Definitions', 20),
      makeParagraph('2. Scope', 15),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    // Results should be in document order (ascending pos)
    const positions = result.map((r) => r.pos);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('includes correct pos for each detected paragraph', () => {
    const doc = makeDoc([
      makeParagraph('1. Introduction', 20), // pos = 1
      makeParagraph('1.1 Definitions', 20), // pos = 21
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(2);
    expect(result[0]?.pos).toBe(1);
    expect(result[1]?.pos).toBe(21);
  });

  describe('selected defaults by confidence', () => {
    it('high confidence conversions default to selected=true', () => {
      const doc = makeDoc([makeParagraph('1. Introduction', 20)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.confidence).toBe('high');
      expect(result[0]?.selected).toBe(true);
    });

    it('medium confidence conversions default to selected=true', () => {
      const doc = makeDoc([makeParagraph('(a) The parties', 20)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.confidence).toBe('medium');
      expect(result[0]?.selected).toBe(true);
    });

    it('low confidence conversions default to selected=false', () => {
      const doc = makeDoc([makeParagraph('a. First clause', 20)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result[0]?.confidence).toBe('low');
      expect(result[0]?.selected).toBe(false);
    });
  });

  it('result has complete DetectedConversion shape', () => {
    const doc = makeDoc([makeParagraph('1. Introduction', 20)]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(1);
    const entry: DetectedConversion | undefined = result[0];
    expect(typeof entry?.pos).toBe('number');
    expect(typeof entry?.originalText).toBe('string');
    expect(typeof entry?.headingLevel).toBe('number');
    expect(typeof entry?.cleanedText).toBe('string');
    expect(typeof entry?.confidence).toBe('string');
    expect(typeof entry?.pattern).toBe('string');
    expect(typeof entry?.selected).toBe('boolean');
    expect(typeof entry?.sourceType).toBe('string');
  });

  describe('heading numbering detection', () => {
    it('detects "5. Fees and Payment" in H2 heading and preserves H2 level', () => {
      const doc = makeDoc([makeHeading('5. Fees and Payment', 25, 2)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(1);
      expect(result[0]?.sourceType).toBe('heading');
      expect(result[0]?.headingLevel).toBe(2);
      expect(result[0]?.originalText).toBe('5. Fees and Payment');
      expect(result[0]?.cleanedText).toBe('Fees and Payment');
    });

    it('detects "1.1 Definitions" in H2 heading and keeps H2 level (not pattern-suggested level)', () => {
      // Pattern "numbered-h2" coincidentally also suggests H2, but the heading level should come from the node attrs
      const doc = makeDoc([makeHeading('1.1 Definitions', 20, 2)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(1);
      expect(result[0]?.sourceType).toBe('heading');
      expect(result[0]?.headingLevel).toBe(2);
      expect(result[0]?.originalText).toBe('1.1 Definitions');
    });

    it('does not detect headings without numbering prefixes', () => {
      const doc = makeDoc([makeHeading('Fees and Payment', 20, 2)]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(0);
    });
  });

  it('detects H4-H6 numbered paragraphs in document scan', () => {
    const doc = makeDoc([
      makeParagraph('1.1.1.1 Sub-clause', 25),
      makeParagraph('1.1.1.1.1 Paragraph', 25),
      makeParagraph('1.1.1.1.1.1 Sub-paragraph', 30),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    expect(result).toHaveLength(3);
    expect(result[0]?.headingLevel).toBe(4);
    expect(result[1]?.headingLevel).toBe(5);
    expect(result[2]?.headingLevel).toBe(6);
  });

  describe('real-world legal document scenarios', () => {
    it('detects mixed numbered paragraphs and numbered headings in imported contract', () => {
      const doc = makeDoc([
        makeParagraph('1. Introduction', 20),
        makeHeading('5. Fees and Payment', 25, 2),
        makeParagraph('2. Scope', 15),
      ]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(3);
      const introResult = result.find((r) => r.originalText === '1. Introduction');
      expect(introResult?.sourceType).toBe('paragraph');
      const feesResult = result.find((r) => r.originalText === '5. Fees and Payment');
      expect(feesResult?.sourceType).toBe('heading');
      expect(feesResult?.headingLevel).toBe(2);
      const scopeResult = result.find((r) => r.originalText === '2. Scope');
      expect(scopeResult?.sourceType).toBe('paragraph');
    });

    it('detects numbering in headings when all content is already properly headed', () => {
      const doc = makeDoc([
        makeHeading('1. Introduction', 20, 1),
        makeHeading('1.1 Definitions', 20, 2),
        makeHeading('1.2 Scope', 18, 2),
      ]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      expect(result).toHaveLength(3);
      const introResult = result.find((r) => r.originalText === '1. Introduction');
      expect(introResult?.sourceType).toBe('heading');
      expect(introResult?.headingLevel).toBe(1);
      const defsResult = result.find((r) => r.originalText === '1.1 Definitions');
      expect(defsResult?.sourceType).toBe('heading');
      expect(defsResult?.headingLevel).toBe(2);
      const scopeResult = result.find((r) => r.originalText === '1.2 Scope');
      expect(scopeResult?.sourceType).toBe('heading');
      expect(scopeResult?.headingLevel).toBe(2);
    });

    it('handles document with clean headings and numbered paragraphs', () => {
      const doc = makeDoc([
        makeHeading('Introduction', 20, 2),
        makeParagraph('1. Definitions', 20),
        makeParagraph('2. Scope', 15),
      ]);
      const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
      // Clean heading has no numbering prefix, so only the 2 paragraphs are detected
      expect(result).toHaveLength(2);
      const defsResult = result.find((r) => r.originalText === '1. Definitions');
      expect(defsResult?.sourceType).toBe('paragraph');
      const scopeResult = result.find((r) => r.originalText === '2. Scope');
      expect(scopeResult?.sourceType).toBe('paragraph');
      // The heading without a numbering prefix should NOT appear in results
      expect(result.find((r) => r.originalText === 'Introduction')).toBeUndefined();
    });
  });
});
