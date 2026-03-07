# LegalCode Redesign v2 — Complete UX/UI Audit & Specification

**Author:** Ive (Design Specialist)
**Date:** 2026-03-06
**Status:** Proposal for review

---

## Executive Summary

The current LegalCode UI suffers from a fundamental misapplication of the Acasus brand palette. Dark purple — a color the brand guidelines say should be used _secondarily_ — has been promoted to the most visually dominant element in the interface: a 240px full-height navigation slab that is the first thing the eye hits. Combined with a bright purple button sitting on that dark purple surface, the result is garish and aggressive rather than warm and professional.

The redesign inverts the color hierarchy. Beige becomes truly dominant — not just the content background, but the navigation surface too. Purple retreats to its proper role: text color, accent lines, interactive highlights. The result should feel like opening a beautifully bound legal volume on a warm desk, not like logging into a SaaS dashboard.

---

## 1. Color Rebalancing

### What's Wrong Now

The current implementation treats the brand palette as a paint-by-numbers exercise: dark purple gets the nav, beige gets the content, light purple gets the buttons. This produces three large competing color blocks with no hierarchy. The dark purple nav (240px x 100vh) is approximately 18% of the viewport — far too much for a "secondary" color. The bright purple `#8027FF` button sitting directly on `#451F61` creates a vibrating clash that reads as cheap.

### What to Change

**New color distribution target:**

