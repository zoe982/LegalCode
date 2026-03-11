import { useState, useEffect, useCallback, useRef } from 'react';

export interface CommentPosition {
  commentId: string;
  top: number;
}

const CARD_MIN_HEIGHT = 320;
const CARD_GAP = 12;

export function useCommentPositions(
  containerRef: React.RefObject<HTMLElement | null>,
  commentIds: string[],
  cardHeights: Map<string, number>,
): CommentPosition[] {
  const [positions, setPositions] = useState<CommentPosition[]>([]);

  // Stabilize commentIds to avoid infinite re-render loop
  const commentIdsKey = commentIds.join(',');
  const stableCommentIds = useRef(commentIds);
  stableCommentIds.current = commentIds;

  // Stabilize cardHeights similarly
  const cardHeightsKey = Array.from(cardHeights.entries())
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(',');
  const stableCardHeights = useRef(cardHeights);
  stableCardHeights.current = cardHeights;

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
      const element = container.querySelector<HTMLElement>(`[data-comment-id="${commentId}"]`);
      if (!element) continue;

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = elementRect.top - containerRect.top + container.scrollTop;

      rawPositions.push({
        commentId,
        top,
      });
    }

    // Sort by top position
    rawPositions.sort((a, b) => a.top - b.top);

    // Collision resolution: ensure minimum gap between cards
    const heights = stableCardHeights.current;
    const resolved: CommentPosition[] = [];
    for (const pos of rawPositions) {
      const prev = resolved.length > 0 ? resolved[resolved.length - 1] : undefined;
      if (prev != null) {
        const prevHeight = heights.get(prev.commentId) ?? CARD_MIN_HEIGHT;
        const minTop = prev.top + prevHeight + CARD_GAP;
        resolved.push({
          commentId: pos.commentId,
          top: Math.max(pos.top, minTop),
        });
      } else {
        resolved.push(pos);
      }
    }

    setPositions(resolved);
  }, [containerRef, commentIdsKey, cardHeightsKey]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      calculate();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-comment-id'],
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef, calculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find nearest scrollable ancestor
    let scrollParent: HTMLElement | null = container.parentElement;
    while (scrollParent) {
      const overflow = window.getComputedStyle(scrollParent).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }

    if (!scrollParent) return;

    const onScroll = () => {
      calculate();
    };

    scrollParent.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, calculate]);

  return positions;
}
