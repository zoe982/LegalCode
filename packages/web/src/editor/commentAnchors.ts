import type { CommentAnchor } from './commentPlugin.js';

export interface CapturedAnchor {
  anchorText: string;
  anchorFrom: string;
  anchorTo: string;
}

/**
 * Capture selection as serialized anchors.
 * Uses document position offsets serialized as strings.
 * In a full Yjs integration, these would be RelativePositions.
 */
export function captureSelection(from: number, to: number, text: string): CapturedAnchor {
  return {
    anchorText: text.slice(0, 500), // Truncate to match schema max
    anchorFrom: String(from),
    anchorTo: String(to),
  };
}

/**
 * Resolve stored anchors to document positions for decorations.
 */
export function resolveAnchors(
  comments: {
    id: string;
    anchorFrom: string | null;
    anchorTo: string | null;
    resolved: boolean;
  }[],
  docSize: number,
): CommentAnchor[] {
  const anchors: CommentAnchor[] = [];

  for (const comment of comments) {
    if (comment.anchorFrom == null || comment.anchorTo == null) continue;

    const from = parseInt(comment.anchorFrom, 10);
    const to = parseInt(comment.anchorTo, 10);

    if (isNaN(from) || isNaN(to)) continue;
    if (from < 0 || to > docSize || from >= to) continue;

    anchors.push({
      commentId: comment.id,
      from,
      to,
      resolved: comment.resolved,
    });
  }

  return anchors;
}