| Color                        | Current % of viewport | Target % | Role                                                                      |
| ---------------------------- | --------------------- | -------- | ------------------------------------------------------------------------- |
| Beige tones (#EFE3D3 family) | ~60%                  | ~85%     | Everything: nav, content, surfaces, editor                                |
| Dark purple (#451F61)        | ~18%                  | ~3%      | Text only. Headings, nav labels, brand wordmark                           |
| Light purple (#8027FF)       | ~2%                   | ~2%      | Interactive elements only. Buttons, links, focus rings, active indicators |
| White (#FFFFFF / #FEFCF9)    | ~20%                  | ~10%     | Editor surface, elevated cards, dialogs                                   |

**Key principle:** No large purple surfaces anywhere. Purple is ink, not paint.

**New surface tokens:**

```
--surface-nav:           #F2E8D8    /* warm beige, slightly darker than content for subtle separation */
--surface-nav-hover:     #EAD9C4    /* one step deeper on hover */
--surface-nav-active:    #E3CEAF    /* active item background, warm and grounded */
--surface-primary:       #EFE3D3    /* main content background — unchanged */
--surface-editor:        #FEFCF9    /* near-white warm paper for the editor writing surface */
--surface-card:          #F7F0E6    /* elevated cards on the list page */
--surface-elevated:      #FFFFFF    /* dialogs, popovers, dropdowns */
```

**Rationale:** By making the nav a beige tone rather than dark purple, we eliminate the massive color block. The nav still separates from content through a subtle tonal step (F2E8D8 vs EFE3D3), a delicate border, and typography weight — not a paint bucket of purple.

---

## 2. Left Navigation Redesign

### What's Wrong Now

- 240px of solid `#451F61` is the single largest visual element in the app. It dominates the eye and makes the whole interface feel like a purple admin dashboard.
- White text on dark purple is high-contrast but cold — it fights the warm brand identity.
- The bright purple "New Template" button on dark purple is the definition of garish. Two purples vibrating against each other.
- The nav feels dated — reminiscent of 2018-era admin panels (Jira, Confluence sidebar era).
- The user avatar section at the bottom with purple-on-purple text is hard to read.

### What to Change

**Surface:** Replace `#451F61` background with `--surface-nav` (`#F2E8D8`). The nav becomes part of the warm beige family, separated from the workspace by a `1px solid #D4C5B2` right border and the slightly darker tonal value.

**Width:** Reduce from 240px to 220px. The current 240px feels expansive for only 3 nav items. 220px is generous but tighter.

**Header (56px, reduced from 64px):**

- "Acasus" wordmark in `#451F61` (dark purple text on beige). Source Serif 4, weight 600, 1.25rem. The brand name in serif on warm beige is instantly more editorial than white-on-purple.
- Below the wordmark, a thin `1px solid #D4C5B2` separator.

**"New Template" button:**

- Outlined style, NOT filled. `1px solid #8027FF` border, `#8027FF` text, transparent background. On hover: `#8027FF0D` (5% purple) background fill.
- This eliminates the garish purple-on-purple clash entirely. The button is clearly interactive without screaming.
- Full width within nav padding (16px each side). Height 40px. `border-radius: 10px`.
- Icon: thin `+` icon, 18px, `#8027FF`.

**Navigation items:**

- Text color: `#451F61` at 100% for active, `#6B5A7A` (muted purple-brown) for inactive. No white text anywhere.
- Active indicator: `3px solid #8027FF` left border + `--surface-nav-active` (`#E3CEAF`) background fill. This creates a warm "selected" state instead of the current cold white-on-purple.
- Hover: `--surface-nav-hover` (`#EAD9C4`) background. Subtle, warm.
- Font: Source Sans 3, 0.875rem, weight 500 (active: 600).
- Icon color: matches text color. 20px.
- Vertical spacing between items: 2px gap (tight grouping).
- Padding: 10px 16px per item.

**Section divider:** `1px solid #D4C5B2` with 12px vertical margin. Separates nav items from footer.

**Footer (user section):**

- Avatar: 32px, `border-radius: 50%`, `2px solid #D4C5B2` border (beige border, not white).
- Name: Source Sans 3, 0.8125rem, weight 500, `#451F61`.
- Role: Source Sans 3, 0.75rem, weight 400, `#9A8DA6`.
- Hover: `--surface-nav-hover` background.

**Why:** The nav becomes part of the warm environment rather than fighting it. Dark purple text on beige is how the Acasus brand actually uses these colors in their documents and presentations. The nav earns its separation through subtlety (tonal shift + border), not brute force (paint the whole thing purple).

---

## 3. Top Bar / Header

### What's Wrong Now

- "LegalCode" in purple text on a pale beige bar is visually weightless. No brand presence.
- The bar blends into the content area with almost no differentiation.
- On the editor page, the title and controls feel scattered rather than composed.

### What to Change

**Height:** Reduce from 64px to 52px. The current height is generous for content that doesn't fill it. 52px is compact and editorial.

**Background:** `#FEFCF9` (warm near-white) instead of `#F7F0E6`. This creates a subtle lift above the beige content area.

**Bottom border:** Replace box-shadow with a crisp `1px solid #E6D9C6`. Shadows on a warm surface read muddy; a clean line reads editorial.

**Template List view:**

- Left: "Templates" in Source Serif 4, 1.125rem, weight 600, `#451F61`. Serif here gives brand personality.
- Right: just the user avatar (32px). No other elements.

**Template Editor view:**

- Left: Back arrow (20px, `#6B5A7A`, hover `#451F61`) + template title inline-editable (Source Serif 4, 1.25rem, weight 600, `#451F61`). The title IS the header. No separate "header title" + "template title" — that's redundant.
- Center-right: Presence avatars cluster.
- Right: "Create Version" button (outlined, `#451F61` text/border) + status badge + overflow menu (three dots).

**The bar should feel like a thin, precise shelf** — not a chunky toolbar. Think of the top of a Notion page or a well-designed legal document header: the content starts almost immediately.

---

## 4. Template List Page

### What's Wrong Now

- The list feels flat and lifeless. Rows on beige with no visual structure or hierarchy.
- The search/filter bar uses MUI defaults — outlined TextField with floating label looks generic.
- Filter chips are standard MUI chips with no brand refinement.
- The sort dropdown is a standard MUI Select — out of place in a warm editorial UI.
- Template rows lack any card structure or breathing room. They're just lines of text on a tan page.
- The hover state (background color change) is functional but adds no delight.
- The sticky filter bar shadow (`rgba(0,0,0,0.06)`) is cold on warm surfaces.

### What to Change

**Page layout:**

- Content max-width: 880px (reduced from 960px for tighter editorial feel), centered.
- Top padding: 32px. Side padding: 24px.
- Page title "Templates" is in the top bar (see section 3), NOT repeated on the page.

**Search bar redesign:**

- Remove the MUI `TextField` with floating label. Replace with a clean, label-less input.
- Background: `#FEFCF9` (warm white). Border: `1px solid #D4C5B2`. Border-radius: 10px.
- Height: 44px. Padding: 0 16px.
- Placeholder: "Search templates..." in `#9A8DA6`, Source Sans 3, 0.9375rem.
- Search icon: 18px, `#9A8DA6`, positioned inside left.
- On focus: border color transitions to `#8027FF`. Subtle `0 0 0 3px #8027FF1A` focus ring.
- No floating label. No outlined variant. Clean and simple.

**Filter chips redesign:**

- Remove MUI Chip component defaults. Custom pill-shaped buttons.
- Inactive: `#F7F0E6` background, `#6B5A7A` text, `1px solid #D4C5B2` border. Border-radius: 9999px. Padding: 6px 14px. Source Sans 3, 0.8125rem, weight 500.
- Active: `#451F61` background, `#FEFCF9` text, no border needed. This uses dark purple in a tiny, proportional way — as a selected state pill, not a surface.
- Hover (inactive): `#EAD9C4` background.
- Gap between chips: 8px.

**Sort control:**

- Replace the MUI Select with a minimal text button: "Recently edited" with a small chevron-down icon (14px). Source Sans 3, 0.8125rem, weight 500, `#6B5A7A`. Click opens a simple dropdown menu.
- Position: right-aligned on the same row as filter chips.

**Template rows — now card-style:**

- Each template is a subtle card: `#F7F0E6` background, `1px solid #E6D9C6` border, `border-radius: 10px`. This gives structure and depth to the list.
- Card padding: 16px 20px.
- Card margin-bottom: 8px (not touching, breathing room).
- **Layout within card:**
  - Row 1: Title (Source Serif 4, 1rem, weight 600, `#451F61`) ---- status badge (right-aligned)
  - Row 2 (always visible, below title, 4px gap): Category tag (Source Sans 3, 0.6875rem, uppercase, weight 600, `#9A8DA6`, letter-spacing 0.06em) + " . " separator + relative time ("2h ago", 0.75rem, `#9A8DA6`) + " . " + version ("v12", 0.75rem, `#9A8DA6`)
  - The metadata is ALWAYS visible (not hover-only). The current hide-on-default approach makes the list feel empty and information-poor. Show the essential metadata at all times; only hide truly secondary items (country, company, tags) for hover.
- **Hover state:** border-color transitions to `#C4B5A0`. Very subtle `0 2px 8px rgba(69,31,97,0.06)` shadow appears. Background stays the same — the border darkening and shadow are enough.
- **Active/selected:** `2px solid #8027FF` left border (replacing the 3px from before — thinner is more refined). Light `#8027FF08` background wash.

**Empty state:**

- Large document icon: 48px, `#D4C5B2` (not purple — keep it muted).
- "No templates yet" in Source Serif 4, 1.5rem, weight 600, `#451F61`.
- "Create your first template" button: outlined, `#8027FF` text/border, 40px height, `border-radius: 10px`. NOT filled — consistent with the restrained purple usage.

---

## 5. Template Editor UX

### What's Wrong Now

- The editor surface has no clear visual boundary. Content just floats on beige.
- The title field uses a standard MUI TextField with label — looks like a form, not a document.
- The toolbar is a flat bar that blends with everything else. The mode toggle has no visual container.
- Source mode and Review mode look almost identical in terms of surface treatment.
- In create mode, category/country/tags fields are inline with the editor — making it feel like a form, not a writing space.
- The "Save Draft" button is a generic MUI contained button with no placement logic.
- The markdown helper buttons (Bold, Italic, etc.) are too numerous and feel like a generic formatting toolbar rather than legal-template-specific tools.

### What to Change

**Editor surface redesign:**

- The editor area (below toolbar) gets a distinct `#FEFCF9` (warm near-white) background with `border-radius: 12px` and `1px solid #E6D9C6` border. This creates a "paper" metaphor — the document sits on the beige desk.
- Inner padding: 48px horizontal, 32px vertical (Source mode). This generous whitespace makes the writing experience feel spacious.
- The paper surface has a very subtle shadow: `0 1px 4px rgba(69,31,97,0.04)`. Just enough to lift it.

**Title field redesign:**

- Remove the MUI TextField entirely. Replace with a bare, borderless, large-format input.
- Source Serif 4, 1.5rem, weight 600, `#451F61`. No border, no background, no label.
- Placeholder: "Untitled template" in `#C4B5A0`.
- The title sits INSIDE the paper surface, at the top, as if it were the first line of a document. Not above it as a form field.
- On focus: no visible border or ring on the title itself — it's always editable, always looks like a document heading.

**Toolbar redesign:**

- Sits between the top bar and the paper surface. NOT inside the paper. This is chrome, not content.
- Background: transparent (sits on beige workspace background).
- Height: 44px. Padding: 0 24px.
- Left: mode toggle. Center: markdown helpers (source mode only). Right: word count + connection status.

**Mode toggle refinement:**

- Container: `#F7F0E6` background, `1px solid #E6D9C6` border, `border-radius: 8px`, `padding: 3px`.
- Active segment: `#451F61` background, `#FEFCF9` text, `border-radius: 6px`. Use dark purple here — it's small, proportional, and functional. NOT light purple (`#8027FF`), which should remain for interactive/actionable elements, not state indicators.
- Inactive segment: transparent background, `#6B5A7A` text.
- This is a significant change from the current spec: using dark purple instead of light purple for the active toggle state. The reasoning: the toggle indicates "where you are" (state), not "what you can do" (action). Dark purple is the structural/identity color; light purple is the action color.

**Markdown helpers:**

- Reduce the toolbar to the 6 most essential legal-template actions. Remove Bold and Italic (users know Cmd+B and Cmd+I). Keep:
  1. Heading (H dropdown)
  2. Link
  3. List (bullet + ordered combined into one dropdown)
  4. Table
  5. Clause reference `{{clause:}}`
  6. Variable `{{var:}}`
  7. Horizontal rule
- Icons: 20px, `#9A8DA6`. Hover: `#451F61`. Active: `#8027FF`.
- Thin `1px solid #E6D9C6` vertical separators between icon groups (general formatting | legal-specific | divider).
- Tooltips on every icon (500ms delay). Include keyboard shortcut in tooltip.

**Review mode surface:**

- Same paper surface (`#FEFCF9`), but max-width constrained to 780px (reduced from 860px for a tighter reading column — true editorial width).
- Typography: Source Serif 4 for headings, Source Sans 3 for body. Body at 1rem/1.7 line-height (more generous than current 1.6). Paragraph spacing: 20px.
- The right margin rail (48px) for comment markers sits OUTSIDE the paper surface, in the beige workspace area. This creates a clean separation between content and annotation.

**Create mode form fields:**

- Move category, country, and tags OUT of the editor workspace entirely. They belong in the right pane Metadata tab, which should open by default in create mode.
- The editor workspace in create mode should show ONLY: title (inside paper) + content editor (inside paper). Nothing else. The workspace is for writing.

**Action buttons placement:**

- Remove the floating "Save Draft" / "Save Version" buttons from below the editor.
- "Save Draft" action: move to the top bar, right side. Small, outlined button. `#451F61` text/border.
- "Create Version": also in top bar, right side. Outlined, `#451F61`.
- "Publish": stays in Metadata tab (right pane). Filled `#8027FF` button.
- The editor workspace should have ZERO buttons. It's a writing surface.

---

## 6. Typography & Spacing

### What's Wrong Now

- Typography is technically correct (Source Serif 4 + Source Sans 3) but lacks editorial refinement.
- The type scale is applied mechanically — headings are just bigger text, not composed hierarchy.
- Spacing is inconsistent: some areas use MUI's `sx={{ p: 3 }}` (24px), others use custom values.
- Line heights in the editor feel tight for legal content.

### What to Change

**Refined type scale:**

```
--type-display:      Source Serif 4, 2rem/2.625rem,      600    /* page titles, empty states */
--type-headline:     Source Serif 4, 1.5rem/2rem,         600    /* section headings, dialog titles */
--type-title:        Source Serif 4, 1.125rem/1.5rem,     600    /* template titles in list */
--type-title-lg:     Source Serif 4, 1.25rem/1.625rem,    600    /* NEW: template title in editor header */
--type-subtitle:     Source Sans 3, 0.9375rem/1.375rem,   600    /* section labels, nav header */
--type-body:         Source Sans 3, 0.875rem/1.5rem,      400    /* body text, descriptions */
--type-body-strong:  Source Sans 3, 0.875rem/1.5rem,      600    /* emphasized body */
--type-label:        Source Sans 3, 0.8125rem/1.125rem,   500    /* form labels, tab labels, nav items */
--type-caption:      Source Sans 3, 0.75rem/1rem,         400    /* timestamps, version numbers, metadata */
--type-caption-caps: Source Sans 3, 0.6875rem/1rem,       600, tracking 0.06em, uppercase  /* status badges, category tags */
--type-mono:         JetBrains Mono, 0.8125rem/1.375rem,  400    /* editor source mode — slightly smaller for density */
```

Changes from current:

- Body reduced from 0.9375rem to 0.875rem. The current body feels slightly large for a professional tool. 14px body with good line-height reads sharper.
- New `--type-title-lg` for the editor header title.
- Mono reduced from 0.875rem to 0.8125rem. Source code in the editor can be a touch smaller.

**Spacing refinements:**

```
/* Component-level spacing constants */
--page-padding-x:        24px     /* horizontal padding for page content */
--page-padding-top:      32px     /* top padding for page content */
--card-padding:          16px 20px /* template list card internal padding */
--card-gap:              8px      /* gap between template cards */
--editor-padding-x:      48px     /* horizontal padding inside editor paper */
--editor-padding-y:      32px     /* vertical padding inside editor paper */
--toolbar-height:        44px     /* editor toolbar height */
--appbar-height:         52px     /* top app bar height (reduced from 64px) */
--nav-width:             220px    /* left nav width (reduced from 240px) */
```

**Letter-spacing adjustments:**

- Add `letter-spacing: 0.01em` to `--type-body` for slightly more open body text. Improves readability on beige backgrounds where contrast is slightly lower than white.
- Maintain `0.06em` on caption-caps only.

---

## 7. Component Refinement

### Status Badges

**What's wrong:** Correct color semantics but visually flat. The pill shape is fine but the colors could be warmer.

**Refinement:**

- Draft: `#B8860B14` background (reduce opacity from 1A to 14 — more subtle), `#A07A0A` text (warmer, darker amber).
- Published: `#2D6A4F14` background, `#256B47` text.
- Archived: `#78695A14` background, `#78695A` text (unchanged).
- Border-radius: 9999px (unchanged). Padding: 4px 12px (increase horizontal from 10px).
- Add `1px solid` border matching text color at 15% opacity. This gives the badges definition without weight.

### Buttons

**Primary (rare — only "Publish"):**

- `#8027FF` background, `#FFFFFF` text. Border-radius: 10px. Height: 36px. Padding: 0 20px.
- Hover: `#6B1FDB`. Active: `#5A18B8`.
- This button should be rare. If purple buttons are everywhere, they lose their meaning.

**Secondary (most common — "Save Draft", "Create Version", "New Template" in nav):**

- Transparent background, `1px solid #451F61` border, `#451F61` text. Border-radius: 10px. Height: 36px.
- Hover: `#451F610A` (4%) background fill.
- This is the workhorse button. Dark purple outline on beige is elegant and restrained.

**Tertiary (text-only — "Cancel", secondary dialog actions):**

- No background, no border. `#6B5A7A` text. Weight 500.
- Hover: `#451F61` text + `#451F610A` background.

**Destructive:**

- `#D32F2F` background, `#FFFFFF` text. Border-radius: 10px. Height: 36px.
- Only for "Delete template" and similar irreversible actions. NEVER for "Archive".

### Inputs

**Text fields (forms in right pane, dialog inputs):**

- Remove MUI outlined variant. Use a simple underline input style.
- No visible border on idle. Just a `1px solid #D4C5B2` bottom border.
- On focus: bottom border becomes `2px solid #8027FF`.
- Label: `--type-caption`, `#9A8DA6`, positioned above the input (not floating).
- Input text: `--type-body`, `#2A1A35`.
- Background: transparent.
- This creates a cleaner, more editorial feel than the boxed MUI fields.

**Search input (template list — exception):**

- Keeps its boxed style (see section 4) because it's a standalone search bar, not a form field.

### Dialogs

**Current:** Uses MUI defaults with some color overrides. Functional but generic.

**Refinement:**

- Max width: 440px (reduced from 480px — tighter is more refined).
- Background: `#FEFCF9`. Border-radius: 16px. Border: `1px solid #E6D9C6`.
- Shadow: `0 8px 32px rgba(69,31,97,0.12)`.
- Title: Source Serif 4, 1.25rem, weight 600, `#451F61`. Padding: 24px 28px 8px.
- Content: padding 8px 28px 24px.
- Actions: padding 0 28px 24px. Right-aligned. 12px gap between buttons.
- Backdrop: `#EFE3D380` (beige at 50%) + `backdrop-filter: blur(8px)`. NOT black/gray overlay — keep the warmth even in the backdrop.

### Toast Notifications

**Current spec is fine.** Minor refinement:

- Background: `#FEFCF9` instead of `#F7F0E6`. Slightly lighter to lift off the beige workspace.
- Add `1px solid #E6D9C6` border for crispness.
- Max width: 400px.

---

## 8. Overall Visual Hierarchy

### What's Wrong Now

The eye has no clear path. The dark purple nav grabs attention first (wrong — it's chrome, not content). Then the eye bounces to the top bar (nothing interesting there), then finally finds the beige content area which is flat and undifferentiated. The hierarchy is: Nav > Content, when it should be: Content > Everything Else.

### What to Change — Eye Flow by Page

**Template List Page:**

```
1. Template titles (Source Serif 4 in dark purple — highest contrast text)
2. Status badges (small, colorful, semantic)
3. Search bar (clean, inviting input area)
4. Filter chips (subtle, interactive row)
5. Navigation (warm beige, present but calm)
6. Top bar (thin shelf, minimal)
```

The templates ARE the page. Everything else is infrastructure.

**Template Editor Page:**

```
1. Document paper surface (warm white rectangle — the "page" metaphor)
2. Template title (large serif text at top of paper)
3. Editor content (monospace source or rendered review)
4. Right pane tabs (supplementary context)
5. Toolbar (thin, functional strip)
6. Top bar (back arrow + minimal controls)
7. Navigation (present but invisible to working flow)
```

The paper is the center of gravity. The user should feel like they're writing on a page, not filling in a form inside a dashboard.

### Hierarchy Tools

Instead of using color blocks (dark purple nav) to create hierarchy, use:

1. **Tonal beige steps:** Nav (#F2E8D8) -> Workspace (#EFE3D3) -> Paper (#FEFCF9). Three tones of the same family. The paper is lightest and therefore draws the eye.

2. **Typography weight:** Source Serif 4 at weight 600 for document titles. Source Sans 3 at weight 400-500 for everything else. The serif titles pop.

3. **Borders, not shadows:** Clean 1px lines in `#D4C5B2` to separate zones. Shadows only on the paper surface and dialogs.

4. **Whitespace:** Generous inner padding on the paper surface (48px horizontal). The emptiness around the content makes the content important.

5. **Color restraint:** Purple appears ONLY at interaction points. A purple focus ring, a purple active indicator, a purple button. Because purple is rare, it draws the eye exactly where it should go — to the thing you're about to interact with.

---

## 9. Right Pane Refinements

### What's Wrong Now

The right pane (`#E6D9C6` background) is functional but feels like a sidebar bolted onto the main app. The tab bar is generic MUI Tabs. The content area is undifferentiated.

### What to Change

**Background:** `#F2E8D8` (same as nav — creates a unified "frame" around the content area, which is the beige workspace holding the paper).

**Width:** Reduce default from 400px to 360px. The current 400px feels wide for metadata and comments. Still resizable 320px-440px.

**Tab bar:**

- Remove MUI Tabs component styling. Custom tab bar.
- Tabs: `--type-label`, `#6B5A7A` inactive, `#451F61` active, weight 500/600.
- Active indicator: `2px solid #8027FF` bottom border on active tab. No MUI indicator animation — use a CSS transition.
- Tab height: 40px. Bottom border: `1px solid #D4C5B2`.

**Content padding:** 16px. Consistent throughout.

**Collapse behavior:**

- Collapsed state: pane slides to 0px width with `springStandardSlow`.
- A small "open pane" button (20px wide strip) remains visible on the right edge of the workspace: a subtle chevron-left icon on `#F2E8D8` background.

---

## 10. Updated CSS Custom Properties (Complete Token Set)

This replaces the current `tokens.css` color section:

```css
:root {
  /* === SURFACES === */
  --surface-nav: #f2e8d8;
  --surface-nav-hover: #ead9c4;
  --surface-nav-active: #e3ceaf;
  --surface-primary: #efe3d3;
  --surface-secondary: #e6d9c6;
  --surface-tertiary: #ddd0bc;
  --surface-paper: #fefcf9; /* NEW: editor paper, cards */
  --surface-elevated: #ffffff; /* dialogs, popovers */
  --surface-card: #f7f0e6; /* template list cards */

  /* === TEXT === */
  --text-primary: #451f61;
  --text-body: #2a1a35;
  --text-secondary: #6b5a7a;
  --text-tertiary: #9a8da6;
  --text-placeholder: #c4b5a0; /* NEW */
  --text-on-dark: #fefcf9; /* for dark purple buttons, active toggle */

  /* === INTERACTIVE === */
  --accent-primary: #8027ff;
  --accent-primary-hover: #6b1fdb;
  --accent-primary-active: #5a18b8; /* NEW */
  --accent-primary-subtle: #8027ff0d; /* reduced from 1A to 0D (5%) */
  --accent-primary-ring: #8027ff33; /* reduced from 66 to 33 */

  /* === BORDERS === */
  --border-primary: #d4c5b2;
  --border-secondary: #e6d9c6; /* NEW: lighter border for cards */
  --border-hover: #c4b5a0; /* NEW: border on hover */
  --border-focus: #8027ff;

  /* === STATUS (unchanged) === */
  --status-draft: #a07a0a; /* warmed from #B8860B */
  --status-draft-bg: #b8860b14;
  --status-published: #256b47; /* warmed from #2D6A4F */
  --status-published-bg: #2d6a4f14;
  --status-archived: #78695a;
  --status-archived-bg: #78695a14;

  /* === SHADOWS (all purple-tinted, warmer) === */
  --shadow-xs: 0 1px 2px rgba(69, 31, 97, 0.03); /* NEW: barely-there lift */
  --shadow-sm: 0 1px 4px rgba(69, 31, 97, 0.04); /* paper surface */
  --shadow-md: 0 2px 8px rgba(69, 31, 97, 0.06); /* card hover */
  --shadow-lg: 0 4px 16px rgba(69, 31, 97, 0.1); /* reduced from 0.14 */
  --shadow-xl: 0 8px 32px rgba(69, 31, 97, 0.12); /* dialogs */

  /* === DIMENSIONS === */
  --nav-width: 220px;
  --appbar-height: 52px;
  --toolbar-height: 44px;
  --pane-width: 360px;
  --pane-width-min: 320px;
  --pane-width-max: 440px;
  --list-max-width: 880px;
  --review-max-width: 780px;
  --editor-padding-x: 48px;
  --editor-padding-y: 32px;
}
```

---

## 11. Summary of Breaking Changes from Current Spec

| Area                  | Current                    | Proposed                          | Reasoning                                                       |
| --------------------- | -------------------------- | --------------------------------- | --------------------------------------------------------------- |
| Left nav background   | `#451F61` (dark purple)    | `#F2E8D8` (warm beige)            | Eliminate the dominant purple slab; beige is the brand identity |
| Left nav text         | White on purple            | Dark purple on beige              | Match actual Acasus brand usage                                 |
| Nav width             | 240px                      | 220px                             | Tighter for 3-item nav                                          |
| "New Template" button | Filled `#8027FF` on purple | Outlined `#8027FF` on beige       | Eliminate purple-on-purple clash                                |
| Top bar height        | 64px                       | 52px                              | Reduce chrome weight                                            |
| Top bar background    | `#F7F0E6`                  | `#FEFCF9`                         | Lighter lift above workspace                                    |
| Editor surface        | `#F5EEE3`                  | `#FEFCF9` (paper metaphor)        | Warm white "page" on beige "desk"                               |
| Editor title          | MUI TextField              | Bare serif input inside paper     | Document feel, not form feel                                    |
| Template list items   | Borderless rows            | Cards with border + radius        | Structure and breathing room                                    |
| List metadata         | Hidden on hover            | Essential metadata always visible | Lists shouldn't feel empty                                      |
| Mode toggle active    | `#8027FF` (light purple)   | `#451F61` (dark purple)           | State indicator, not action                                     |
| Filter chips active   | MUI Chip filled primary    | `#451F61` background custom pill  | Proportional purple usage                                       |
| Right pane width      | 400px                      | 360px                             | Less wide for supplementary content                             |
| Buttons (most)        | Filled `#8027FF`           | Outlined `#451F61`                | Reserve filled purple for primary CTA only                      |
| Dialog max-width      | 480px                      | 440px                             | Tighter, more refined                                           |
| Body text size        | 0.9375rem (15px)           | 0.875rem (14px)                   | Sharper professional density                                    |
| Shadows               | Moderate opacity           | Reduced opacity                   | Subtler lift on warm surfaces                                   |

---

## 12. Implementation Priority

**Phase 1 — Immediate visual fix (highest impact, touches fewest components):**

1. Left nav: beige background, dark text, outlined "New Template"
2. Top bar: reduce height, lighten background
3. Editor paper surface: warm white with border/radius
4. Mode toggle: dark purple active state

**Phase 2 — List page refinement:** 5. Template cards (border, radius, padding) 6. Search bar redesign (custom input) 7. Filter chips (custom pills) 8. Always-visible essential metadata

**Phase 3 — Polish:** 9. Right pane background and width 10. Dialog styling 11. Input field underline style 12. Button audit (outlined defaults) 13. Updated token file

Phase 1 alone will transform the app from "garish admin panel" to "warm professional workspace." The remaining phases refine the details.
