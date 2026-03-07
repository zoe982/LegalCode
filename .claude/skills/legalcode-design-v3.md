---
name: legalcode-design-v3
description: LegalCode v3 design system — the definitive UI spec. Covers layout, color, typography, components, motion, and all page-level designs. Reference before writing ANY component, layout, or styling code. This supersedes legalcode-design.md and legalcode-redesign-v2.md.
---

# LegalCode v3 — Complete Design Specification

LegalCode is a professional legal template management PWA for desktop, built by Acasus. It stores, versions, and collaboratively edits markdown-based legal templates. This is a radical redesign: no sidebar, card-grid template list, full-bleed editor, inline commenting, and a neutral gray/white aesthetic with restrained brand accents.

**Aesthetic target:** Linear, Notion, Google Docs. Clean, professional, modern, fast. A document tool that happens to be beautiful.

---

## 1. Design Principles

1. **Document-first.** The template is the center of gravity. Everything else — navigation, metadata, comments, presence — serves the document. If a UI element competes with the document for attention, the element loses.

2. **Clean, not warm.** This is a modern SaaS tool, not a leather-bound study. Neutral surfaces with a barely perceptible warm-purple tint. Acasus purple and beige appear as accents — a branded button, the logo, a highlight — never as dominant surfaces. The app should feel like Linear or Notion, not a vintage stationery brand.

3. **Minimal chrome.** Default to the least amount of UI. No sidebar. No persistent panels. The top bar is thin. Panels appear on demand and disappear on dismissal. Maximum screen real estate for the document.

4. **Precise, not decorative.** Every visual element earns its place. Motion is functional. Color is semantic. Nothing is added for aesthetics alone.

### Brand Signature: Legal Elegance

LegalCode's one unforgettable visual signature is **serif in a sea of sans-serif**. While every modern SaaS tool uses a geometric sans for everything, LegalCode uses Source Serif 4 — the same typeface used in the editor — for the dark purple Acasus wordmark, all document titles, page headings, dialog titles, and empty-state headlines. This creates a through-line of typographic authority that says "legal document tool" at a glance.

**How it manifests:**

- **Wordmark:** "Acasus" in Source Serif 4, weight 600, `#451F61`. The only dark purple text in the app.
- **Document titles:** Template card titles, editor title input, version history entries — all Source Serif 4. Documents feel like documents even before you open them.
- **Structural headings:** Dialog titles, empty-state headings, page heroes — Source Serif 4. The serif is the app's voice of authority.
- **UI chrome:** Everything else (buttons, labels, navigation, metadata) uses DM Sans — clean, geometric, deliberately neutral. The contrast between serif headings and sans-serif chrome is the design signature.
- **Beige touch:** `#EFE3D3` appears only as a hairline accent — a 1px top border on the app bar, the background tint of empty-state illustrations, or a hover state on the wordmark. Never as a surface. Never cartoonish.

The result: LegalCode looks like a modern SaaS tool that happens to have the typographic confidence of a law firm letterhead.

---

## 2. Color System

### Brand Colors (reference only — used sparingly)

```
--brand-beige:         #EFE3D3     /* logo accent, occasional warm touches */
--brand-light-purple:  #8027FF     /* primary interactive color */
--brand-dark-purple:   #451F61     /* logo, rare structural accents */
--brand-orange:        #FF0000     /* destructive only — never for UI */
```

### Surface Tokens

```
--surface-primary:      #FFFFFF     /* main app background, editor surface */
--surface-secondary:    #F9F9FB     /* card backgrounds, subtle containers */
--surface-tertiary:     #F3F3F7     /* hover states, input backgrounds */
--surface-elevated:     #FFFFFF     /* dialogs, popovers, dropdowns */
--surface-sunken:       #F3F3F7     /* code blocks, inset areas */
--surface-overlay:      rgba(0, 0, 0, 0.5)  /* dialog backdrop */
```

### Text Tokens

```
--text-primary:         #12111A     /* headings, primary content */
--text-body:            #37354A     /* body text, descriptions */
--text-secondary:       #6B6D82     /* secondary labels, metadata */
--text-tertiary:        #9B9DB0     /* placeholders, disabled text */
--text-on-purple:       #FFFFFF     /* text on purple buttons */
--text-on-dark:         #FFFFFF     /* text on dark surfaces */
--text-link:            #8027FF     /* inline links */
```

### Interactive Tokens

```
--accent-primary:       #8027FF     /* buttons, links, active states, focus */
--accent-primary-hover: #6B1FDB     /* hover on primary buttons */
--accent-primary-active:#5A18B8     /* active/pressed */
--accent-primary-subtle:#8027FF0F   /* 6% — subtle selection backgrounds */
--accent-primary-ring:  #8027FF33   /* 20% — focus ring */
--accent-beige:         #EFE3D3     /* brand touch in logo area, rare accents */
```

### Border Tokens

```
--border-primary:       #E4E5ED     /* card borders, dividers */
--border-secondary:     #F3F3F7     /* very subtle separators */
--border-hover:         #D1D2DE     /* border on hover */
--border-focus:         #8027FF     /* focus ring border */
--border-input:         #D1D2DE     /* form input borders */
```

### Status Tokens

```
--status-draft:         #D97706     /* amber text */
--status-draft-bg:      #FEF3C7     /* amber background */
--status-draft-border:  #FDE68A     /* amber border */

--status-published:     #059669     /* green text */
--status-published-bg:  #D1FAE5     /* green background */
--status-published-border: #A7F3D0  /* green border */

--status-archived:      #6B6D82     /* gray text */
--status-archived-bg:   #F3F3F7     /* gray background */
--status-archived-border: #E4E5ED   /* gray border */
```

### Destructive Tokens

```
--destructive:          #DC2626     /* destructive button bg, error text */
--destructive-hover:    #B91C1C     /* destructive hover */
--destructive-subtle:   #FEE2E2     /* destructive background */
--destructive-border:   #FECACA     /* destructive border */
```

### Comment Highlight Tokens

```
--comment-highlight:       #FBBF2433  /* 20% amber — unresolved comment highlight */
--comment-highlight-hover: #FBBF2444  /* 27% amber — hover on highlighted text */
--comment-resolved:        #FBBF240F  /* 6% amber — resolved comment highlight */
--comment-active:          #FBBF2455  /* 33% amber — actively focused comment */
```

### Collaboration Cursor Tokens

```
--cursor-1:             #E63946
--cursor-2:             #457B9D
--cursor-3:             #2A9D8F
--cursor-4:             #E9C46A
--cursor-5:             #6A4C93
```

### Shadow Tokens

