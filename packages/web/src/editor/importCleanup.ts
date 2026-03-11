import type { Node } from '@milkdown/kit/prose/model';

export type Confidence = 'high' | 'medium' | 'low';

export interface DetectedConversion {
  /** ProseMirror position of the paragraph node */
  pos: number;
  /** Original paragraph text */
  originalText: string;
  /** Proposed heading level (1-4) */
  headingLevel: number;
  /** Text after stripping the number prefix */
  cleanedText: string;
  /** Detection confidence */
  confidence: Confidence;
  /** Which pattern matched */
  pattern: string;
  /** Whether this conversion is selected (default: high/medium = true, low = false) */
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Minimal doc-like interface (avoids ProseMirror import at runtime in tests)
// ---------------------------------------------------------------------------

interface NodeLike {
  type: { name: string };
  textContent: string;
  nodeSize: number;
}

interface DocLike {
  forEach: (cb: (node: NodeLike, offset: number, index: number) => void) => void;
}

// ---------------------------------------------------------------------------
// Detection patterns (in priority order)
// ---------------------------------------------------------------------------

interface PatternDef {
  regex: RegExp;
  headingLevel: number;
  confidence: Confidence;
  pattern: string;
  /**
   * Extracts the cleaned text by stripping the matched prefix.
   * Receives the full text and the match result.
   */
  clean: (text: string, match: RegExpMatchArray) => string;
}

const PATTERNS: PatternDef[] = [
  // 1. Article [IVX]+ or Article \d+
  {
    regex: /^Article\s+([IVX]+|\d+)\s*/,
    headingLevel: 1,
    confidence: 'high',
    pattern: 'article',
    clean: (text, match) => {
      const remaining = text.slice(match[0].length).trim();
      return remaining.length > 0 ? remaining : text.trim();
    },
  },
  // 2. Section \d+
  {
    regex: /^Section\s+\d+\s*/,
    headingLevel: 1,
    confidence: 'high',
    pattern: 'section',
    clean: (text, match) => {
      const remaining = text.slice(match[0].length).trim();
      return remaining.length > 0 ? remaining : text.trim();
    },
  },
  // 3. \d+\.\d+\.\d+\s — must come before h2 to avoid false match
  {
    regex: /^\d+\.\d+\.\d+\s/,
    headingLevel: 3,
    confidence: 'high',
    pattern: 'numbered-h3',
    clean: (text, match) => text.slice(match[0].length),
  },
  // 4. \d+\.\d+\s
  {
    regex: /^\d+\.\d+\s/,
    headingLevel: 2,
    confidence: 'high',
    pattern: 'numbered-h2',
    clean: (text, match) => text.slice(match[0].length),
  },
  // 5. ^\d+\.\s
  {
    regex: /^\d+\.\s/,
    headingLevel: 1,
    confidence: 'high',
    pattern: 'numbered-h1',
    clean: (text, match) => text.slice(match[0].length),
  },
  // 6. ^\([a-z]\)\s
  {
    regex: /^\([a-z]\)\s/,
    headingLevel: 3,
    confidence: 'medium',
    pattern: 'letter-paren',
    clean: (text, match) => text.slice(match[0].length),
  },
  // 7. ^[a-z]\.\s
  {
    regex: /^[a-z]\.\s/,
    headingLevel: 3,
    confidence: 'low',
    pattern: 'letter-dot',
    clean: (text, match) => text.slice(match[0].length),
  },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Detects legal numbering patterns in paragraph text.
 * Returns null if no pattern matches.
 */
export function detectNumberingPattern(text: string): {
  headingLevel: number;
  cleanedText: string;
  confidence: Confidence;
  pattern: string;
} | null {
  for (const def of PATTERNS) {
    const match = text.match(def.regex);
    if (match === null) continue;

    const cleanedText = def.clean(text, match);

    // Reduce confidence for long text (>200 chars)
    let confidence = def.confidence;
    if (text.length > 200) {
      if (confidence === 'high') {
        confidence = 'medium';
      } else if (confidence === 'medium') {
        confidence = 'low';
      }
      // low stays low
    }

    return {
      headingLevel: def.headingLevel,
      cleanedText,
      confidence,
      pattern: def.pattern,
    };
  }

  return null;
}

/**
 * Scans a ProseMirror doc for paragraphs that look like legal headings.
 * Returns detected conversions sorted by position.
 */
export function scanForConversions(doc: Node): DetectedConversion[] {
  const docLike = doc as unknown as DocLike;
  const results: DetectedConversion[] = [];

  docLike.forEach((node, offset) => {
    if (node.type.name !== 'paragraph') return;

    const text = node.textContent;
    const detected = detectNumberingPattern(text);
    if (detected === null) return;

    results.push({
      pos: offset,
      originalText: text,
      headingLevel: detected.headingLevel,
      cleanedText: detected.cleanedText,
      confidence: detected.confidence,
      pattern: detected.pattern,
      selected: detected.confidence !== 'low',
    });
  });

  // Sort by position (ascending)
  results.sort((a, b) => a.pos - b.pos);

  return results;
}
