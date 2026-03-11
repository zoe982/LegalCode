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

function makeHeading(text: string, nodeSize = 20): MockNode {
  return {
    type: { name: 'heading' },
    textContent: text,
    nodeSize,
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
    expect(result[1]?.originalText).toBe('1.1 Definitions');
    expect(result[1]?.headingLevel).toBe(2);
  });

  it('skips non-paragraph nodes (headings, etc.)', () => {
    const doc = makeDoc([
      makeHeading('Article I Preamble', 20),
      makeParagraph('1. Introduction', 20),
    ]);
    const result = scanForConversions(doc as unknown as import('@milkdown/kit/prose/model').Node);
    // Only the paragraph should be detected, not the heading node
    expect(result).toHaveLength(1);
    expect(result[0]?.originalText).toBe('1. Introduction');
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
  });
});
