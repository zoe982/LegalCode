# LegalCode v4 — Editor Redesign Design Specification

**Spec version:** 1.0
**Date:** 2026-03-08
**Supersedes:** v3 editor layout (Sections 4, 6, 7, 8 of `legalcode-design-v3.md`)
**Design system base:** `legalcode-design-v3.md` (all tokens, colors, typography, motion, spacing remain unchanged)

This spec covers three new components that transform the editor from a slide-over-panel paradigm to a Google Docs-inspired experience. The template list page, design tokens, and all non-editor components remain unchanged.

---

## Design Decisions Summary

| Element                            | v3 (current)                  | v4 (this spec)                                           |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------- |
| Comments                           | SlideOverPanel overlay        | Inline right margin beside content                       |
| Version History                    | SlideOverPanel overlay        | Full-screen dedicated route                              |
| Category / Country                 | Info panel fields             | Compact dropdowns in app bar                             |
| Tags                               | Info panel                    | Removed entirely                                         |
| Status badge                       | Info panel                    | App bar, next to dropdowns                               |
| Source/Review toggle               | EditorToolbar (below app bar) | App bar                                                  |
| Publish / Archive                  | Info panel buttons            | App bar right side                                       |
| Title                              | Content area (scrollable)     | App bar (fixed, always visible)                          |
| Info panel                         | SlideOverPanel with metadata  | Eliminated (metadata in app bar, dates in "..." popover) |
| Secondary info (dates, created by) | Info panel                    | "..." popover in app bar                                 |

---

## Spec 1: DocumentHeader (Editor App Bar)

### Overview

DocumentHeader is an alternative layout for the existing 48px `TopAppBar` component. When a template is open in the editor, `TopAppBar` renders `DocumentHeader` instead of the default breadcrumb layout. This keeps a single app bar component with conditional rendering based on route context.

### Visual Layout

```
48px
+-----------------------------------------------------------------------------------+
| ← | Title Input___________  [Category ▾] [Country ▾] [Draft] [S|R] ... [Publish] [⏱] Z |
+-----------------------------------------------------------------------------------+
```

Dense horizontal layout. Every element vertically centered within the 48px bar.

### Component Hierarchy

```
TopAppBar (existing, 48px)
  └─ DocumentHeader (new, replaces Breadcrumbs + panelToggles + rightSlot)
       ├─ BackButton (IconButton, ArrowBackRounded)
       ├─ TitleInput (borderless <input>)
       ├─ CategorySelect (MUI Select, compact)
       ├─ CountrySelect (MUI Select, compact)
       ├─ StatusChip (existing component)
       ├─ ModeToggle (ToggleButtonGroup, compact)
       ├─ MoreButton (IconButton, MoreHorizRounded → Popover)
       │    └─ MetadataPopover
       │         ├─ Created date + author
       │         └─ Last modified date
       ├─ PublishButton | ArchiveButton (conditional on status)
       ├─ HistoryButton (IconButton, ScheduleRounded)
       └─ AvatarDropdownMenu (existing component)
```

### Element Specifications

#### BackButton

- **Icon:** `ArrowBackRounded`, 20px
- **Size:** 32px touch target
- **Color:** `--text-secondary`
- **Hover:** `--surface-tertiary` background, `--text-primary` icon, `border-radius: var(--radius-md)` (6px)
- **Action:** `navigate('/templates')` (back to template list)
- **Tooltip:** "Back to templates" (400ms delay)
- **ARIA:** `aria-label="Back to templates"`
- **Margin-right:** `--space-2` (8px)

#### TitleInput

- **Element:** `<input type="text">` (not a textarea, single line)
- **Font:** Source Serif 4, 1.125rem (18px), weight 600, `--text-primary`
- **Placeholder:** "Untitled" in `--text-tertiary`
- **Border:** none
- **Background:** transparent
- **Outline on focus:** none (always looks editable, no visible focus ring on the input itself)
- **Width:** flexible, `min-width: 120px`, `max-width: 300px`
- **Overflow:** `text-overflow: ellipsis` when blurred, full text visible when focused
- **Padding:** `--space-1` (4px) vertical, 0 horizontal
- **Margin-right:** `--space-3` (12px)
- **Keyboard:** Enter blurs the input (saves). Escape reverts to last saved value and blurs.
- **ARIA:** `aria-label="Template title"`
- **Autosave:** Debounced 500ms after last keystroke, uses existing autosave infrastructure

#### CategorySelect

- **Component:** MUI `<Select>` with `variant="standard"` (underline removed via `disableUnderline`)
- **Font:** DM Sans, `--type-label` (0.8125rem, weight 500)
- **Color:** `--text-secondary` (label and value), `--text-primary` on hover/focus
- **Placeholder:** "Category" in `--text-tertiary` when no value selected
- **Height:** 28px (compact)
- **Min-width:** 100px
- **Max-width:** 160px
- **Padding:** `--space-1` (4px) `--space-2` (8px)
- **Border:** `1px solid var(--border-primary)`, `border-radius: var(--radius-md)` (6px)
- **Hover:** `--border-hover` border
- **Focus:** `--border-focus` border, `0 0 0 3px var(--accent-primary-ring)`
- **Dropdown icon:** `ExpandMoreRounded`, 16px, `--text-tertiary`
- **Menu:** `--surface-elevated` background, `--border-primary` border, `border-radius: var(--radius-xl)` (10px), `--shadow-md`. Items: `--type-body`, 36px height, hover `--surface-tertiary`.
- **Data source:** Options fetched from API (`GET /templates/categories`), cached via TanStack Query
- **Margin-right:** `--space-2` (8px)
- **ARIA:** `aria-label="Template category"`
- **MUI props:** `size="small"`, `displayEmpty`, `sx={{ minWidth: 100 }}`

