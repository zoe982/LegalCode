import { useState, useEffect, useCallback, useRef } from 'react';

export interface CommentPosition {
  commentId: string;
  top: number;
}

const CARD_MIN_HEIGHT = 80;
const CARD_GAP = 8;

export function useCommentPositions(
  containerRef: React.RefObject<HTMLElement | null>,
  commentIds: string[],
): CommentPosition[] {
  const [positions, setPositions] = useState<CommentPosition[]>([]);

  // Stabilize commentIds to avoid infinite re-render loop
  const commentIdsKey = commentIds.join(',');
  const stableCommentIds = useRef(commentIds);
  stableCommentIds.current = commentIds;

  const calculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setPositions([]);
      return;
    }

    const ids = stableCommentIds.current;
    if (ids.length === 0) {
      setPositions([]);
      return;
    }

    const rawPositions: CommentPosition[] = [];

    for (const commentId of ids) {
      const mark = container.querySelector<HTMLElement>(`mark[data-comment-id="${commentId}"]`);
      if (!mark) continue;

      rawPositions.push({
        commentId,
        top: mark.offsetTop,
      });
    }

    // Sort by top position
    rawPositions.sort((a, b) => a.top - b.top);

    // Collision resolution: ensure minimum gap between cards
    const resolved: CommentPosition[] = [];
    for (const pos of rawPositions) {
      const prev = resolved.length > 0 ? resolved[resolved.length - 1] : undefined;
      if (prev != null) {
        const minTop = prev.top + CARD_MIN_HEIGHT + CARD_GAP;
        resolved.push({
          commentId: pos.commentId,
          top: Math.max(pos.top, minTop),
        });
      } else {
        resolved.push(pos);
      }
    }

    setPositions(resolved);
  }, [containerRef, commentIdsKey]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      calculate();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, calculate]);

  return positions;
}
