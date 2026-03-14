export interface SuggestionAnchor {
  suggestionId: string;
  from: number;
  to: number;
  type: 'insert' | 'delete';
  originalText: string;
  replacementText: string | null;
  authorEmail: string;
}

/**
 * Resolve suggestion data into positioned anchors, clamping to document bounds.
 */
export function resolveSuggestionAnchors(
  suggestions: {
    id: string;
    type: 'insert' | 'delete';
    anchorFrom: string;
    anchorTo: string;
    originalText: string;
    replacementText: string | null;
    authorEmail: string;
  }[],
  docSize: number,
): SuggestionAnchor[] {
  const anchors: SuggestionAnchor[] = [];

  for (const s of suggestions) {
    const rawFrom = parseInt(s.anchorFrom, 10);
    const rawTo = parseInt(s.anchorTo, 10);

    // Skip invalid anchors
    if (isNaN(rawFrom) || isNaN(rawTo)) continue;
    if (rawFrom < 0 && rawTo < 0) continue;

    // Clamp to doc bounds
    const from = Math.max(0, Math.min(rawFrom, docSize));
    const to = Math.max(0, Math.min(rawTo, docSize));

    // Ensure from <= to
    const resolvedFrom = Math.min(from, to);
    const resolvedTo = Math.max(from, to);

    anchors.push({
      suggestionId: s.id,
      from: resolvedFrom,
      to: resolvedTo,
      type: s.type,
      originalText: s.originalText,
      replacementText: s.replacementText,
      authorEmail: s.authorEmail,
    });
  }

  return anchors;
}
