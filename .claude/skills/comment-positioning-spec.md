# Comment Card Positioning Behavior Spec

Reference spec for implementing Google Docs-style inline comment positioning in the right margin of the LegalCode editor. This document defines testable behavioral rules, animation specs, and edge-case handling.

Replaces the current naive implementation in `useCommentPositions.ts` and `InlineCommentMargin.tsx`.

---

## 1. Core Positioning Model

### 1.1 Ideal Position (Anchor Alignment)

Each comment card has an **ideal top position** equal to the top of its anchored (highlighted) text relative to the document scroll container.

```
idealTop = anchorElement.getBoundingClientRect().top
         - scrollContainer.getBoundingClientRect().top
         + scrollContainer.scrollTop
```

**Testable rule:** When a comment has no neighbors within its height + gap, its `top` position MUST equal its ideal position (anchor-aligned).

### 1.2 Card Dimensions

| Property                               | Value                                               | Notes                                                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card width                             | 320px (fixed)                                       | Matches current margin column width                                                                                                                                         |
| Min card height                        | Use measured height, no artificial minimum          | Current `CARD_MIN_HEIGHT = 320` is wrong. A single comment with no replies measures ~80-100px. Never use a fixed minimum for layout; always measure actual rendered height. |
| Max card height before internal scroll | 400px                                               | Long threads scroll internally (see Section 6)                                                                                                                              |
| Gap between cards                      | 8px                                                 | Tighter than current 12px. Google Docs uses ~6-8px.                                                                                                                         |
| Connector line length                  | Dynamic (horizontal, from card left edge to anchor) | See Section 5                                                                                                                                                               |

**Testable rule:** `CARD_GAP` MUST be 8px. No card may have an artificial minimum height applied during layout calculation; only measured heights are used.

### 1.3 Collision Resolution Algorithm

The algorithm is a **single-pass top-down sweep with downward displacement**. Cards are sorted by their ideal position (top to bottom), and each card is placed at the maximum of its ideal position and the minimum non-overlapping position.

```
Sort cards by idealTop ascending.

For each card[i] (i = 0 to N-1):
  if i == 0:
    card[i].top = card[i].idealTop
  else:
    minTop = card[i-1].top + card[i-1].measuredHeight + CARD_GAP
    card[i].top = max(card[i].idealTop, minTop)
```

**Testable rules:**

1. Cards MUST be sorted by anchor position in document order (top to bottom).
2. No two cards may overlap. For any adjacent pair: `card[i+1].top >= card[i].top + card[i].measuredHeight + CARD_GAP`.
3. A card is never placed ABOVE its ideal position. `card[i].top >= card[i].idealTop` for all i.
4. The first card (topmost) is always at its ideal position.
5. A card is displaced downward ONLY when a preceding card would cause overlap.

### 1.4 Displacement Minimization (Gravity Pull)

After the forward sweep, Google Docs does NOT run a backward pass to pull cards back up. Displaced cards remain displaced until the layout is recalculated (e.g., a comment is resolved/deleted, creating space). This keeps the algorithm O(n) and avoids oscillation.

**Testable rule:** The algorithm is a single forward pass. No backward adjustment pass occurs.

---

## 2. Active Comment Behavior

### 2.1 Activating a Comment

A comment becomes **active** when:

- The user clicks the comment card in the margin
- The user clicks highlighted (anchored) text in the document
- The user creates a new comment (it is active immediately)

Only one comment can be active at a time. Activating a new comment deactivates the previous one.

### 2.2 Visual Treatment of Active Card

- Border: `1px solid #8027FF` (accent primary)
- Box shadow: `0 0 0 1px rgba(128,39,255,0.2), 0 1px 3px rgba(0,0,0,0.08)`
- Background: `#FEFCFF`
- Connector line color transitions from `#D1D2DE` to `#8027FF`
- Anchor highlight in document transitions to `--comment-active` (33% amber)

**Testable rule:** When a comment is active, its card MUST have `border-color: #8027FF` and its connector line MUST have `background-color: #8027FF`.

### 2.3 Scroll-Into-View on Activation

When a comment is activated (by either clicking highlight or clicking card):

**If activated by clicking highlighted text:**

