import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CommentThread } from '../../src/types/comments.js';
import { useCommentHighlights } from '../../src/hooks/useCommentHighlights.js';

function makeThread(overrides: Partial<CommentThread['comment']> = {}): CommentThread {
  return {
    comment: {
      id: 'c1',
      templateId: 't1',
      parentId: null,
      authorId: 'u1',
      authorName: 'Alice',
      authorEmail: 'alice@test.com',
      content: 'A comment',
      anchorFrom: 'p:0:0',
      anchorTo: 'p:0:5',
      anchorText: 'Hello',
      resolved: false,
      resolvedBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    },
    replies: [],
  };
}

function createMockRef(element: HTMLElement | null): React.RefObject<HTMLElement | null> {
  return { current: element };
}

describe('useCommentHighlights', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('wraps matching text in mark elements with correct data attributes', () => {
    container.innerHTML = '<p>Hello World</p>';
    const threads = [makeThread({ anchorText: 'Hello', id: 'c1', resolved: false })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('Hello');
    expect(marks[0]?.getAttribute('data-comment-id')).toBe('c1');
    expect(marks[0]?.getAttribute('data-comment-status')).toBe('open');
  });

  it('sets status to resolved for resolved threads', () => {
    container.innerHTML = '<p>Hello World</p>';
    const threads = [makeThread({ anchorText: 'Hello', id: 'c2', resolved: true })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.getAttribute('data-comment-status')).toBe('resolved');
  });

  it('handles click events on mark elements', () => {
    container.innerHTML = '<p>Hello World</p>';
    const threads = [makeThread({ anchorText: 'Hello', id: 'c1' })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    mark?.click();

    expect(onClick).toHaveBeenCalledWith('c1');
  });

  it('handles no matches gracefully', () => {
    container.innerHTML = '<p>No match here</p>';
    const threads = [makeThread({ anchorText: 'ZZZZZ' })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(0);
  });

  it('handles empty threads array', () => {
    container.innerHTML = '<p>Hello World</p>';
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, [], onClick);
    });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(0);
  });

  it('re-runs when threads change', () => {
    container.innerHTML = '<p>Hello World</p>';
    const onClick = vi.fn();
    const ref = createMockRef(container);
    const threads1 = [makeThread({ anchorText: 'Hello', id: 'c1' })];

    const { rerender } = renderHook(
      ({ threads }) => {
        useCommentHighlights(ref, threads, onClick);
      },
      { initialProps: { threads: threads1 } },
    );

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')?.getAttribute('data-comment-id')).toBe('c1');

    // Update threads — new anchor text
    const threads2 = [makeThread({ anchorText: 'World', id: 'c2' })];
    // Restore innerHTML before rerender since the hook should clean up and re-apply
    container.innerHTML = '<p>Hello World</p>';
    rerender({ threads: threads2 });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('World');
    expect(marks[0]?.getAttribute('data-comment-id')).toBe('c2');
  });

  it('cleans up event listeners on unmount', () => {
    container.innerHTML = '<p>Hello World</p>';
    const threads = [makeThread({ anchorText: 'Hello', id: 'c1' })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    const { unmount } = renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    unmount();

    // After unmount, clicking should not trigger callback
    const mark = container.querySelector('mark');
    // Mark might still be in DOM but the click handler should be removed
    if (mark) {
      mark.click();
      expect(onClick).not.toHaveBeenCalled();
    }
  });

  it('handles null containerRef', () => {
    const ref = createMockRef(null);
    const onClick = vi.fn();

    // Should not throw
    expect(() => {
      renderHook(() => {
        useCommentHighlights(ref, [makeThread()], onClick);
      });
    }).not.toThrow();
  });

  it('handles threads with null anchorText', () => {
    container.innerHTML = '<p>Hello World</p>';
    const threads = [makeThread({ anchorText: null })];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    // Should not create any marks for null anchor text
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(0);
  });

  it('wraps multiple different anchor texts', () => {
    container.innerHTML = '<p>Hello beautiful World</p>';
    const threads = [
      makeThread({ anchorText: 'Hello', id: 'c1' }),
      makeThread({ anchorText: 'World', id: 'c2' }),
    ];
    const onClick = vi.fn();
    const ref = createMockRef(container);

    renderHook(() => {
      useCommentHighlights(ref, threads, onClick);
    });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    const ids = Array.from(marks).map((m) => m.getAttribute('data-comment-id'));
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
  });
});