#### CountrySelect

- Identical to CategorySelect except:
- **Placeholder:** "Country" in `--text-tertiary`
- **Data source:** `GET /templates/countries`
- **Margin-right:** `--space-3` (12px) (larger gap before status chip)
- **ARIA:** `aria-label="Template country"`

#### StatusChip

- **Component:** Existing `StatusChip` component, unchanged
- **Placement:** After CountrySelect, `--space-3` (12px) gap on each side
- **No interaction** (display only in the app bar; status changes via Publish/Archive buttons)

#### ModeToggle

- **Component:** Compact version of the existing Source/Review toggle from `EditorToolbar`
- **Container:** `--surface-tertiary` background, `border-radius: var(--radius-lg)` (8px), `padding: 2px`, `1px solid var(--border-primary)` border
- **Segments:** "Source" | "Review"
  - Active: `--surface-primary` background, `--text-primary` text, weight 600, `border-radius: var(--radius-md)` (6px), `--shadow-xs`
  - Inactive: transparent background, `--text-secondary` text, weight 500
- **Segment size:** `padding: 4px 12px` (more compact than toolbar version's 6px 16px)
- **Font:** DM Sans, `--type-label` (0.8125rem)
- **Transition:** background-position slide, 200ms `--ease-standard`
- **Margin-left:** `--space-3` (12px)
- **Margin-right:** `--space-2` (8px)
- **ARIA:** `role="radiogroup"`, `aria-label="Editor mode"`. Each segment: `role="radio"`, `aria-checked`.
- **Keyboard:** Arrow Left/Right to switch modes, Tab to move focus past the group.

#### MoreButton ("...")

- **Icon:** `MoreHorizRounded`, 20px
- **Size:** 32px touch target
- **Color:** `--text-secondary`
- **Hover:** `--surface-tertiary` background, `--text-primary` icon
- **Tooltip:** "Template details" (400ms delay)
- **ARIA:** `aria-label="Template details"`, `aria-haspopup="true"`, `aria-expanded` tracks popover state
- **Action:** Opens `MetadataPopover`

#### MetadataPopover

- **Trigger:** MoreButton click
- **Anchor:** Below MoreButton, aligned to left edge
- **Width:** 280px
- **Background:** `--surface-elevated`
- **Border:** `1px solid var(--border-primary)`
- **Border-radius:** `--radius-2xl` (12px)
- **Shadow:** `--shadow-lg`
- **Padding:** `--space-5` (20px)
- **Z-index:** `--layer-dropdown` (50)
- **Content layout:** vertical stack, `--space-4` (16px) gap between rows

```
+--------------------------------------------+
|  Created     Mar 3, 2026                   |
|             by Joseph Marsico              |
|                                            |
|  Modified    2 hours ago                   |
|                                            |
|  Version     v12                           |
+--------------------------------------------+
```

- **Labels:** DM Sans `--type-caption` (0.75rem), `--text-tertiary`, uppercase is NOT applied (these are not status labels)
- **Values:** DM Sans `--type-body` (0.875rem), `--text-primary`
- **Author:** DM Sans `--type-caption`, `--text-secondary`, below date with `--space-0.5` (2px) gap
- **Dividers:** None (clean stacked layout)
- **Enter:** opacity 0 + translateY(-4px) to opacity 1 + translateY(0), `--duration-fast` (150ms) ease-out
- **Exit:** opacity to 0, 100ms ease-in
- **Close on:** Click outside, Escape key, MoreButton re-click
- **MUI component:** `<Popover>` with `anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}`, `transformOrigin={{ vertical: 'top', horizontal: 'left' }}`

#### PublishButton (visible when status is `draft`)

- **Style:** Primary button (filled purple) — compact variant
- **Text:** "Publish"
- **Font:** DM Sans `--type-label`, weight 600
- **Background:** `--accent-primary`
- **Color:** `--text-on-purple`
- **Height:** 28px (compact, vs standard 36px)
- **Padding:** 0 `--space-3` (12px)
- **Border-radius:** `--radius-md` (6px)
- **Hover:** `--accent-primary-hover`
- **Active:** `--accent-primary-active`
- **Focus:** `0 0 0 3px var(--accent-primary-ring)`
- **Action:** Opens confirmation dialog (existing pattern from v3 spec)
- **Margin-right:** `--space-2` (8px)
- **ARIA:** `aria-label="Publish template"`

#### ArchiveButton (visible when status is `active`)

- **Style:** Secondary button (outlined) — compact variant
- **Text:** "Archive"
- **Height:** 28px
- **Padding:** 0 `--space-3` (12px)
- **Border:** `1px solid var(--border-primary)`
- **Border-radius:** `--radius-md` (6px)
- **Color:** `--text-secondary`
- **Hover:** `--surface-tertiary` background, `--border-hover` border
- **Action:** Opens confirmation dialog
- **ARIA:** `aria-label="Archive template"`

#### HistoryButton

- **Icon:** `ScheduleRounded`, 20px
- **Size:** 32px touch target
- **Color:** `--text-secondary`
- **Hover:** `--surface-tertiary` background, `--text-primary` icon, `border-radius: var(--radius-md)` (6px)
- **Tooltip:** "Version history" (400ms delay)
- **Action:** `navigate(\`/templates/${templateId}/history\`)`
- **ARIA:** `aria-label="Version history"`
- **Margin-right:** `--space-2` (8px)

#### AvatarDropdownMenu

Existing component, unchanged. Placed at the far right.

### Spacing Map (left to right)

| Element                        | Right margin                                 |
| ------------------------------ | -------------------------------------------- |
| App bar left padding           | `--space-2` (8px, from `px: 2` on TopAppBar) |
| BackButton                     | `--space-2` (8px)                            |
| TitleInput                     | `--space-3` (12px)                           |
| CategorySelect                 | `--space-2` (8px)                            |
| CountrySelect                  | `--space-3` (12px)                           |
| StatusChip                     | `--space-3` (12px)                           |
| ModeToggle                     | `--space-2` (8px)                            |
| MoreButton                     | `--space-2` (8px)                            |
| PublishButton or ArchiveButton | `--space-2` (8px)                            |
| HistoryButton                  | `--space-2` (8px)                            |
| AvatarDropdownMenu             | `--space-2` (8px, app bar right padding)     |

Total occupied width estimate at 1280px+: ~760px, leaving comfortable room.

### TopAppBar Integration

The existing `TopAppBar` component accepts slots (`panelToggles`, `rightSlot`, `statusBadge`, `breadcrumbTemplateName`). For v4, a new prop `documentHeader` replaces all of these when in the editor:

```
interface TopAppBarProps {
  // ... existing props
  documentHeader?: ReactNode | undefined;
}
```

When `documentHeader` is provided, TopAppBar renders it as the sole child, replacing the default breadcrumb + slot layout. This avoids breaking existing pages (template list, admin, settings).

### Responsive Behavior

#### 1280px and above (full layout)

All elements visible. TitleInput `max-width: 300px`.

#### 1024-1279px (compact)

- TitleInput `max-width: 200px`
- CategorySelect and CountrySelect: hide text labels, show only selected value (shorter)
- ModeToggle segments: reduce padding to `4px 8px`
- PublishButton: icon-only variant (no text, just `PublishRounded` icon, 28px square)

#### 900-1023px (narrow)

- TitleInput `max-width: 140px`
- CategorySelect and CountrySelect: collapse into a single "..." overflow menu with MoreButton
- ModeToggle: still visible (it is critical UI)
- HistoryButton: hidden (accessible via MetadataPopover as a link)
- StatusChip: hidden (status visible in MetadataPopover)

#### Below 900px

Unsupported (existing `ResponsiveGuard` shows desktop-only message).

### Create Mode Variant

When creating a new template (`/templates/new`), DocumentHeader shows a reduced layout:

```
← | Title Input___________  [Category ▾] [Country ▾]           [Save Draft]  Z
```

- **No StatusChip** (no status yet)
- **No HistoryButton** (no versions yet)
- **No MoreButton** (no dates/version to show)
- **No ModeToggle** (defaults to source mode; toggle appears in EditorToolbar which remains for create mode)
- **SaveDraftButton** replaces Publish:
  - Style: Primary button, compact (28px)
  - Text: "Save Draft"
  - Action: Creates the template via API, then navigates to `/templates/:id`
  - Disabled until title is non-empty

### Keyboard Navigation

1. **Tab order:** BackButton -> TitleInput -> CategorySelect -> CountrySelect -> ModeToggle -> MoreButton -> PublishButton/ArchiveButton -> HistoryButton -> AvatarDropdownMenu
2. **Escape:** If a dropdown (Category/Country) or popover (More) is open, closes it. Otherwise, no action.
3. **Enter on TitleInput:** Blurs input (confirms edit), focus moves to next element.
4. **Arrow keys in ModeToggle:** Left/Right switches between Source and Review.

### Accessibility

- `role="banner"` on the TopAppBar (existing)
- All icon buttons have `aria-label` (specified per element above)
- CategorySelect and CountrySelect have `aria-label` attributes
- ModeToggle uses `role="radiogroup"` with `role="radio"` children
- MetadataPopover uses `aria-haspopup` and `aria-expanded` on trigger
- Focus ring: `outline: 2px solid var(--accent-primary-ring); outline-offset: 2px` on all interactive elements
- All tooltips: 400ms delay, `role="tooltip"`, `aria-describedby` link

### Motion

| Interaction                 | Animation                                              |
| --------------------------- | ------------------------------------------------------ |
| MetadataPopover open        | opacity 0 + translateY(-4px) to normal, 150ms ease-out |
| MetadataPopover close       | opacity to 0, 100ms ease-in                            |
| ModeToggle switch           | sliding pill indicator, 200ms `--ease-standard`        |
| StatusChip change (publish) | springExpressive color morph (existing behavior)       |
| Reduced motion              | All transitions instant or 100ms max fade              |

### What This Replaces

- **Breadcrumbs:** No longer rendered on the editor page. BackButton replaces the "Acasus / Templates / Name" trail. Breadcrumbs remain on non-editor pages.
- **PanelToggleButtons (Info/Comments/History):** Removed from editor. Info panel eliminated. Comments moved to inline margin. History moved to dedicated route.
- **EditorToolbar Source/Review toggle:** Moved to DocumentHeader. EditorToolbar retains only markdown helpers, word count, and connection status. When in review mode, EditorToolbar shows only word count and connection status (no markdown helpers). The toolbar may optionally be hidden entirely in review mode if no information remains worth showing.
- **SlideOverPanel (on editor page):** No longer used for Info, Comments, or History on the editor page. The component itself is not deleted (may be used elsewhere).

---

## Spec 2: Inline Comment Margin

### Overview

Comments are displayed in a fixed-width margin column to the right of the editor content, aligned vertically with their anchor text. This replaces the Comments SlideOverPanel for the editor page. The margin is only visible in review mode (comments require review mode for text selection and highlight rendering).

### Layout Architecture

```
+---------------------------------------------------------------------+
|                         TopAppBar (48px)                            |
+---------------------------------------------------------------------+
|                        EditorToolbar (44px)                         |
+---------------------------------------------------------------------+
|                                                                     |
|     [margin]  [=====720px content======]  [=280px comment margin=]  |
|               |                         |  |                      | |
|               | Document content here   |  | InlineCommentCard    | |
|               | with highlighted text   |  |  aligned to anchor   | |
|               |                         |  |                      | |
|               | More content with       |  | InlineCommentCard    | |
|               | another highlight       |  |  aligned to anchor   | |
|               |                         |  |                      | |
+---------------------------------------------------------------------+
```

#### Container Layout

- **Wrapper:** `display: flex`, `justify-content: center`, scrollable (overflow-y: auto)
- **Content column:** `width: 720px` (`--editor-max-width`), `flex-shrink: 0`
- **Comment margin:** `width: 280px`, `flex-shrink: 0`, `margin-left: --space-6` (24px)
- **Left spacer:** `flex: 1`, mirrors the space to the left of content for visual centering. When comment margin is visible, the content shifts slightly left to stay visually balanced.
- The entire flex row scrolls together (margin scrolls with content, NOT fixed position).

#### Minimum Viewport Width

- At 1280px+: full 720px content + 24px gap + 280px margin = 1024px needed. Remaining space (~256px) distributed as left margin.
- At 1024-1279px: content reduces to 640px. Margin reduces to 240px. Gap stays 24px.
- Below 1024px: margin collapses (see Responsive section below).

### InlineCommentCard

Each comment thread renders as a card in the margin column.

#### Visual Design

```
+------------------------------------------+
| [Avatar 24px] Jane Smith        2h ago   |
| This needs to be reviewed by legal.      |
|                                          |
|   [Avatar 20px] John Doe       1h ago   |
|   Agreed, I'll flag it.                  |
|                                          |
| [Reply...]                    [Resolve]  |
+------------------------------------------+
```

#### Card Container

- **Background:** `--surface-primary` (matches page, no card background distinction)
- **Border-left:** `2px solid var(--comment-highlight)` (amber, connecting to the highlight)
- **Border-left (active):** `2px solid var(--comment-active)` when this card's anchor is focused
- **Padding:** `--space-3` (12px) left (after border), `--space-2` (8px) top/bottom, 0 right
- **Width:** fills the 280px margin column
- **Margin-bottom:** 0 (gap handled by positioning algorithm)
- **Border-radius:** none (clean left-border-only style, like a blockquote)

#### Vertical Positioning

Each `InlineCommentCard` is absolutely positioned within the margin column to align with its anchor element in the content.

**Algorithm:**

1. For each comment, find the `mark[data-comment-id]` element in the content column.
2. Get the `offsetTop` of that mark relative to the scroll container.
3. Set the card's `top` to match that `offsetTop`.
4. **Collision resolution:** If a card would overlap the previous card, push it down so there is a minimum gap of `--space-2` (8px) between cards.
5. **Active card priority:** When a card becomes active (user clicks its highlight), it scrolls into view in the margin and takes its ideal position; other cards adjust around it.
6. Recalculate positions on: scroll, content resize, comment add/remove/resolve.

**Implementation approach:** Use `position: relative` on the margin container, `position: absolute` on each card. A layout effect computes positions on render and on ResizeObserver/scroll events.

#### Author Row

- **Avatar:** 24px, circular, existing Avatar component
- **Name:** DM Sans `--type-label` (0.8125rem), weight 600, `--text-primary`
- **Timestamp:** DM Sans `--type-caption` (0.75rem), `--text-tertiary`, right-aligned (pushed with `margin-left: auto`)
- **Row layout:** `display: flex`, `align-items: center`, `gap: --space-2` (8px)
- **Margin-bottom:** `--space-1` (4px)

#### Comment Text

- **Font:** DM Sans `--type-body` (0.875rem/1.5rem), weight 400, `--text-body`
- **Padding-left:** `--space-7` (32px) — aligned past the avatar
- **Margin-bottom:** `--space-2` (8px) for multi-comment threads

#### Replies

- **Indent:** `--space-7` (32px) from card edge (nested under parent)
- **Avatar:** 20px (smaller)
- **Name:** DM Sans `--type-caption` (0.75rem), weight 600, `--text-primary`
- **Reply text:** DM Sans `--type-caption` (0.75rem), `--text-body`
- **Padding-left:** `--space-6` (24px) past the reply avatar
- **Max nesting:** 1 level of replies. All replies are flat under the parent comment.
- **Gap between replies:** `--space-2` (8px)

#### Reply Input

- **Placeholder:** "Reply..." in `--text-tertiary`
- **Font:** DM Sans `--type-body`
- **Style:** Single-line input, 28px height, `--surface-secondary` background, `1px solid var(--border-primary)` border, `border-radius: var(--radius-lg)` (8px)
- **Padding:** `--space-1` (4px) `--space-3` (12px)
- **Position:** Bottom of card, full width minus left padding
- **On focus:** Expands to multi-line (min 2 rows), shows "Reply" submit button (primary, compact 24px height) and "Cancel" (tertiary)
- **Focus border:** `--border-focus`, `0 0 0 3px var(--accent-primary-ring)`

#### Resolve Button

- **Text:** "Resolve" with `CheckRounded` icon (16px)
- **Font:** DM Sans `--type-caption`, weight 500
- **Color:** `--text-secondary`
- **Hover:** `--accent-primary` color
- **Position:** Bottom-right of card, opposite the reply input
- **Size:** text button, no background, 24px height
- **ARIA:** `aria-label="Resolve comment thread"`

#### Card States

| State                   | Visual                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Default                 | `2px solid var(--comment-highlight)` left border, full opacity                                                                                                           |
| Active (anchor focused) | `2px solid var(--comment-active)` left border, subtle `--accent-primary-subtle` background tint                                                                          |
| Hover                   | Slightly elevated: `--shadow-xs` on entire card area                                                                                                                     |
| Resolved                | Collapsed to single line: `CheckRounded` + "[Author] resolved" in `--text-tertiary` `--type-caption`. Click to expand. Left border: `2px solid var(--comment-resolved)`. |
| Resolved expanded       | Full thread visible, muted: 70% opacity on all text. "Unresolve" action replaces "Resolve".                                                                              |

### Collapse/Expand Toggle

A toggle button controls whether the margin column is visible.

- **Position:** Top of the margin column, right-aligned, sticky to the top of the scroll area (`top: 0`)
- **Icon:** `ChatBubbleOutlineRounded` (20px) + count badge
- **Collapsed icon:** `ChevronLeftRounded` (to expand)
- **Size:** 32px touch target
- **Color:** `--text-secondary`, hover `--text-primary`
- **ARIA:** `aria-label="Hide comments"` / `aria-label="Show comments"`, `aria-expanded`

**When collapsed:**

- Margin column width reduces to 0
- Content column recenters
- Small comment indicators appear on the right edge of the content column (outside the 720px, in the natural right margin):
  - `8px` diameter circles, `--status-draft` fill (amber) for unresolved, `--text-tertiary` for resolved
  - Vertically aligned with anchor text
  - Clicking an indicator expands the margin and scrolls to that card
  - These are the same `CommentIndicator` components from v3, repurposed

**Collapse transition:** margin width 280px to 0, 200ms `--ease-standard`. Content recenters with 200ms transition.

### New Comment Flow

1. User selects text in review mode content.
2. `FloatingCommentButton` appears (existing component, unchanged behavior).
3. User clicks button or presses `Cmd+Opt+M`.
4. A new `InlineCommentCard` appears in the margin at the anchor position, with the input auto-focused.
5. The selected text highlight transitions to `--comment-active`.
6. The new card contains:
   - Anchor quote (selected text, `--type-caption`, italic, `--text-secondary`, max 2 lines, `2px solid var(--border-primary)` left border, `--space-2` left padding)
   - Comment textarea (auto-expanding, min 64px height, `--type-body`)
   - "Cancel" (tertiary) + "Comment" (primary, disabled until text entered) buttons, right-aligned
7. On submit: card transitions to standard InlineCommentCard. Highlight changes from `--comment-active` to `--comment-highlight`.
8. On cancel: card disappears, highlight removed.

**Card appear animation:** opacity 0 + translateY(-8px) to normal, 200ms ease-out.

### Active State Interaction

- **Click highlight in content:** The corresponding InlineCommentCard gets `active` state. If the margin is collapsed, it expands first. The card scrolls into view if needed (smooth scroll, 200ms).
- **Click card in margin:** The anchor highlight in the content pulses to `--comment-active` for 1 second, then returns to `--comment-highlight`. The content scrolls to show the anchor if needed.

### Resolved Comments

- **Hidden by default.** A "Show resolved (N)" text button at the bottom of the margin toggles visibility.
- **Style:** DM Sans `--type-caption`, `--text-tertiary`. Hover: `--text-secondary`.
- **When shown:** Resolved cards render in their positional order, in collapsed (single-line) form. Click to expand.
- **Transition:** resolved cards fade in, 200ms ease.

### Responsive Behavior

#### 1280px and above (full margin)

Content 720px + gap 24px + margin 280px. Comment indicators hidden (margin is visible).

#### 1024-1279px (compact margin)

Content 640px + gap 20px + margin 240px. InlineCommentCards narrower; reply text may wrap more.

#### 900-1023px (margin collapsed, indicators only)

Margin is hidden by default and cannot be expanded. Comments accessible via:

- **Comment indicators** on content right edge (always visible)
- **Clicking an indicator** opens a `Popover` anchored to the indicator, containing the InlineCommentCard content in popover form
- Popover: 320px wide, `--surface-elevated`, `--shadow-lg`, `--radius-2xl` (12px)

#### Below 900px

Unsupported (existing guard).

### Accessibility

- `role="complementary"` on the margin column, `aria-label="Comments"`
- Each InlineCommentCard: `role="article"`, `aria-label="Comment by [author name]"`
- Resolve/Reply buttons: standard button semantics with `aria-label`
- Keyboard: Tab navigates between cards. Within a card, Tab moves through reply input and action buttons.
- Focus management: When a new comment is created, focus moves to the textarea. On submit, focus returns to the content.
- Screen reader: When clicking a highlight, announce "Navigated to comment by [author]" via `aria-live="polite"` region.

### Motion

| Interaction               | Animation                                                                  |
| ------------------------- | -------------------------------------------------------------------------- |
| Card appear (new comment) | opacity 0 + translateY(-8px) to normal, 200ms ease-out                     |
| Card disappear (cancel)   | opacity to 0, 150ms ease-in                                                |
| Card resolve collapse     | height auto to single-line height, 200ms `--ease-standard`                 |
| Active state pulse        | `--comment-active` background flash on content highlight, 1s ease-out fade |
| Margin expand/collapse    | width 0 to 280px / 280px to 0, 200ms `--ease-standard`                     |
| Content recentering       | margin adjustment, 200ms `--ease-standard`                                 |
| Resolved card reveal      | opacity 0 to 1, 200ms ease                                                 |
| Reduced motion            | All transitions instant or 100ms max fade                                  |

---

## Spec 3: Version History Full-Screen View

### Overview

A dedicated page at `/templates/:id/history` that replaces the Version History SlideOverPanel. Split layout: document preview on the left, version timeline on the right. Navigated to via the HistoryButton in DocumentHeader.

### Route

```
/templates/:id/history
```

Added to the existing route structure. No nested routes (no `/templates/:id/history/:versionId`; version selection is handled via state within the page).

### Layout Architecture

```
+---------------------------------------------------------------------+
|  ← Version History — Template Title                                 |  <- 48px top bar
+---------------------------------------------------------------------+
|                                            |                        |
|                                            | Version Timeline       |
|    Document Preview                        | (320px sidebar)        |
|    (flex: 1, read-only)                    |                        |
|                                            | [v12 (current)] 2h    |
|    Rendered markdown content               | Updated clause...      |
|    at selected version                     | by Jane Smith          |
|                                            |                        |
|                                            | [v11] 1 day            |
|                                            | Added addendum...      |
|                                            | by John Doe            |
|                                            |                        |
|                                            | [Restore]              |
|                                            |                        |
+---------------------------------------------------------------------+
```

### Component Hierarchy

```
VersionHistoryPage (new page component)
  ├─ TopAppBar (existing, with custom content)
  │    ├─ BackButton (ArrowBackRounded → navigate back to editor)
  │    └─ PageTitle ("Version History — [Template Title]")
  ├─ VersionHistoryLayout (flex container)
  │    ├─ DocumentPreview (left, flex: 1)
  │    │    ├─ DiffToggle (optional: "Show changes" switch)
  │    │    └─ MarkdownEditor (existing, read-only mode, review rendering)
  │    └─ VersionTimeline (right, 320px fixed width)
  │         ├─ VersionTimelineHeader
  │         └─ VersionTimelineList
  │              └─ VersionCard (repeated)
  │                   ├─ TimelineDot
  │                   ├─ VersionNumber + Timestamp
  │                   ├─ ChangeSummary
  │                   ├─ AuthorName
  │                   └─ RestoreButton (non-current versions)
  └─ RestoreDialog (confirmation)
```

### Top Bar

Uses the existing `TopAppBar` with `documentHeader` or `breadcrumbPageName` prop. The bar content for this page:

```
← Version History — [Template Title]
```

- **BackButton:** `ArrowBackRounded`, 20px icon, 32px touch target, `--text-secondary`. Action: `navigate(\`/templates/${templateId}\`)`. Tooltip: "Back to editor" (400ms). ARIA: `aria-label="Back to editor"`.
- **Page title:** "Version History" in DM Sans `--type-subtitle` (0.875rem, weight 600), `--text-primary`. Em dash. Template title in Source Serif 4 `--type-title` (1.125rem, weight 600), `--text-primary`, max-width 400px, `text-overflow: ellipsis`.
- **Right side:** Only AvatarDropdownMenu (existing). No other controls.

### Split Layout Container

- **Display:** `flex`, `flex-direction: row`
- **Height:** `calc(100vh - 48px)` (full viewport minus top bar, no EditorToolbar on this page)
- **Background:** `--surface-primary`

### Document Preview (Left Panel)

- **Width:** `flex: 1` (fills remaining space)
- **Overflow:** `overflow-y: auto`
- **Content:** Existing `MarkdownEditor` component in read-only review mode
- **Content max-width:** `--editor-max-width` (720px), centered with `margin: 0 auto`
- **Padding:** `--space-7` (32px) top/bottom
- **Border-right:** `1px solid var(--border-primary)` (separates from timeline)

#### Diff Toggle

- **Position:** Top-right of the document preview area, sticky, `--space-4` (16px) from top and right
- **Component:** MUI `Switch` (compact) + label
- **Label:** "Show changes" in DM Sans `--type-label`, `--text-secondary`
- **Default:** Off (shows clean version content)
- **When on:** Shows diff highlighting between the selected version and the current (latest) version:
  - **Additions:** `background-color: #D1FAE5` (green, `--status-published-bg`), full line highlight
  - **Deletions:** `background-color: #FEE2E2` (red, `--destructive-subtle`), full line highlight, text with `text-decoration: line-through`
  - **Unchanged:** No highlight
- **ARIA:** `aria-label="Show changes between selected version and current version"`

#### Loading State

When a version is loading, the document preview shows:

- Three groups of skeleton lines (shimmer animation) at the content max-width
- Group 1: 1 short line (heading), gap, 4 full-width lines
- Group 2: 1 short line (heading), gap, 3 full-width lines
- Group 3: 2 full-width lines
- Skeleton color: `--surface-tertiary` to `--surface-secondary` shimmer
- Animation: `background-position` slide, 1.5s linear infinite
- **Note:** v3 says "no skeleton screens" but this is an exception for a content-heavy area where the structure is predictable and the load time may exceed 200ms. The skeleton is subtle and structural, not decorative.

### Version Timeline (Right Sidebar)

- **Width:** 320px, `flex-shrink: 0`
- **Background:** `--surface-secondary` (`#F9F9FB`)
- **Overflow:** `overflow-y: auto`
- **Padding:** `--space-5` (20px) top, `--space-4` (16px) horizontal, `--space-5` (20px) bottom
- **Border-left:** handled by document preview's `border-right`

#### Timeline Header

- **Title:** "Versions" in DM Sans `--type-subtitle` (0.875rem, weight 600), `--text-primary`
- **Count:** version count in DM Sans `--type-caption`, `--text-tertiary` — e.g., "(12 versions)"
- **Layout:** flex row, space-between, `margin-bottom: --space-5` (20px)
- **Bottom border:** `1px solid var(--border-primary)`, `padding-bottom: --space-4` (16px)

#### Timeline Visual

- **Vertical line:** `1px solid var(--border-primary)`, positioned `--space-5` (20px) from the left edge of the sidebar content area. Full height of the version list.

#### VersionCard

Each version entry in the timeline:

```
[●]─── v12 (current)                    2h ago
       Updated indemnification clause
       by Jane Smith
```

- **TimelineDot:**
  - Size: 10px diameter circle
  - Position: centered on the vertical timeline line
  - Current version: `--accent-primary` fill, `2px solid --accent-primary` border
  - Selected (non-current): `--text-primary` fill
  - Default: `--border-primary` fill (gray)
  - Connected to card content by a `1px solid var(--border-primary)` horizontal line, 8px long

- **Version number:** DM Sans `--type-label` (0.8125rem), weight 600, `--text-primary`
- **"(current)" label:** DM Sans `--type-caption`, `--accent-primary`, only on latest version
- **Timestamp:** DM Sans `--type-caption`, `--text-tertiary`, right-aligned
- **Change summary:** DM Sans `--type-body` (0.875rem), `--text-body`, `margin-top: --space-1` (4px). Max 2 lines, `text-overflow: ellipsis`.
- **Author:** DM Sans `--type-caption`, `--text-secondary`, `margin-top: --space-0.5` (2px). "by [Name]"

#### VersionCard Layout

- **Padding:** `--space-3` (12px) all sides
- **Margin-left:** `--space-7` (32px) (to clear the timeline line and dot)
- **Margin-bottom:** `--space-1` (4px) (tight vertical rhythm, the timeline line connects them)
- **Border-radius:** `--radius-lg` (8px)
- **Cursor:** pointer

#### VersionCard States

| State    | Visual                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Default  | transparent background                                                                          |
| Hover    | `--surface-tertiary` background, `border-radius: var(--radius-lg)`                              |
| Selected | `--surface-primary` background (white), `1px solid var(--border-primary)` border, `--shadow-xs` |
| Current  | "(current)" accent label, accent-colored timeline dot                                           |

#### VersionCard Interaction

- **Click:** Selects this version. Loads its content into the document preview. The card transitions to `selected` state. If diff toggle is on, diff updates.
- **Double-click:** No special behavior.
- **Keyboard:** Arrow Up/Down navigates between versions. Enter selects.

#### Restore Button

- **Visibility:** Appears on the selected VersionCard, below the author, only if it is NOT the current version
- **Text:** "Restore this version"
- **Style:** Tertiary button, `--type-label`, `--accent-primary` color
- **Hover:** `--accent-primary-subtle` background
- **Height:** 28px
- **Padding:** 0 `--space-2` (8px)
- **ARIA:** `aria-label="Restore to version [number]"`
- **Action:** Opens RestoreDialog

### RestoreDialog

- **Component:** Standard dialog (existing v3 dialog pattern)
- **Title:** "Restore to v[N]?" in Source Serif 4 `--type-headline`
- **Body:** "This will create a new version with the content from v[N]. The current content will be preserved as v[current+1]." in DM Sans `--type-body`, `--text-body`.
- **Actions:** "Cancel" (tertiary) + "Restore" (primary, filled purple)
- **Width:** `--dialog-min-width` (360px) to `--dialog-max-width` (480px)
- **Enter animation:** scale 0.95 + opacity 0 to 1, 200ms ease-out
- **Exit animation:** opacity to 0, 150ms ease-in
- **Backdrop:** `var(--surface-overlay)` + `backdrop-filter: blur(8px)`

### Loading State

#### Initial Page Load

- Document preview: skeleton (described above)
- Version timeline: 5 skeleton VersionCards
  - Each: rounded rectangle 60px tall, `--surface-tertiary` shimmer
  - Stacked with `--space-1` (4px) gap
  - Timeline dots: `--border-primary` circles (static, no shimmer)

#### Version Switch

- Document preview: brief opacity dip (opacity 1 to 0.5 to 1, 200ms) as content swaps. No skeleton for version switches (content is typically fast from cache).

### Responsive Behavior

#### 1280px and above (full layout)

Document preview fills remaining space (~960px at 1280). Timeline 320px. Comfortable.

#### 1024-1279px (compact)

Timeline reduces to 280px. Document preview adjusts. Content max-width stays 720px (may have less breathing room).

#### 900-1023px (narrow)

Timeline reduces to 260px. VersionCard change summary limited to 1 line.

#### Below 900px

Unsupported (existing guard).

### Accessibility

- **Page:** `<main>` landmark wrapping the split layout
- **Document preview:** `role="region"`, `aria-label="Document preview"`, `aria-live="polite"` (announces when version content changes: "Showing version [N]")
- **Version timeline:** `role="listbox"`, `aria-label="Version list"`. Each VersionCard: `role="option"`, `aria-selected`.
- **Keyboard navigation:**
  - Tab: BackButton -> DiffToggle -> Version list -> (within list: Arrow Up/Down) -> RestoreButton (if visible)
  - Arrow Up/Down in version list: moves selection
  - Enter in version list: selects version (loads preview)
  - Escape: if RestoreDialog is open, closes it
- **Focus management:** On page load, focus is on the version list with the current version selected. On restore, focus returns to the version list after the dialog closes.
- **Screen reader:** Diff toggle state announced ("Changes visible" / "Changes hidden"). Version selection announced ("Showing version [N], created [date] by [author]").

### Motion

| Interaction            | Animation                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Page enter             | Content: opacity 0 + translateY(4px) to normal, 200ms ease-out (existing PageTransition)                        |
| Version select         | Document preview: opacity dip 1 to 0.5 to 1, 200ms ease. Timeline card: background-color transition 150ms ease. |
| Timeline dot selection | Fill color transition, 200ms `--ease-standard`                                                                  |
| Diff toggle            | Diff highlights fade in/out, 200ms ease                                                                         |
| RestoreDialog open     | scale 0.95 + opacity 0 to 1, 200ms ease-out                                                                     |
| RestoreDialog close    | opacity to 0, 150ms ease-in                                                                                     |
| Skeleton shimmer       | background-position slide, 1.5s linear infinite                                                                 |
| Reduced motion         | All transitions instant or 100ms max fade. No skeleton shimmer (static gray).                                   |

### Data Flow

- **Page load:** Fetch version list (`GET /templates/:id/versions`) and current version content. Display current version in preview, select it in timeline.
- **Version select:** Fetch version content (`GET /templates/:id/versions/:versionId`). Cache in TanStack Query (versions are immutable).
- **Diff computation:** Client-side diff between selected version content and current version content. Use a lightweight diff library (e.g., `diff-match-patch` or `jsdiff`). Diff computed on demand when toggle is on.
- **Restore:** `POST /templates/:id/versions/:versionId/restore`. Creates a new version. On success, refresh version list and navigate to editor (`/templates/:id`).

---

## Migration Notes

### Components to Modify

| Component            | Change                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `TopAppBar`          | Add `documentHeader` prop; render it instead of default layout when provided                                                             |
| `EditorToolbar`      | Remove Source/Review toggle. Keep markdown helpers, word count, connection status. May become optional in review mode.                   |
| `TemplateEditorPage` | Replace SlideOverPanel usage with inline comment margin. Remove PanelToggleButtons. Wire DocumentHeader. Remove title from content area. |
| `PanelToggleButtons` | Remove from editor page (keep component if used elsewhere)                                                                               |
| `SlideOverPanel`     | Remove from editor page (keep component if used elsewhere)                                                                               |
| `MetadataTab`        | Remove (metadata now in DocumentHeader and MetadataPopover)                                                                              |
| `CommentsTab`        | Refactor: extract comment thread UI into InlineCommentCard                                                                               |
| `VersionHistory`     | Refactor into VersionHistoryPage (full-screen)                                                                                           |

### New Components

| Component             | Location                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| `DocumentHeader`      | `packages/web/src/components/DocumentHeader.tsx`                            |
| `TitleInput`          | `packages/web/src/components/TitleInput.tsx` (or inline in DocumentHeader)  |
| `MetadataPopover`     | `packages/web/src/components/MetadataPopover.tsx`                           |
| `InlineCommentMargin` | `packages/web/src/components/InlineCommentMargin.tsx`                       |
| `InlineCommentCard`   | `packages/web/src/components/InlineCommentCard.tsx`                         |
| `VersionHistoryPage`  | `packages/web/src/pages/VersionHistoryPage.tsx`                             |
| `VersionTimeline`     | `packages/web/src/components/VersionTimeline.tsx`                           |
| `VersionCard`         | `packages/web/src/components/VersionCard.tsx`                               |
| `DocumentPreview`     | `packages/web/src/components/DocumentPreview.tsx`                           |
| `RestoreDialog`       | `packages/web/src/components/RestoreDialog.tsx`                             |
| `DiffToggle`          | `packages/web/src/components/DiffToggle.tsx` (or inline in DocumentPreview) |

### New Route

```
/templates/:id/history → VersionHistoryPage
```

### Components to Delete (from editor page usage)

- Info panel toggle button usage
- Comments panel toggle button usage (from app bar)
- History panel toggle button usage (from app bar)
- Title input in content area (moved to DocumentHeader)
