import { useEffect, useCallback } from 'react';
import type { CommentThread } from '../types/comments.js';

export function useCommentHighlights(
  containerRef: React.RefObject<HTMLElement | null>,
  threads: CommentThread[],
  onCommentClick: (commentId: string) => void,
): void {
  const handleClick = useCallback(
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.tagName === 'MARK') {
        const commentId = target.getAttribute('data-comment-id');
        if (commentId) {
          onCommentClick(commentId);
        }
      }
    },
    [onCommentClick],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Build a list of anchors to highlight from threads
    const anchors: { id: string; text: string; status: string }[] = [];
    for (const t of threads) {
      const anchorText = t.comment.anchorText;
      if (anchorText != null) {
        anchors.push({
          id: t.comment.id,
          text: anchorText,
          status: t.comment.resolved ? 'resolved' : 'open',
        });
      }
    }

    if (anchors.length === 0) {
      container.addEventListener('click', handleClick);
      return () => {
        container.removeEventListener('click', handleClick);
      };
    }

    // Use TreeWalker to find text nodes and wrap matches
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }

    // Process each anchor against each text node
    for (const anchor of anchors) {
      for (let i = 0; i < textNodes.length; i++) {
        const textNode = textNodes[i];
        if (!textNode?.parentNode) {
          continue;
        }

        const nodeText = textNode.textContent;
        const idx = nodeText.indexOf(anchor.text);
        if (idx === -1) {
          continue;
        }

        // Split the text node and wrap the match
        const before = nodeText.substring(0, idx);
        const after = nodeText.substring(idx + anchor.text.length);

        const mark = document.createElement('mark');
        mark.setAttribute('data-comment-id', anchor.id);
        mark.setAttribute('data-comment-status', anchor.status);
        mark.textContent = anchor.text;

        const parent = textNode.parentNode;

        if (after) {
          const afterNode = document.createTextNode(after);
          parent.insertBefore(afterNode, textNode.nextSibling);
          // Add afterNode to textNodes so subsequent anchors can match within it
          textNodes.splice(i + 1, 0, afterNode);
        }

        parent.insertBefore(mark, textNode.nextSibling ?? null);

        if (before) {
          textNode.textContent = before;
        } else {
          parent.removeChild(textNode);
          // Adjust index since we removed the current node
          textNodes.splice(i, 1);
          i--;
        }
      }
    }

    // Event delegation for click on mark elements
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [containerRef, threads, handleClick]);
}