1. The comment card in the margin scrolls into view if not already visible.
2. The card scrolls to align with the viewport center (vertically) using `scrollIntoView({ block: 'center', behavior: 'smooth' })` on the card element, BUT only if the margin has its own scroll container. If the margin scrolls with the document (current implementation), no separate margin scroll is needed.
3. The document does NOT scroll (user clicked in the document, it's already visible).

**If activated by clicking a card in the margin:**

1. The anchored text in the document scrolls into view using `scrollIntoView({ block: 'center', behavior: 'smooth' })`.
2. The anchor highlight briefly flashes `--comment-active` for 1.5 seconds, then returns to `--comment-highlight`.

**Testable rules:**

1. Clicking highlighted text MUST make the corresponding card visible in the margin viewport.
2. Clicking a card MUST scroll the document to show the anchored text.
3. The anchor flash duration MUST be 1500ms.
4. Scroll behavior MUST be `smooth`.

### 2.4 Deactivation

A comment is deactivated when:

- Another comment is activated
- The user clicks empty space in the document (not on any highlight)
- The user presses Escape

On deactivation: border returns to `#E4E5ED`, shadow returns to `0 1px 2px rgba(0,0,0,0.04)`, connector line returns to `#D1D2DE`, anchor highlight returns to `--comment-highlight`.

**Testable rule:** Pressing Escape when a comment is active MUST deactivate it.

---

## 3. Dynamic Height Changes

### 3.1 Detecting Height Changes

Each comment card MUST be observed by a `ResizeObserver`. When a card's height changes (due to reply added, reply input expanded, collapse/expand of resolved thread, text wrapping changes), the positioning algorithm MUST re-run.

```typescript
// Per-card ResizeObserver
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const commentId = entry.target.getAttribute('data-comment-id');
    const newHeight = entry.borderBoxSize[0].blockSize;
    updateCardHeight(commentId, newHeight);
  }
});
```

**Testable rules:**

1. Every rendered comment card MUST be observed by a ResizeObserver.
2. When a reply is added to a thread, cards below it MUST reposition within one animation frame.
3. Height changes MUST NOT cause any card overlap (collision resolution re-runs).

### 3.2 Avoiding Flicker

Position calculation MUST use `useLayoutEffect`, not `useEffect`. This prevents the browser from painting stale positions before the new positions are calculated.

**Testable rule:** The position calculation hook MUST use `useLayoutEffect` for synchronous layout updates. `useEffect` MUST NOT be used for position calculation.

### 3.3 Batching Updates

When multiple cards change height simultaneously (e.g., on initial render), height updates MUST be batched into a single position recalculation. Use a `Map<string, number>` of pending height updates flushed in a single `requestAnimationFrame` or within the same `useLayoutEffect` cycle.

**Testable rule:** N simultaneous height changes MUST result in exactly 1 position recalculation, not N recalculations.

---

## 4. Connector Lines

### 4.1 Visual Spec

Each comment card has a horizontal connector line from the card's left edge extending toward the document content area.

| Property            | Value                                            |
| ------------------- | ------------------------------------------------ |
| Width               | 24px (fixed)                                     |
| Height              | 1px                                              |
| Color (inactive)    | `#D1D2DE`                                        |
| Color (active)      | `#8027FF`                                        |
| Vertical position   | 20px from top of card                            |
| Horizontal position | Extends left from card left edge (`left: -24px`) |
| Transition          | `background-color 200ms ease`                    |

**Implementation:** CSS `::before` pseudo-element on the card wrapper (already present in current `InlineCommentCard.tsx`).

### 4.2 Displaced Card Connector Behavior

When a card is displaced far from its anchor (pushed down by collision resolution), the connector line remains horizontal and fixed-length (24px). It does NOT angle toward the anchor text. The visual connection between a displaced card and its anchor is maintained by:

1. The connector line from the card
2. The highlight on the anchored text in the document
3. Clicking the anchor quote in the card scrolls to the highlighted text

**Testable rules:**

1. Connector line width MUST be exactly 24px regardless of card displacement.
2. Connector line MUST be horizontal (no angling).
3. Connector line vertical position MUST be 20px from the top of the card.
4. Connector line color MUST match active/inactive state of the card.

### 4.3 When Connectors Are Not Shown

- Resolved collapsed cards: connector line is shown but uses `#D1D2DE` (inactive color).
- Cards scrolled out of view: no special handling (they are simply not rendered or are outside the viewport).

---

## 5. Overflow Strategy

### 5.1 Many Comments on One Page

When there are more comments than can fit in the visible margin area, cards extend below the visible viewport. The comment margin does NOT have its own scrollbar. Instead, it scrolls with the document (it is positioned absolutely within the document flow).

**Testable rule:** The comment margin container MUST NOT have `overflow: auto` or `overflow: scroll`. It extends as tall as needed.

### 5.2 Many Comments on One Paragraph (Dense Clustering)

When 5+ comments are anchored to the same paragraph or adjacent lines:

1. All cards are stacked vertically with the standard 8px gap.
2. Cards are pushed progressively further from their anchor positions.
3. No collapsing, pagination, or grouping occurs.
4. The natural stacking with displacement handles this case.

**Testable rule:** Given N comments anchored to the same paragraph, all N cards MUST be visible (not collapsed or hidden). The last card's top MUST be at least `(N-1) * (avgCardHeight + CARD_GAP)` pixels below the first card's top.

### 5.3 Cards Extending Below Document

When displaced cards extend below the bottom of the document content area, the margin container simply extends to accommodate them. The parent scroll container handles this naturally.

**Testable rule:** The margin container's height MUST accommodate all positioned cards. No card is clipped or hidden due to container height.

---

## 6. Long Threads (5+ Replies)

### 6.1 Internal Scrolling

When a single comment thread grows very long (5+ replies), the card is capped at a maximum height and the reply content area scrolls internally.

| Property        | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Max card height | 400px                                                                   |
| Scroll region   | The replies section only (not the header, anchor quote, or reply input) |
| Scrollbar style | Thin, `--border-secondary` color, 4px width, appears on hover           |

**Testable rules:**

1. A comment card with 5+ replies MUST NOT exceed 400px in height.
2. When capped, the replies section MUST have `overflow-y: auto`.
3. The anchor quote, root comment, and reply input MUST remain visible (not scrolled).

### 6.2 Reply Count Indicator

When replies are scrolled (not all visible), show a small count indicator at the top of the scroll region:

- Text: "N more replies above" or "N more replies below"
- Style: `--type-caption`, `--text-tertiary`, centered, sticky top/bottom of scroll area
- This is a progressive enhancement (not critical for v1).

---

## 7. Resolved Comment Handling

### 7.1 Default Visibility

Resolved comments are **hidden by default**. They are filtered out of the visible threads list and do not participate in positioning.

**Testable rule:** By default, resolved comments MUST NOT appear in the margin and MUST NOT occupy layout space.

### 7.2 "Show Resolved" Toggle

A toggle button at the bottom of the margin shows/hides resolved comments.

- Label: "Show resolved (N)" when hidden, "Hide resolved" when shown
- Style: Text button, `--type-label`, `--text-secondary`
- When toggled on: resolved comments appear in document order, interleaved with unresolved comments, using the same positioning algorithm
- When toggled off: resolved comments fade out (200ms opacity), remaining cards reposition to fill gaps

**Testable rules:**

1. Toggling "Show resolved" MUST add resolved cards at their correct document-order positions.
2. Toggling "Hide resolved" MUST remove resolved cards and reposition remaining cards.
3. The transition for showing/hiding resolved cards MUST be 200ms.

### 7.3 Resolved Card Appearance

Resolved cards use a collapsed single-line format (already implemented in `InlineCommentCard.tsx`):

- Reduced padding: `10px 16px`
- Background: `#F9F9FB`
- Border: `1px solid #F3F3F7`
- No box shadow
- Shows: checkmark icon + author name + "resolved"
- Click to expand and show full thread content

---

## 8. Animation and Transition Specs

### 8.1 Card Repositioning

When cards reposition (due to new comment, reply, resolve, height change, scroll):

| Property     | Value                                                     |
| ------------ | --------------------------------------------------------- |
| CSS property | `top`                                                     |
| Duration     | 200ms                                                     |
| Easing       | `cubic-bezier(0.2, 0, 0, 1)` (Material 3 standard easing) |
| Trigger      | Any change to computed `top` value                        |

**Testable rule:** Card repositioning MUST use `transition: top 200ms cubic-bezier(0.2, 0, 0, 1)`.

Note: The current implementation uses `250ms cubic-bezier(0.4, 0, 0.2, 1)`. Change to 200ms with the M3 standard easing for snappier, more responsive feel.

### 8.2 Card Appear/Disappear

**New comment card appearing:**

- Initial state: `opacity: 0, transform: translateY(-8px)`
- Final state: `opacity: 1, transform: translateY(0)`
- Duration: 200ms
- Easing: `cubic-bezier(0.2, 0, 0, 1)`

**Comment card disappearing (resolved/deleted):**

- `opacity: 0, transform: scale(0.97)`
- Duration: 150ms
- Easing: `cubic-bezier(0.4, 0, 1, 1)` (accelerate)
- After animation completes: remove from DOM and re-run positioning

**Testable rules:**

1. A new comment card MUST animate in with opacity and translateY over 200ms.
2. A removed comment card MUST animate out with opacity and scale over 150ms.
3. Remaining cards MUST NOT reposition until the exit animation completes (150ms delay).

### 8.3 Active State Transitions

| Property             | Duration | Easing |
| -------------------- | -------- | ------ |
| border-color         | 200ms    | ease   |
| box-shadow           | 200ms    | ease   |
| background-color     | 200ms    | ease   |
| connector line color | 200ms    | ease   |

These are already correctly specified in the current `InlineCommentCard.tsx`.

### 8.4 Scroll Animations

Document scroll-to-anchor and margin scroll-to-card both use the browser's native `smooth` scroll behavior.

**Testable rule:** All programmatic scrolling MUST use `behavior: 'smooth'`.

---

## 9. Performance Requirements

### 9.1 Layout Calculation

- Position calculation MUST complete within a single frame (< 16ms for 60fps).
- For N comments, the algorithm is O(N) (single-pass sweep).
- DOM reads (getBoundingClientRect) MUST be batched before DOM writes (setting positions).

### 9.2 Scroll Handler

- Scroll-triggered recalculation MUST be throttled to once per animation frame using `requestAnimationFrame`, not on every scroll event.
- Alternatively, if positions are relative to the scroll container (not the viewport), scroll recalculation may be unnecessary. The current implementation uses `container.scrollTop` offset, which means positions are relative to the container's scroll origin and do NOT need to update on scroll.

**Testable rule:** If positions are calculated relative to the scroll container's coordinate space (using `scrollTop` offset), the scroll event listener MUST be removed (it causes unnecessary recalculations).

### 9.3 ResizeObserver Batching

- ResizeObserver callbacks for individual cards MUST batch updates. Collect all height changes in a single callback invocation, then run positioning once.
- Use `requestAnimationFrame` to coalesce rapid-fire resize events.

**Testable rule:** Multiple simultaneous card resizes MUST trigger at most one position recalculation per frame.

---

## 10. Implementation Checklist (Changes from Current Code)

### useCommentPositions.ts

1. Remove `CARD_MIN_HEIGHT = 320`. Use only measured heights from ResizeObserver.
2. Change `CARD_GAP` from `12` to `8`.
3. Change `useEffect` to `useLayoutEffect` for position calculation.
4. Remove the scroll event listener (positions are scroll-container-relative, scroll does not affect them).
5. Add per-card `ResizeObserver` instead of container-only observer.
6. Add `requestAnimationFrame` batching for height updates.

### InlineCommentMargin.tsx

1. Remove `useLayoutEffect` for one-time height measurement. Replace with per-card `ResizeObserver` (continuous measurement).
2. Add appear/disappear animations for cards (opacity + transform).
3. Add scroll-into-view behavior when active comment changes.
4. Add Escape key handler for deactivation.
5. Add max-height with internal scrolling for long threads.

### InlineCommentCard.tsx

1. Add `data-comment-id` attribute to the card wrapper for ResizeObserver identification.
2. Add `max-height: 400px` with `overflow-y: auto` on the replies section when reply count exceeds threshold.
3. No changes needed to connector line (already correctly implemented as `::before`).

---

## 11. Test Plan Summary

The following behavioral assertions MUST be covered by unit and integration tests:

| #   | Assertion                                            | Test Type   |
| --- | ---------------------------------------------------- | ----------- |
| P1  | Card with no neighbors aligns with its anchor        | Unit        |
| P2  | No two cards overlap (gap >= 8px)                    | Unit        |
| P3  | Cards are sorted by document order                   | Unit        |
| P4  | First card is always at ideal position               | Unit        |
| P5  | Displaced card is never above its ideal position     | Unit        |
| A1  | Only one card is active at a time                    | Integration |
| A2  | Clicking highlight activates corresponding card      | Integration |
| A3  | Clicking card scrolls document to anchor             | Integration |
| A4  | Escape deactivates active comment                    | Integration |
| A5  | Anchor text flashes for 1500ms on card click         | Integration |
| H1  | ResizeObserver detects card height change            | Unit        |
| H2  | Height change triggers repositioning                 | Integration |
| H3  | Batched height changes = 1 recalculation             | Unit        |
| H4  | useLayoutEffect, not useEffect, for positioning      | Unit        |
| C1  | Connector line is 24px wide                          | Visual/Unit |
| C2  | Active connector is #8027FF                          | Visual/Unit |
| C3  | Inactive connector is #D1D2DE                        | Visual/Unit |
| O1  | Margin container has no overflow scroll              | Unit        |
| O2  | All cards visible even with 10+ on one paragraph     | Integration |
| L1  | Card height capped at 400px for 5+ replies           | Unit        |
| L2  | Replies section scrolls internally when capped       | Unit        |
| R1  | Resolved comments hidden by default                  | Unit        |
| R2  | Toggle shows/hides resolved in document order        | Integration |
| T1  | Reposition transition: 200ms cubic-bezier(0.2,0,0,1) | Visual/Unit |
| T2  | New card appear animation: 200ms                     | Visual/Unit |
| T3  | Card exit animation: 150ms before reposition         | Visual/Unit |