```
--shadow-xs:    0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-sm:    0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-md:    0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)
--shadow-lg:    0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04)
--shadow-xl:    0 20px 25px rgba(0, 0, 0, 0.08), 0 8px 10px rgba(0, 0, 0, 0.04)
--shadow-panel: 0 0 40px rgba(0, 0, 0, 0.12)
```

### Color Usage Rules

1. **Warm gray/white is the app's identity.** Neutral surfaces with a barely perceptible purple-warm tint everywhere. No beige surfaces. No dark purple surfaces.
2. **Purple (#8027FF) is for interaction.** Buttons, links, focus rings, active indicators, toggle states. Never as a large surface.
3. **Dark purple (#451F61) appears only** in the Acasus logo wordmark and very rare structural moments. It is NOT a text color for the app — use the neutral gray text scale.
4. **Beige (#EFE3D3) appears only** in the logo and as an occasional warm accent (e.g., avatar ring, brand moment). NOT a surface color.
5. **Red is destructive only.** Delete, critical errors. Never for publish or attention-grabbing.
6. **No gradients.** Flat surfaces. Depth from elevation and shadows.

---

## 3. Typography

### Font Stack

- **Display / Headings / Template titles:** Source Serif 4 (variable weight)
- **Body / UI / Labels / Navigation:** DM Sans (variable weight) — geometric with warm personality, distinctive without being decorative, excellent pairing with Source Serif 4
- **Editor body text:** Source Serif 4 (variable weight) — documents should feel like documents
- **Monospace / Source mode:** JetBrains Mono

### Type Scale

```
--type-display:       Source Serif 4, 1.875rem/2.375rem,     700    /* 30px — page hero, empty states */
--type-headline:      Source Serif 4, 1.5rem/2rem,            600    /* 24px — dialog titles, section heads */
--type-title:         Source Serif 4, 1.125rem/1.5rem,        600    /* 18px — card titles, template names */
--type-subtitle:      DM Sans, 0.875rem/1.25rem,                600    /* 14px — section labels, nav items */
--type-body:          DM Sans, 0.875rem/1.5rem,                 400    /* 14px — body text, descriptions */
--type-body-medium:   DM Sans, 0.875rem/1.5rem,                 500    /* 14px — emphasized body */
--type-label:         DM Sans, 0.8125rem/1.125rem,              500    /* 13px — form labels, tab labels */
--type-caption:       DM Sans, 0.75rem/1rem,                    400    /* 12px — timestamps, metadata */
--type-caption-caps:  DM Sans, 0.6875rem/1rem,                  600, tracking 0.05em, uppercase  /* 11px — status badges, category */
--type-mono:          JetBrains Mono, 0.8125rem/1.375rem,     400    /* 13px — source mode editor */
--type-editor-body:   Source Serif 4, 1rem/1.75rem,           400    /* 16px — review mode rendered content */
--type-editor-h1:     Source Serif 4, 1.75rem/2.25rem,        700    /* 28px — review mode H1 */
--type-editor-h2:     Source Serif 4, 1.375rem/1.875rem,      600    /* 22px — review mode H2 */
--type-editor-h3:     Source Serif 4, 1.125rem/1.5rem,        600    /* 18px — review mode H3 */
```

### Typography Rules

- Template titles and document headings: Source Serif 4. Documents should feel like documents.
- All UI chrome (buttons, nav, labels, inputs): DM Sans.
- Editor body in review mode: Source Serif 4 for a typeset-document feel.
- Editor body in source mode: JetBrains Mono.
- Never below weight 400.
- Letter-spacing only on `--type-caption-caps`. Never on body or headings.
- Line height: 1.5x for UI body, 1.75x for editor body (generous reading column).

---

## 4. Layout — No Sidebar, Top Bar Only

### Architecture

```
+------------------------------------------------------------+
|                    Top App Bar (48px)                       |
+------------------------------------------------------------+
|                                                            |
|                                                            |
|                   Central Workspace                        |
|                      flex-1                                |
|                                                            |
|                  White (#FFFFFF)                            |
|                                                            |
|                                                            |
+------------------------------------------------------------+
```

There is NO sidebar. There is NO persistent right pane. The entire viewport below the top bar is the workspace.

### Top App Bar (48px)

**Height:** 48px. Thin, precise, stays out of the way.

**Background:** `#FFFFFF` with `1px solid var(--border-primary)` bottom border. No shadow.

**Contents vary by page:**

#### Template List Page — Top Bar

```
[Acasus wordmark]                              [? Help] [Avatar]
```

- Left: Acasus wordmark (Source Serif 4, 600, 1rem, `#451F61`). The wordmark is the ONLY place dark purple appears prominently. Clicking it navigates to `/templates`.
- Right: Help icon button (optional, `--text-secondary`, 20px), user avatar (32px, circular).

#### Template Editor Page — Top Bar

```
[Acasus] / [Templates] / [Template Name]    [Info] [Comments] [History]  [Presence] [Create Version] [Avatar]
```

- Left: Acasus wordmark (small, 0.8125rem, `#451F61`, clickable to home) + breadcrumb separator `/` (`--text-tertiary`) + "Templates" (DM Sans, `--type-label`, `--text-secondary`, clickable link) + `/` + template name (DM Sans, `--type-label`, `--text-primary`, truncated with ellipsis at 300px max-width).
- Center-right: Toggle panel icon buttons (see Section 8) — Info (`InfoOutlined`), Comments (`ChatBubbleOutlineRounded`), History (`HistoryRounded`). Each 32px touch target, 20px icon, `--text-secondary`, hover `--text-primary`. Active (panel open): `--accent-primary` icon color, `--accent-primary-subtle` background circle.
- Right: Presence avatars (see Section 9.8), "Create Version" button (secondary style), user avatar with dropdown menu.

### Avatar Dropdown Menu

Triggered by clicking the user avatar in the top bar. Opens below-left of the avatar.

**Contents:**

```
[Avatar 40px]  Joseph Marsico
               joseph.marsico@acasus.com
─────────────────────────────
Admin
Settings
─────────────────────────────
Log out
```

- User info section: avatar (40px), name (`--type-body-medium`), email (`--type-caption`, `--text-secondary`).
- Menu items: DM Sans `--type-body`, `--text-body`. Hover: `--surface-tertiary` background.
- Dividers: `1px solid var(--border-primary)`.
- "Log out" in `--destructive` text color.
- Menu width: 240px. Background: `--surface-elevated`. Border: `1px solid var(--border-primary)`. Border-radius: 12px. Shadow: `--shadow-lg`.

### Responsive Breakpoints

**1280px and above — full layout:**

- All features available
- Card grid: 3 columns
- Slide-over panels: 400px width

**1024-1279px — compact:**

- Card grid: 2 columns
- Slide-over panels: 360px width
- Editor max-width slightly reduced

**900-1023px — narrow:**

- Card grid: 2 columns (narrower cards)
- Slide-over panels: 320px width
- Breadcrumb truncates template name aggressively

**Below 900px — unsupported:**

- Centered notice: "LegalCode is designed for desktop. Please use a wider window."
- No attempt at mobile layout.

---

## 5. Template List Page (Card Grid)

### Page Layout

- Background: `--surface-primary` (`#FFFFFF`)
- Content area: max-width 1120px, centered, padding 32px horizontal, 24px top
- No page title displayed (the breadcrumb/wordmark in the top bar is sufficient)

### Search & Filter Bar

Sticky at top of content area when scrolling. Background: `--surface-primary`. Bottom padding: 16px.

**Search input:**

- Full width of content area
- Height: 40px
- Background: `--surface-secondary` (`#F9F9FB`)
- Border: `1px solid var(--border-primary)`. Border-radius: 10px
- Placeholder: "Search templates..." in `--text-tertiary`, DM Sans 0.875rem
- Search icon: 18px, `--text-tertiary`, left-positioned with 12px padding
- On focus: border `--border-focus` (`#8027FF`), `0 0 0 3px var(--accent-primary-ring)` ring
- Clear button (X) appears when input has value

**Filter row (below search, 12px gap):**

- Left: filter chips in a horizontal row, 8px gap
- Right: sort control

**Filter chips:**

- Idle: `--surface-secondary` background, `--text-secondary` text, `1px solid var(--border-primary)` border. Pill shape (border-radius: 9999px). Padding: 5px 14px. DM Sans 0.8125rem weight 500.
- Active: `--accent-primary` background, `--text-on-purple` text, no border needed. Same pill shape.
- Hover (idle): `--surface-tertiary` background.
- Filter types: Status (Draft/Published/Archived), Category, more as needed.
- Chips with dropdown: chevron-down icon 14px after label. Click opens dropdown below chip.

**Sort control:**

- Text button: "Recently edited" + chevron-down 14px. DM Sans 0.8125rem weight 500, `--text-secondary`.
- Click opens dropdown: Recently edited, Alphabetical, Oldest first.
- Dropdown: `--surface-elevated`, `--border-primary` border, border-radius 10px, `--shadow-md`. Items: DM Sans `--type-body`, 36px height, hover `--surface-tertiary`.

### Card Grid

**Grid layout:**

- CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
- Gap: 16px
- Results in 3 columns at full width, 2 columns at compact

**Card dimensions:**

- Min-height: 140px (content-driven, not fixed)
- Background: `--surface-primary` (`#FFFFFF`)
- Border: `1px solid var(--border-primary)`
- Border-radius: 12px
- Padding: 20px
- No shadow at rest

**Card contents:**

```
[Category tag]                      [Status badge]

Template Title Goes Here
This is the subtitle or description text that
provides context about the template...

[Last edited 2h ago]  [v12]  [3 comments]
```

- **Top row:** Category tag (left) + status badge (right)
  - Category: `--type-caption-caps`, `--text-secondary`. No background — just uppercase text.
  - Status badge: see Section 9.4

- **Title:** Source Serif 4, `--type-title` (1.125rem, weight 600, `--text-primary`). Max 2 lines, ellipsis overflow. 8px below top row.

- **Description/subtitle (optional):** DM Sans `--type-body`, `--text-secondary`. Max 2 lines, ellipsis. 4px below title. This could be a description field or auto-generated from first paragraph.

- **Bottom row (metadata):** 12px above bottom edge. DM Sans `--type-caption`, `--text-tertiary`.
  - Last edited relative time ("2h ago")
  - Separator dot
  - Version ("v12")
  - Separator dot (if comments exist)
  - Comment count with icon ("3" + chat icon 14px) — only if > 0

**Card hover:**

- Border: `--border-hover` (`#D1D2DE`)
- Shadow: `--shadow-sm`
- Transition: 150ms ease

**Card active/pressed:**

- Scale: 0.99
- Transition: 80ms ease

**Card click:** navigates to `/templates/:id`

### "New Template" Button

**Position:** Top-right of the content area, on the same row as the search bar (or above the grid if search is full-width).

**Alternative:** Floating action position — fixed to bottom-right of viewport, 24px from edges. This is the preferred placement.

**Style:** Primary button (filled purple). Icon: `+` 20px. Label: "New template". Height: 40px. Padding: 0 20px. Border-radius: 10px.

**If floating:** circular, 56px diameter, `--accent-primary` background, white `+` icon 24px, `--shadow-lg`. Hover: `--accent-primary-hover`, `--shadow-xl`. This is the ONLY purple surface in the entire list view — it immediately draws the eye to the primary action.

**Decision: Use the inline button (top-right, next to search), NOT floating.** Place it on the right side of the filter row or as an independent row above the grid.

**Final placement:**

```
[Search input................................]  [+ New template]
[Status] [Category] [More filters]    [Sort: Recently edited v]
```

The "New template" button sits right of the search input, same row. Height matches search input (40px). This keeps the top of the page as a single action bar.

### Empty State

Centered vertically and horizontally in the content area.

- Icon: document outline, 48px, `--text-tertiary`
- Heading: "No templates yet" — Source Serif 4, `--type-headline`, `--text-primary`
- Subtext: "Create your first template to get started." — DM Sans `--type-body`, `--text-secondary`. 8px below heading.
- Button: "Create template" — primary style (filled purple). 16px below subtext.

---

## 6. Template Editor Page (Full-Bleed)

### Layout

The editor takes the full viewport width below the top bar. No sidebar, no persistent panels. The writing surface IS the page.

```
+------------------------------------------------------------+
|  [Acasus] / Templates / Doc name   [i][c][h] [CV] [Avatar] |  <- 48px top bar
+------------------------------------------------------------+
|  [Source | Review]  [H][Link][List][Table][§][{}][—]  [wc]  |  <- 44px toolbar
+------------------------------------------------------------+
|                                                            |
|              max-width: 720px, centered                    |
|                                                            |
|    Template Title                                          |
|                                                            |
|    Content content content content content content         |
|    content content content content content content         |
|    content content content content content content         |
|                                                            |
|                                                            |
+------------------------------------------------------------+
```

### Editor Title

- Borderless, no-chrome input at the top of the content column
- Source Serif 4, 1.75rem (28px), weight 700, `--text-primary`
- Placeholder: "Untitled" in `--text-tertiary`
- No border, no background, no label. It looks like the first line of a document.
- On focus: no visible ring — it is always editable, always looks like a heading.
- Padding-bottom: 24px. Below the title, a `1px solid var(--border-secondary)` separator, then 24px to content.

### Editor Toolbar (44px)

Sits between the top bar and the content. Sticky below the top bar.

**Background:** `--surface-primary` with `1px solid var(--border-primary)` bottom border.
**Padding:** 0 max(24px, calc((100vw - 720px) / 2)) — aligns with the content column.

**Left: Mode toggle**

- Two-segment toggle: Source | Review
- Container: `--surface-tertiary` background, border-radius 8px, padding 3px, `1px solid var(--border-primary)` border.
- Active segment: `--surface-primary` background, `--text-primary` text, border-radius 6px, `--shadow-xs`. Weight 600.
- Inactive segment: transparent background, `--text-secondary` text. Weight 500.
- Segment padding: 6px 16px. DM Sans `--type-label`.
- Transition between segments: 200ms ease.

**Center: Markdown helpers (Source mode only, hidden in Review mode)**

- Icon buttons in a row, 8px gap. Each: 32px touch target, 20px icon, `--text-secondary`.
- Hover: `--surface-tertiary` background, `--text-primary` icon. Border-radius: 6px.
- Active (pressed): `--accent-primary-subtle` background, `--accent-primary` icon.
- Helpers (left to right):
  1. Heading — dropdown (H1, H2, H3) on click
  2. Link — `Ctrl/Cmd+K`
  3. Ordered list
  4. Unordered list
  5. Table
  6. Clause reference `{{clause:}}` — legal-specific
  7. Variable `{{var:}}` — legal-specific
  8. Horizontal rule
- Thin `1px solid var(--border-secondary)` vertical separator between general tools (1-5) and legal-specific tools (6-7), and before horizontal rule (8). Separator height: 20px, vertically centered.
- Every icon has a tooltip (400ms delay) showing name + shortcut.

**Right: Word count + Connection status**

- Word count: DM Sans `--type-caption`, `--text-tertiary`. E.g., "1,247 words".
- Connection status: see Section 9.7.
- 16px gap between word count and status.

### Source Mode

- Background: `--surface-primary` (`#FFFFFF`)
- Content column: max-width 720px, centered horizontally with `margin: 0 auto`
- Padding: 32px 0 (top/bottom), side padding handled by centering
- Font: JetBrains Mono, `--type-mono` (0.8125rem, line-height 1.375rem, weight 400)
- Text color: `--text-body`
- Syntax highlighting:
  - Headings: `--text-primary`, weight 600
  - Links: `--accent-primary`
  - Emphasis: italic (same color)
  - Code spans: `--surface-sunken` background, border-radius 4px, 2px 6px padding
  - Variables/placeholders (`{{...}}`): `--accent-primary` text, `--accent-primary-subtle` background, border-radius 4px
- Line numbers: `--text-tertiary`, right-aligned, 48px gutter width, 16px gap to content. DM Sans `--type-caption`.

### Review Mode

- Background: `--surface-primary` (`#FFFFFF`)
- Content column: max-width 720px, centered
- Padding: 32px 0
- Rendered markdown with editorial typography:
  - H1: Source Serif 4, `--type-editor-h1`, `--text-primary`. 32px margin-top, 16px margin-bottom.
  - H2: Source Serif 4, `--type-editor-h2`, `--text-primary`. 28px margin-top, 12px margin-bottom.
  - H3: Source Serif 4, `--type-editor-h3`, `--text-primary`. 24px margin-top, 8px margin-bottom.
  - Body: Source Serif 4, `--type-editor-body` (1rem/1.75). `--text-body`. Paragraph spacing: 16px.
  - Lists: 24px left indent, 8px between items.
  - Tables: full column width, `1px solid var(--border-primary)` borders, 12px 16px cell padding, `--surface-secondary` header row.
  - Blockquotes: 3px `--border-primary` left border, 16px left padding, `--text-secondary` italic.
  - Code blocks: `--surface-sunken` background, JetBrains Mono, border-radius 8px, 16px padding.
  - Template variables: `--accent-primary` text, `--accent-primary-subtle` background, border-radius 4px, 2px 6px padding.
- Read-only — no direct editing in Review mode.

### Collaboration in Source Mode

- Yjs-powered real-time co-editing
- Cursors: 2px vertical line in user's cursor color, full line height
- Name flag at cursor top: user's cursor color background, white `--type-caption` text, border-radius 4px top corners. Appears on movement, fades to 50% opacity after 3s inactivity.
- Selections: user's cursor color at 12% opacity background

---

## 7. Inline Comments System (Google Docs Style)

This is a critical feature. Comments are anchored to text selections in the document and displayed in a slide-over panel.

### Creating a Comment

**Step 1: Select text in Review mode**

- User selects text in the rendered review content.
- A floating action button appears near the top-right of the selection.

**Floating comment button:**

- Appears 8px above and to the right of the selection end point
- Contains: chat bubble icon (18px) + "Comment" label
- Style: `--surface-elevated` background, `1px solid var(--border-primary)` border, `--shadow-md`, border-radius 8px, padding 6px 12px
- Text: DM Sans `--type-label`, `--accent-primary` color
- Icon: `--accent-primary`, 18px
- Hover: `--accent-primary-subtle` background
- Disappears if selection is cleared
- Keyboard shortcut: `Ctrl+Alt+M` / `Cmd+Opt+M` (works without needing to click the button)

**Step 2: Comment input appears**

- Clicking the button (or using the shortcut) opens the Comments slide-over panel (see Section 8) with a new comment thread pre-focused.
- The selected text is highlighted with `--comment-active` background.
- A new comment input appears at the top of the Comments panel:

**New comment input:**

```
+------------------------------------------+
| [Avatar 24px]  Your name                 |
|                                          |
| [Comment text area......................]  |
| [.....................................] |
|                                          |
|              [Cancel]  [Comment]         |
+------------------------------------------+
```

- **Anchor quote:** Above the input, show the selected text in a quote block. DM Sans `--type-caption`, italic, `--text-secondary`, max 2 lines with ellipsis, left border 2px `--border-primary`, 8px left padding.
- **Text area:** Auto-expanding, min-height 64px, max-height 200px. DM Sans `--type-body`. Border: `1px solid var(--border-primary)`, border-radius 8px, padding 10px 12px. Focus: `--border-focus` border.
- **Buttons:** "Cancel" (tertiary), "Comment" (primary, disabled until text entered). Right-aligned, 8px gap.
- On submit: comment is created, highlight transitions from `--comment-active` to `--comment-highlight`, panel shows the new thread.

### Comment Highlights in Document

Comments highlight the anchored text range in the review-mode document.

**Unresolved comment:**

- Background: `--comment-highlight` (20% amber)
- On hover: `--comment-highlight-hover` (27% amber) + cursor: pointer
- On click: opens Comments panel and scrolls to/focuses the corresponding thread

**Resolved comment:**

- Background: `--comment-resolved` (6% amber) — barely visible
- Same hover/click behavior, but thread shows as resolved

**Actively focused comment:**

- Background: `--comment-active` (33% amber)
- Applied when the comment thread is focused in the panel, or when creating a new comment

**Overlapping comments:**

- If two comment ranges overlap, backgrounds combine additively
- The most recently clicked comment's thread takes focus

### Comment Indicators

In review mode, small indicators appear in the right margin (outside the max-width content column, 24px to the right of the text edge):

- Small circle: 8px diameter, `--status-draft` (amber) fill for unresolved, `--text-tertiary` for resolved
- Vertically aligned with the first line of the commented text
- Click: same behavior as clicking the highlight (opens panel, focuses thread)
- When multiple comments are on adjacent lines, indicators stack with 4px gap minimum
- These indicators provide a "heat map" of comment density

### Comment Anchoring (Architecture)

**This is critical infrastructure. Must be designed before implementation.**

- Comments anchor to a stable position identifier, NOT raw character offsets
- Use block-level identifiers from the markdown AST (e.g., paragraph index + character range within that paragraph, or heading path + offset)
- When the anchored text is edited in Source mode, the comment anchor must update:
  - If the exact text still exists, anchor stays
  - If the text was modified but the structural block exists, anchor to the block with a "text changed" indicator
  - If the anchored block was deleted, the comment becomes "orphaned" — displayed at the top of the Comments panel with a warning: "The text this comment was attached to has been removed." Author can reattach or dismiss.
- Consider using Yjs relative positions for anchor stability during collaborative editing

### Comment Keyboard Shortcut

- `Ctrl+Alt+M` / `Cmd+Opt+M` — Create comment on selected text (Review mode only)
- If no text is selected, shortcut does nothing (no error, no toast)
- If in Source mode, shortcut does nothing

---

## 8. Toggle Panels (Slide-Over)

Three panels toggled by icon buttons in the top bar. Only one panel can be open at a time. Panels overlay the editor content — they do NOT shrink the editor.

### Panel Behavior

- **Open:** slides in from the right edge of the viewport. 300ms ease-out.
- **Close:** slides out to the right. 200ms ease-in. Close triggers: click the toggle button again, press Escape, click outside the panel (on the content area).
- **Panel width:** 400px (1280px+), 360px (1024-1279px), 320px (900-1023px).
- **Panel height:** full viewport height minus top bar (calc(100vh - 48px)).
- **Position:** fixed, right: 0, top: 48px.
- **Background:** `--surface-primary`. Border-left: `1px solid var(--border-primary)`. Shadow: `--shadow-panel`.
- **Scrim:** Semi-transparent overlay over the content area when panel is open: `rgba(0, 0, 0, 0.1)`. Click to close. Fade in 200ms.
- **Z-index:** `--layer-pane` (40).

### Panel Header

Each panel has a consistent header:

- Height: 52px
- Padding: 0 20px
- Bottom border: `1px solid var(--border-primary)`
- Left: Panel title (DM Sans `--type-subtitle`, `--text-primary`)
- Right: Close button (X icon, 20px, `--text-secondary`, hover `--text-primary`)

### Info Panel (Metadata)

Toggle icon: `InfoOutlined` (20px)

**Contents:**

```
Info
─────────────────────────
Status          [Draft badge] [Publish button]
─────────────────────────
Category        Employment Contracts
Company         Acasus
Country         Switzerland
Tags            [NDA] [Confidential] [x]
─────────────────────────
Created         Mar 3, 2026  by Joseph Marsico
Last modified   2 hours ago
Version         v12
```

- **Status section:** status badge + action button
  - Draft: "Publish" button (primary, filled purple)
  - Published: "Archive" button (outlined, `--text-secondary`)
  - Archived: no action
- **Field layout:** label on left (`--type-label`, `--text-secondary`), value on right (`--type-body`, `--text-primary`). Each row: 40px height, hover `--surface-tertiary` for editable fields.
- **Editable fields:** Category, Company, Country, Tags. Click to edit inline (value becomes input). Tags show as small pills with X to remove, + to add.
- **Non-editable:** Created, Last modified, Version. `--type-caption`, `--text-secondary`.
- **Publish confirmation dialog:** "Publishing makes this template available across the organization. Continue?" with Cancel (tertiary) + Publish (primary).

### Comments Panel

Toggle icon: `ChatBubbleOutlineRounded` (20px). Badge: unresolved count (if > 0) — small `--accent-primary` circle with white count text, positioned top-right of icon.

**Header extras:**

- Right of title: total count / unresolved count. E.g., "12 comments, 3 unresolved" (`--type-caption`, `--text-secondary`).
- "Show resolved" toggle switch (compact, right-aligned).

**Thread list (ordered by position in document, top to bottom):**

Each thread:

```
+------------------------------------------+
| "The indemnification clause should..."   |  <- anchor quote
+------------------------------------------+
| [Avatar 24px]  Jane Smith     2h ago     |
| This needs to be reviewed by legal.      |
|                                          |
|   [Avatar 20px]  John Doe    1h ago      |
|   Agreed, I'll flag it for the team.     |
|                                          |
| [Reply input: "Reply..."]               |
|                            [Resolve ✓]  |
+------------------------------------------+
```

- **Anchor quote:** clickable — scrolls the review-mode document to the highlighted text and applies `--comment-active` briefly (1s flash). DM Sans `--type-caption`, italic, `--text-secondary`, max 2 lines, left border 2px `--comment-highlight`, 8px left padding. Cursor: pointer.

- **Author row:** avatar (24px, circular) + name (DM Sans `--type-label`, weight 600) + timestamp (DM Sans `--type-caption`, `--text-tertiary`). Gap: 8px between avatar and name, auto-space to timestamp.

- **Comment text:** DM Sans `--type-body`, `--text-body`. Padding-left: 32px (aligned with text, not avatar).

- **Replies:** indented. Avatar 20px. Same format, smaller. Padding-left: 48px from thread edge. Max visual indent: 2 levels (no deeply nested replies).

- **Reply input:** compact single-line input. Placeholder "Reply..." in `--text-tertiary`. Expands to multi-line on focus with Submit button. Padding-left: 32px.

- **Actions per comment:**
  - Resolve (thread-level): checkmark icon + "Resolve" text, `--text-secondary`. Positioned bottom-right of thread. Hover: `--accent-primary`.
  - Edit own comment: pencil icon, visible on hover of your own comment. `--text-tertiary`, hover `--text-secondary`.
  - Delete own comment: trash icon, visible on hover of your own comment. `--text-tertiary`, hover `--destructive`.

- **Thread dividers:** `1px solid var(--border-secondary)` between threads, 16px vertical margin.

**Thread states:**

- **Open (unresolved):** full opacity, strong document highlight.
- **Resolved:** collapsed to single line: checkmark icon + "[Author] resolved this thread" (`--type-caption`, `--text-tertiary`). Click to expand and see full thread. Document highlight fades to `--comment-resolved`.
- **Focused:** when navigated to from clicking a document highlight, thread briefly flashes with `--accent-primary-subtle` background (400ms fade-out).
- **Orphaned:** yellow warning bar at top of thread: "The anchored text was removed. [Reattach] [Dismiss]". Displayed at the top of the thread list, separated from positional threads.

**Empty state:**

- Icon: chat bubble outline, 40px, `--text-tertiary`
- "No comments yet" — DM Sans `--type-body-medium`, `--text-primary`
- "Select text in Review mode and press Cmd+Opt+M to comment." — DM Sans `--type-caption`, `--text-secondary`

### Version History Panel

Toggle icon: `HistoryRounded` (20px)

**Thread list (newest first):**

Each version entry:

```
[Timeline dot]─── v12 (current)              2h ago
                  Updated indemnification clause
                  by Jane Smith

[Timeline dot]─── v11                        1 day ago
                  Added data processing addendum
                  by John Doe
                                       [View diff]
```

- **Timeline:** 1px `--border-primary` vertical line on the left, 24px from panel edge. Small circles (8px) on the line at each version.
- **Current version:** dot filled with `--accent-primary`. "(current)" label in `--accent-primary`.
- **Version number:** DM Sans `--type-label`, weight 600, `--text-primary`.
- **Timestamp:** DM Sans `--type-caption`, `--text-tertiary`. Right-aligned.
- **Change summary:** DM Sans `--type-body`, `--text-body`. Below version number.
- **Author:** DM Sans `--type-caption`, `--text-secondary`. "by [Name]".
- **"View diff" link:** DM Sans `--type-label`, `--accent-primary`. Appears on hover of the version entry. Navigates to `/templates/:id/diff/:v1/:v2`.
- **"Restore" action:** DM Sans `--type-label`, `--text-secondary`. Appears on hover of non-current versions. Confirmation dialog before restoring.

---

## 9. Component Specifications

### 9.1 Buttons

**Primary (filled purple — rare, only for primary CTA like "Publish", "New template", "Comment"):**

- Background: `--accent-primary`. Text: `--text-on-purple`. Font: DM Sans `--type-label`, weight 600.
- Height: 36px. Padding: 0 16px. Border-radius: 8px. Border: none.
- Hover: `--accent-primary-hover`. Active: `--accent-primary-active`.
- Disabled: 50% opacity, cursor not-allowed.
- Focus: `0 0 0 3px var(--accent-primary-ring)`.

**Secondary (outlined — most common: "Create Version", "Cancel", etc.):**

- Background: transparent. Text: `--text-primary`. Border: `1px solid var(--border-primary)`.
- Height: 36px. Padding: 0 16px. Border-radius: 8px.
- Hover: `--surface-tertiary` background, `--border-hover` border.
- Focus: `0 0 0 3px var(--accent-primary-ring)`.

**Tertiary (text-only — "Cancel" in dialogs, secondary actions):**

- Background: transparent. Text: `--text-secondary`. Border: none.
- Height: 36px. Padding: 0 12px. Border-radius: 8px.
- Hover: `--surface-tertiary` background, `--text-primary` text.

**Destructive (filled red — only for delete/irreversible):**

- Background: `--destructive`. Text: `--text-on-dark`.
- Height: 36px. Padding: 0 16px. Border-radius: 8px.
- Hover: `--destructive-hover`.

**Icon button (toolbar actions, panel toggles):**

- Size: 32px x 32px. Icon: 20px. Color: `--text-secondary`.
- Hover: `--surface-tertiary` background, `--text-primary` icon. Border-radius: 6px.
- Active: `--accent-primary-subtle` background, `--accent-primary` icon.
- Every icon button MUST have a tooltip (400ms delay).

### 9.2 Inputs

**Text input (form fields in panels, dialogs):**

- Height: 36px. Padding: 0 12px.
- Background: `--surface-primary`. Border: `1px solid var(--border-input)`. Border-radius: 8px.
- Text: DM Sans `--type-body`, `--text-body`.
- Placeholder: `--text-tertiary`.
- Focus: `--border-focus` border + `0 0 0 3px var(--accent-primary-ring)`.
- Error: `--destructive` border + error message below (`--type-caption`, `--destructive`).

**Text area (comment input, version summary):**

- Same styling as text input but multi-line. Min-height: 80px. Resize: vertical.
- Auto-expanding variant: grows with content, max-height constraint.

**Search input:**

- See Template List section (Section 5) for specific styling.

### 9.3 Dialogs

- Max width: 480px. Min width: 360px. Background: `--surface-elevated`.
- Border-radius: 16px. Border: `1px solid var(--border-primary)`. Shadow: `--shadow-xl`.
- Backdrop: `var(--surface-overlay)` + `backdrop-filter: blur(8px)`.
- Title: Source Serif 4, `--type-headline`, `--text-primary`. Padding: 24px 24px 16px.
- Content: padding 0 24px 24px.
- Actions: padding 0 24px 24px. Right-aligned. 8px gap between buttons.
- Enter: scale 0.95 -> 1.0, opacity 0 -> 1, 200ms ease-out.
- Exit: opacity 1 -> 0, 150ms ease-in.

### 9.4 Status Badges

Pill-shaped badges indicating template lifecycle state.

- Shape: border-radius 9999px. Padding: 3px 10px.
- Font: DM Sans `--type-caption-caps`.

```
Draft:      bg: --status-draft-bg     text: --status-draft     border: 1px solid --status-draft-border
Published:  bg: --status-published-bg text: --status-published border: 1px solid --status-published-border
Archived:   bg: --status-archived-bg  text: --status-archived  border: 1px solid --status-archived-border
```

### 9.5 Filter Chips

See Template List section (Section 5).

### 9.6 Avatar

- Size variants: 24px (comments), 28px (presence), 32px (top bar/nav), 40px (avatar menu header)
- Shape: circular (border-radius: 50%)
- Border: 2px solid `--surface-primary` (creates separation when stacked)
- Fallback: initials on `--accent-primary-subtle` background, DM Sans `--type-caption`, `--accent-primary` text
- Image: `object-fit: cover`

### 9.7 Connection Status

Ambient indicator in the editor toolbar. Never modal, never blocking.

- **Connected/Saved:** 8px circle, `--status-published` fill + "Saved" (`--type-caption`, `--text-tertiary`)
- **Saving:** 8px circle, `--status-published` fill, opacity pulse (1 -> 0.5 -> 1, 1.5s) + "Saving..." (`--type-caption`, `--text-tertiary`)
- **Offline:** 8px circle, `--status-draft` fill + "Offline — changes saved locally" (`--type-caption`, `--status-draft`)
- **Reconnecting:** 8px circle, `--status-draft` fill, pulsing + "Reconnecting..." (`--type-caption`, `--text-tertiary`)

### 9.8 Presence Avatars

In the editor top bar, showing who else is viewing/editing.

- Stacked circles, rightmost on top. Size: 28px. Border: 2px solid `--surface-primary`.
- Each avatar's border color becomes their cursor color when editing
- Max 4 visible, then "+N" overflow circle (`--surface-tertiary` background, DM Sans `--type-caption`, `--text-secondary`)
- Hover: tooltip with name + current mode ("Jane — editing" or "John — reviewing")
- Click: scrolls to user's cursor position (source mode only)
- New user arriving: fade in with slight scale (0.8 -> 1.0), 200ms ease-out
- User departing: fade out 200ms

### 9.9 Toast Notifications

- Position: bottom-center, 24px from bottom edge
- Max width: 400px. Min width: 280px.
- Background: `--surface-elevated`. Border: `1px solid var(--border-primary)`. Border-radius: 10px. Shadow: `--shadow-lg`.
- Content: icon (20px, left) + message (DM Sans `--type-body`, `--text-body`) + optional action link (`--accent-primary`)
- Padding: 12px 16px.
- Auto-dismiss: 4 seconds. Progress bar at bottom (1px, `--border-primary` to `--accent-primary`).
- One at a time. New toast replaces previous.
- Enter: translateY(16px) + opacity 0 -> translateY(0) + opacity 1, 200ms ease-out.
- Exit: opacity 1 -> 0, 150ms ease-in.

---

## 10. Motion & Animation

### Spring Configurations (CSS)

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--duration-fast: 150ms;
--duration-standard: 200ms;
--duration-slow: 300ms;
--duration-expressive: 400ms;
```

### Spring Configurations (JS — for Framer Motion or similar)

```javascript
const springStandard = { type: 'spring', stiffness: 500, damping: 35, mass: 1 };
const springFast = { type: 'spring', stiffness: 700, damping: 40, mass: 0.8 };
const springSlow = { type: 'spring', stiffness: 300, damping: 30, mass: 1.2 };
const springExpressive = { type: 'spring', stiffness: 400, damping: 20, mass: 1 };
```

### What Animates

| Element                   | Animation                                     | Timing           |
| ------------------------- | --------------------------------------------- | ---------------- |
| Panel slide in/out        | translateX(100%) -> 0 / 0 -> translateX(100%) | 300ms / 200ms    |
| Panel scrim               | opacity 0 -> 0.1 / 0.1 -> 0                   | 200ms            |
| Card hover                | border-color + shadow                         | 150ms ease       |
| Card press                | scale(0.99)                                   | 80ms ease        |
| Dialog enter              | scale(0.95) + opacity -> 1                    | 200ms ease-out   |
| Dialog exit               | opacity -> 0                                  | 150ms ease-in    |
| Toast enter               | translateY(16) + opacity -> normal            | 200ms ease-out   |
| Toast exit                | opacity -> 0                                  | 150ms ease-in    |
| Mode toggle segment       | background-position slide                     | 200ms ease       |
| Status badge morph        | background-color + text-color                 | springExpressive |
| Presence avatar enter     | scale(0.8) + opacity -> 1                     | 200ms ease-out   |
| Presence avatar exit      | opacity -> 0                                  | 200ms ease-in    |
| Comment highlight appear  | background-color 0% -> 20% opacity            | 200ms ease       |
| Comment highlight resolve | background-color 20% -> 6% opacity            | 400ms ease       |
| Comment focus flash       | accent background pulse                       | 400ms ease-out   |
| Filter chip active        | background-color + text-color                 | 150ms ease       |
| Dropdown open             | opacity + translateY(-4px) -> normal          | 150ms ease-out   |
| Dropdown close            | opacity -> 0                                  | 100ms ease-in    |
| Page content load         | opacity 0 -> 1 + translateY(4px) -> 0         | 200ms ease-out   |

### Hero Moments (springExpressive)

1. **Publishing:** status badge morphs from draft amber to published green. Brief purple flash behind the badge.
2. **New collaborator joining:** avatar enters with slight bounce and scale.
3. **Comment creation:** highlight smoothly appears in the document as the comment is submitted.

### Motion Rules

1. Never animate layout shifts under text being read or written.
2. Respect `prefers-reduced-motion`: instant transitions, fades at 100ms max.
3. No skeleton screens for < 200ms loads.
4. Zero animation on typing. Editor is zero-latency.
5. No scroll-triggered animation.
6. No spinners for autosave (use opacity pulse).
7. No animated illustrations or Lottie.

---

## 11. Spacing & Dimensions

### Spacing Scale (4px base)

```
--space-0.5:    2px
--space-1:      4px
--space-2:      8px
--space-3:     12px
--space-4:     16px
--space-5:     20px
--space-6:     24px
--space-7:     32px
--space-8:     40px
--space-9:     48px
--space-10:    64px
```

### Layout Dimensions

```
--appbar-height:        48px
--toolbar-height:       44px
--editor-max-width:    720px      /* content column for both source and review */
--list-max-width:     1120px      /* template list content area */
--panel-width:         400px      /* slide-over panel width (full) */
--panel-width-md:      360px      /* panel at compact breakpoint */
--panel-width-sm:      320px      /* panel at narrow breakpoint */
--card-min-width:      320px      /* minimum card width in grid */
--dialog-max-width:    480px
--dialog-min-width:    360px
--avatar-menu-width:   240px
--grid-gap:             16px      /* card grid gap */
```

### Radius Tokens

```
--radius-sm:     4px      /* inline code, small chips */
--radius-md:     6px      /* icon buttons, toolbar items */
--radius-lg:     8px      /* buttons, inputs, mode toggle segments */
--radius-xl:    10px      /* cards, search input, toasts, filter chips */
--radius-2xl:   12px      /* cards, panels, avatar menu */
--radius-3xl:   16px      /* dialogs */
--radius-full: 9999px     /* avatars, status badges, filter chip pills */
```

### Layer Tokens (z-index)

```
--layer-base:        0      /* page content */
--layer-sticky:     10      /* sticky toolbar, filter bar */
--layer-appbar:     20      /* top app bar */
--layer-scrim:      30      /* panel scrim overlay */
--layer-pane:       40      /* slide-over panels */
--layer-dropdown:   50      /* dropdowns, popovers, tooltips */
--layer-modal:      60      /* dialogs */
--layer-toast:      70      /* toast notifications */
--layer-cursor:     80      /* collaboration cursors */
```

### Focus Ring

```css
outline: 2px solid var(--accent-primary-ring);
outline-offset: 2px;
```

Consistent across all interactive elements. No exceptions.

---

## 12. Implementation Priority

### Phase 1 — Shell & Navigation (highest impact)

1. Top bar (48px) with Acasus wordmark, breadcrumbs, avatar dropdown
2. Avatar dropdown menu (Admin, Settings, Log out)
3. Route structure (`/templates`, `/templates/:id`, `/admin`, `/settings`)
4. Page transitions (fade + subtle translateY)

### Phase 2 — Template List

5. Card grid layout with responsive columns
6. Card component (title, category, status, metadata)
7. Search input
8. Filter chips (status)
9. Sort control
10. "New template" button
11. Empty state

### Phase 3 — Template Editor

12. Full-bleed editor layout with centered content column
13. Borderless title input
14. Editor toolbar with mode toggle
15. Source mode (Milkdown/ProseMirror with monospace)
16. Review mode (rendered markdown with editorial typography)
17. Markdown helper toolbar buttons

### Phase 4 — Comments System

18. Text selection -> floating comment button
19. Comment highlight rendering in review mode
20. Comments slide-over panel
21. Comment thread UI (author, text, replies, resolve)
22. Comment anchoring data model
23. Comment margin indicators
24. Keyboard shortcut (Cmd+Opt+M)

### Phase 5 — Metadata & Versions

25. Info panel (metadata display + inline editing)
26. Publish/Archive workflow
27. Version history panel (timeline UI)
28. Diff view

### Phase 6 — Polish

29. Presence avatars
30. Connection status indicator
31. Toast notifications
32. Dialog refinements
33. Motion polish (springs, hero moments)
34. Keyboard shortcuts overlay

---

## Navigation Map

### Top Bar (always present)

```
Template List:    [Acasus wordmark]                    [Avatar menu]
Template Editor:  [Acasus] / Templates / [Name]    [i][c][h] [CV] [Avatar]
Admin/Settings:   [Acasus] / [Admin|Settings]                 [Avatar menu]
```

### Avatar Menu

```
[User info]
──────────
Admin
Settings
──────────
Log out
```

### Toggle Panels (editor only)

```
[i] Info        — metadata, status, publish/archive
[c] Comments    — inline comment threads
[h] History     — version timeline
```

### Routes

```
/                                -> redirect to /templates
/templates                       -> template list (card grid)
/templates/new                   -> editor, source mode, info panel open
/templates/:id                   -> editor, last-used mode
/templates/:id/diff/:v1/:v2     -> diff view
/admin                           -> admin panel
/settings                        -> settings
/login                           -> standalone auth screen (no app shell)
```

---

## Keyboard Shortcuts

```
Ctrl+Alt+M / Cmd+Opt+M       — Comment on selected text (review mode)
Ctrl+Shift+P / Cmd+Shift+P   — Toggle last-used panel
Ctrl+K / Cmd+K                — Insert link (source mode)
Ctrl+/ / Cmd+/                — Show keyboard shortcuts overlay
Escape                        — Close panel / dismiss dialog / clear selection
```

---

## PWA

```json
{
  "name": "LegalCode by Acasus",
  "short_name": "LegalCode",
  "background_color": "#FFFFFF",
  "theme_color": "#8027FF",
  "display": "standalone"
}
```

- Splash: Acasus wordmark (`#451F61`) on white. No spinner.
- Offline: 3px `--status-draft` bar at viewport top. "Working offline — changes saved locally." No modal.

---

## Rules

### Do

- Use white/gray as the primary surface. This is a modern document tool.
- Use purple (`#8027FF`) only for interactive elements — buttons, links, focus, active states.
- Use Source Serif 4 for document titles, headings, and editor body (review mode).
- Use DM Sans for all UI chrome.
- Make the editor the center of gravity — full-bleed, maximum space.
- Keep the top bar to 48px. Thin shelf, not chunky toolbar.
- Toggle panels on demand — never persistent, never shrinking the editor.
- Order comment threads by document position (top to bottom), not creation time.
- Anchor comments to stable document positions, not raw character offsets.
- Distinguish autosave, create version, and publish as three separate concepts.
- Give every icon button a tooltip (400ms delay).
- Use the focus ring token consistently.
- Use neutral gray shadows, not colored.
- **Ensure every page has navigation connectivity.** Every page must show its location in the breadcrumb trail (e.g., `Acasus / Admin`, `Acasus / Settings`) and provide at least one obvious, discoverable path back to the template list. A page with only the "Acasus" wordmark and no breadcrumb context is a navigation dead-end. The avatar dropdown must always include a "Templates" link as an escape hatch.

### Navigation Connectivity Quality Gate

Before approving any new page or layout design, verify:

1. **Breadcrumb context** — Does the page set a `breadcrumbPageName` so the TopAppBar shows where the user is? (e.g., `Acasus / Admin`)
2. **Back navigation** — Can the user reach the template list from this page without using the browser back button? At minimum: Acasus wordmark link + Templates item in avatar dropdown.
3. **No dead-ends** — From any page, can the user reach any other page within 2 clicks? If not, add navigation links.
4. **Visual affordance** — Is the navigation path visually discoverable? Hidden links (e.g., clicking a logo with no hover state) don't count as navigation.

A design that fails any of these checks MUST be revised before implementation.

### Don't

- No sidebar. No drawer. No hamburger menu.
- No beige surfaces. Beige is a brand accent only (logo, rare touches).
- No dark purple surfaces. Dark purple is logo/wordmark only.
- No gradients.
- No paper metaphor (bordered/shadowed "page" sitting on a surface). Full-bleed white.
- No persistent right pane. Panels toggle on demand.
- No red for publish or positive actions. Red is destructive only.
- No rounded-everything. Use radius tokens precisely.
- No skeleton loading screens.
- No toast stacking. One at a time, bottom-center, 4s.
- No custom scrollbars. OS defaults.
- No animated illustrations or Lottie.
- No blue links. `--accent-primary` only.
- No comments styled as chat bubbles.
- No editing in Review mode. It is read-only.
- No Ctrl+S mapped to version creation.
- No suggestion mode (future scope).
