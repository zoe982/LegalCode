---
name: legalcode-design
description: LegalCode product UI spec and design system. Use for ALL UI implementation — components, pages, layouts, animations. Covers foundations (color, type, spacing, tokens), layout shell, MVP components, and motion. Reference before writing ANY component, layout, or styling code.
---

# LegalCode Product UI Spec

LegalCode is a professional legal template management PWA for desktop, built by Acasus. It stores, versions, and collaboratively edits markdown-based legal templates that get implemented as Google Docs.

## Design Principles

Four rules that govern every decision. When in doubt, return to these.

1. **Document-first.** The template is the center of gravity. Everything else — navigation, metadata, comments, presence — serves the document. If a UI element competes with the document for attention, the element loses.
2. **Warm, not corporate.** This is an Acasus product. Beige surfaces, serif document titles, purple-tinted depth. It should feel like a well-appointed workspace, never like a cold admin panel.
3. **Calm, not dense.** Default to low visual noise. Secondary metadata appears on hover, selection, or within the right pane — not all at once on the main surface. The template list and document body should never feel crowded.
4. **Precise, not decorative.** Every visual element earns its place. Motion is functional. Color is semantic. Nothing is added for aesthetics alone.

## Document Structure

- **01 Foundations** — tokens, color, typography, spacing, radii, layers
- **02 Layout Shell** — the four-zone desktop frame and responsive behavior
- **03 MVP Components** — what ships now
- **04 Collaboration Future State** — suggestion mode and advanced review (build later)
- **05 Motion** — animation system and specifications
- **06 Rules** — do / don't constraints

Implement sections 01–03 and 05 first. Section 04 is future scope and must not be built into the MVP unless explicitly requested.

---

## 01 Foundations

### Brand Colors (source of truth)

```
--brand-beige:         #EFE3D3     /* primary surface */
--brand-light-purple:  #8027FF     /* primary interactive */
--brand-dark-purple:   #451F61     /* text, structure, depth */
--brand-orange:        #FF0000     /* destructive / legal-risk signals ONLY */
```

### Color Tokens — Light Theme (default)

```
/* Surfaces */
--surface-primary:      #EFE3D3
--surface-secondary:    #E6D9C6
--surface-tertiary:     #DDD0BC
--surface-elevated:     #F7F0E6
--surface-editor:       #F5EEE3

/* Text */
--text-primary:         #451F61
--text-body:            #2A1A35
--text-secondary:       #6B5A7A
--text-tertiary:        #9A8DA6
--text-on-purple:       #FFFFFF
--text-on-beige-subtle: #78695A

/* Interactive */
--accent-primary:       #8027FF
--accent-primary-hover: #6B1FDB
--accent-primary-subtle:#8027FF1A
--accent-primary-ring:  #8027FF66

/* Destructive — red is ONLY for destructive actions and legal-risk flags */
--destructive:          #D32F2F
--destructive-subtle:   #D32F2F1A

/* Depth (dark purple structural surfaces) */
--depth-primary:        #451F61
--depth-secondary:      #361850
--depth-tertiary:       #2D1343

/* Borders */
--border-subtle:        #D4C5B2
--border-on-dark:       #5E3D7A
--border-focus:         #8027FF

/* Status */
--status-draft:         #B8860B
--status-draft-bg:      #B8860B1A
--status-published:     #2D6A4F
--status-published-bg:  #2D6A4F1A
--status-archived:      #78695A
--status-archived-bg:   #78695A1A

/* Collaboration cursors — assigned per user per session */
--cursor-1:             #E63946
--cursor-2:             #457B9D
--cursor-3:             #2A9D8F
--cursor-4:             #E9C46A
--cursor-5:             #6A4C93
```

### Color Tokens — Dark Theme (future scope — not shipping in MVP)

```
--surface-primary:      #1A1225
--surface-secondary:    #231830
--surface-tertiary:     #2D1F3B
--surface-elevated:     #352748
--surface-editor:       #1F1529
--text-primary:         #EFE3D3
--text-body:            #D4C5B2
--text-secondary:       #9A8DA6
--text-tertiary:        #6B5A7A
--accent-primary:       #A35CFF
--accent-primary-hover: #B87AFF
--accent-primary-subtle:#A35CFF1A
--destructive:          #FF6B6B
--depth-primary:        #130D1C
```

### Color Usage Rules

1. **Beige is the app's identity.** Not a neutral — the warm Acasus surface.
2. **Dark purple (#451F61)** for text and structural surfaces (left nav). Anchors hierarchy.
3. **Light purple (#8027FF)** for interaction only. Buttons, links, active states, focus. Never as a surface.
4. **Red is destructive/risk only.** Delete actions, critical errors, legal-risk flags. NOT for publish. NOT for positive actions. NOT for attention-grabbing.
5. **Publish uses accent-primary (purple).** It is a positive primary action.
6. **Published status uses green (--status-published).** Healthy, current, live.
7. **No gradients.** Flat blocks. Depth from elevation and tonal contrast.
8. **Cursor colors are personal.** Each collaborator's cursor, comments, and (future) suggestions use their assigned color consistently.

### Typography

**Font stack:**

- Display / Headings / Template titles: **Source Serif 4** (variable weight)
- Body / UI / Labels / Navigation: **Source Sans 3** (variable weight)
- Monospace / Editor / Diffs: **JetBrains Mono**

**Type scale:**

```
--type-display:      Source Serif 4, 2rem/2.5rem,       600
--type-headline:     Source Serif 4, 1.5rem/2rem,        600
--type-title:        Source Serif 4, 1.125rem/1.5rem,    600
--type-subtitle:     Source Sans 3, 1rem/1.375rem,       600
--type-body:         Source Sans 3, 0.9375rem/1.5rem,    400
--type-body-strong:  Source Sans 3, 0.9375rem/1.5rem,    600
--type-label:        Source Sans 3, 0.8125rem/1.125rem,  500
--type-caption:      Source Sans 3, 0.75rem/1rem,        400
--type-caption-caps: Source Sans 3, 0.6875rem/1rem,      600, tracking 0.06em, uppercase
--type-mono:         JetBrains Mono, 0.875rem/1.375rem,  400
```

**Rules:**

- Template titles: Source Serif 4. Documents should feel like documents.
- All UI chrome: Source Sans 3.
- On dark purple: white text, type-label for nav.
- Never below weight 400.
- Line height: 1.5 body, 1.6 editor and review content.
- Letter-spacing only on --type-caption-caps. Never on body or headings.

### Spacing (8px grid)

```
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
```

### Radius Tokens

```
--radius-sm:    4px      /* small chips, tags, inline badges */
--radius-md:    8px      /* cards, list items, containers */
--radius-lg:   12px      /* inputs, buttons */
--radius-xl:   16px      /* dialogs, modals, panels */
--radius-full: 9999px    /* avatars, status pills, circular buttons */
```

### Layer Tokens (z-index)

```
--layer-base:       0      /* page content */
--layer-sticky:    10      /* sticky filter bar, column headers */
--layer-nav:       20      /* left navigation */
--layer-appbar:    30      /* top app bar */
--layer-pane:      40      /* right context pane */
--layer-dropdown:  50      /* dropdowns, popovers, tooltips */
--layer-modal:     60      /* dialogs, confirmation modals */
--layer-toast:     70      /* toast notifications */
--layer-cursor:    80      /* collaboration cursors (always on top) */
```

### Icon Tokens

```
--icon-sm:   16px     /* inline with caption text */
--icon-md:   20px     /* inline with body/label text, nav items */
--icon-lg:   24px     /* toolbar actions, standalone buttons */
--icon-xl:   32px     /* empty states, feature illustrations */
```

### Panel Width Tokens

```
--nav-width:           240px     /* left persistent navigation */
--pane-width:          400px     /* right context pane default */
--pane-width-min:      360px     /* right pane minimum (resizable) */
--pane-width-max:      480px     /* right pane maximum */
--appbar-height:        64px     /* top app bar */
--list-max-width:      960px     /* template list content max-width */
--review-max-width:    860px     /* review mode reading column max-width */
--review-margin-rail:   48px     /* review mode right margin for comment markers */
```

### Focus Ring

```
outline: 2px solid var(--accent-primary-ring);
outline-offset: 2px;
```

Consistent across all interactive elements. No exceptions.

### Elevation

```
--shadow-sm:   0 1px 3px rgba(69, 31, 97, 0.06)
--shadow-md:   0 2px 8px rgba(69, 31, 97, 0.10)
--shadow-lg:   0 4px 16px rgba(69, 31, 97, 0.14)
--shadow-xl:   0 8px 32px rgba(69, 31, 97, 0.18)
```

Purple-tinted (not black). Warm on beige surfaces.

---

## 02 Layout Shell

### Four-Zone Desktop Frame

```
+--+--------------------------------------+------------+
|              |          Top App Bar (64px)          |              |
|              +-------------------------------------+              |
|   Left       |                                     |    Right     |
|   Persistent |       Central Workspace              |   Context    |
|   Navigation |                                     |    Pane      |
|              |                                     |              |
|   240px      |          flex-1                      |   400px      |
|   dark purple|                                     |  collapsible |
|   (#451F61)  |       Beige (#EFE3D3)               |  resizable   |
|              |                                     |              |
|              |   List: max-width 960px centered     |  MVP Tabs:   |
|              |   Source: full width                  |  . Metadata  |
|              |   Review: max-width 860px + margin   |  . Comments  |
|              |                                     |  . Versions  |
+--------------+-------------------------------------+--------------+
```

The left nav extends full viewport height. The top app bar sits to the right of the nav, spanning workspace + pane.

### Responsive Behavior

The product is desktop-first. These breakpoints degrade gracefully rather than cutting off access.

**1280px and above — full layout:**

- All four zones visible
- Right pane inline (not overlay), resizable

**1024–1279px — compact desktop:**

- Left nav still visible (240px)
- Right pane defaults to collapsed; opens as modal overlay when activated
- Editor padding reduced from --space-7 to --space-5 horizontal

**900–1023px — narrow desktop:**

- Left nav still visible (240px)
- Right pane overlay only
- Template list max-width removed (fills available space)
- Review mode reading column reduced to max-width 720px

**Below 900px — unsupported:**

- Show a centered notice: "LegalCode is designed for desktop. Please use a wider window."
- Do not attempt a mobile layout. The editing experience cannot be meaningfully preserved.

### Left Persistent Navigation (240px)

Wide, labeled, always-visible text. Not a narrow icon rail.

**Background:** --depth-primary (#451F61).

**Structure:**

1. **Header (64px):** Acasus wordmark (white variant), left-aligned, --space-4 padding
2. **New Template button:** full-width within nav padding, --accent-primary filled, white text, --radius-lg. Primary creation action.
3. **Destinations:**
   - **Templates** — icon (--icon-md) + label (type-label, white). This is the primary destination and carries the strongest visual weight.
   - **Admin** — icon + label. Visually quieter than Templates. Simpler layout, less visual weight. Reuses the same shell but with utility-level density.
   - **Settings** — icon + label. Same quieter treatment as Admin.
4. **Footer:** user avatar (32px, --radius-full, white 2px border) + name (type-label, white) + role (type-caption, light purple). Click -> avatar menu flyout (Profile, Log Out).

**The left nav is intentionally simple.** Three destinations only. No sub-navigation tree, no category browser, no file-explorer behavior. All filtering, searching, categorizing, and saved views live on the Templates page itself. This keeps the shell calm and premium.

**Admin and Settings pages** reuse the app shell (left nav, app bar, workspace) but with simpler layouts and less visual weight than Templates. The Templates area carries the strongest document-management identity. Admin and Settings should feel like utility pages — same quality, lower density, no risk of making the whole app feel over-designed.

**Visual treatment:**

- Inactive text: white at 70% opacity
- Active: white at 100%, --accent-primary vertical bar (3px) on left edge
- Hover: --depth-secondary background, springStandardFast
- Section dividers: 1px --border-on-dark, --space-3 vertical margin

### Top App Bar (64px)

**Background:** --surface-elevated with --shadow-sm bottom edge.

_Template list view:_

- Left: page title (type-subtitle, --text-primary)
- Right: user avatar (32px)

_Template editor view:_

- Left: template title (Source Serif 4, type-headline, editable inline) + status badge
- Right: presence avatars + primary action + overflow menu

The app bar is intentionally uncluttered. Maximum 6 discrete interactive elements.

### Central Workspace

**Background:** --surface-primary.

- **List view:** --list-max-width (960px) centered, search/filter bar sticky at --layer-sticky.
- **Source mode:** full available width. --surface-editor background. Padding --space-7 horizontal (--space-5 at compact breakpoint), --space-6 vertical.
- **Review mode:** --review-max-width (860px) centered within the workspace. --surface-editor background. A --review-margin-rail (48px) strip on the right side of the reading column holds comment markers. This creates an editorial reading width — the rendered legal document feels like a typeset page, not stretched web content.
- **Diff view:** same shell, workspace becomes side-by-side or unified diff layout (see section 03).

### Right Context Pane (400px, collapsible, resizable)

Appears when viewing/editing a template. Hidden on the list view.

**Background:** --surface-secondary.

**Tab bar:** type-label, --text-primary. Active tab: --accent-primary bottom border (2px). Unread count badges on tabs with unresolved items.

**MVP tabs:** Metadata, Comments, Versions.

**Collapse/resize:**

- Toggle in app bar or collapse arrow on pane
- Content area expands when collapsed
- Resizable by dragging left edge (--pane-width-min to --pane-width-max)
- At compact breakpoint (1024-1279px): overlay instead of inline
- Animation: springStandardSlow

---

## 03 MVP Components

These are the components to build now. Each is specified at implementation level.

### Editing Model

LegalCode has **two editor modes:**

**Source Mode:**

- Markdown editing with syntax highlighting
- Structure, variables, and technical template work
- Full Yjs collaborative editing (real-time cursors, presence)
- This is where the markdown is authored and maintained
- Full available width for working with structured content

**Review Mode:**

- Rendered view of the markdown as a formatted legal document
- Constrained reading column (--review-max-width: 860px) centered in workspace
- Comment markers in a dedicated right margin rail (--review-margin-rail: 48px)
- Inline comments anchored to text selections
- Read-only content (no direct editing of the rendered output)
- Version comparison / diff viewing

The mode toggle lives in the **editor toolbar area** (below the app bar, within the editor surface — not in the app bar itself). It is a simple two-segment toggle: **Source** | **Review**. Default: Source for editors, Review for viewers.

This split resolves the markdown-vs-rich-editor tension. Source mode is a markdown editor. Review mode is a document review tool. They serve different moments in the workflow.

### Template List

**Search/filter bar:** sticky at top, --surface-elevated, --shadow-sm. Contains: search input (--border-subtle, --radius-lg), filter chips (status, category, country, company), sort dropdown.

**Template rows:**

- Clean list, not elevated cards. --surface-primary background, --border-subtle bottom border.
- Always visible: title (type-title, Source Serif 4, --text-primary) -> status badge -> "2h ago" (type-caption, --text-tertiary) -> "v12" (type-caption, --text-tertiary)
- Visible on hover or selection: category + company + country tags (type-caption-caps), active editors indicator, unresolved comment count. This is the calm-density rule in action — secondary metadata appears on interaction, not all at once.
- Row height: ~72px minimum
- Hover: --surface-tertiary background, springStandardFast. Secondary metadata fades in.
- Selected: left 3px --accent-primary border, --accent-primary-subtle background. Full metadata visible.

**Empty state:** centered, type-headline "No templates yet" (--text-primary), --accent-primary "Create your first template" button.

### Template Editor — Source Mode

**Editor toolbar (below app bar, within editor area):**

- Left: mode toggle (Source | Review)
- Center: **markdown helpers** — purpose-built insert actions for legal templates (not a generic formatting toolbar):
  - Heading (H1-H3 dropdown)
  - Link
  - Ordered / unordered list
  - Table
  - Clause reference (inserts a cross-reference marker, e.g., `{{clause:4.2}}`)
  - Variable / placeholder (inserts a template variable, e.g., `{{company_name}}`, `{{effective_date}}`)
  - Horizontal rule (section divider)
- Right: word count (type-caption, --text-tertiary)
- These are markdown insert helpers, not rich-text formatting tools. They insert markdown syntax at the cursor. Legal placeholders and clause blocks are first-class citizens.

**Editor surface:**

- --surface-editor background
- Monospace (--type-mono) for markdown source
- Syntax highlighting: headings in --text-primary weight 600, links in --accent-primary, emphasis in italic, code spans in --surface-tertiary background, variables/placeholders in --accent-primary with --accent-primary-subtle background
- Line numbers: --text-tertiary, right-aligned, --space-4 gutter

**Collaboration in source mode:**

- Yjs-powered real-time co-editing
- Cursors: 2px vertical line in user's cursor color, full line height
- Name flag at cursor top: user's cursor color background, white type-caption text, --radius-sm top corners. Appears on movement, fades to 50% after 3s inactivity.
- Selections: user's cursor color at 15% opacity background

### Template Editor — Review Mode

**Rendered view:**

- --surface-editor background
- Reading column: --review-max-width (860px) centered in the workspace
- Right margin rail: --review-margin-rail (48px) to the right of the reading column, holds comment markers
- Markdown rendered as formatted HTML: Source Serif 4 for headings, Source Sans 3 for body, generous typography (type-body at 1.6 line height, --space-5 between paragraphs)
- Read-only — no direct editing
- Template variables rendered with a subtle --accent-primary-subtle background and --accent-primary text to distinguish them from static content

**Comment creation (review mode only):**

- Select text -> floating "Comment" button appears near selection (--icon-md chat icon + "Comment" label, --accent-primary text, --surface-elevated background, --shadow-sm, --radius-md)
- Keyboard shortcut: Ctrl+Alt+M / Cmd+Opt+M
- Click -> right pane Comments tab focuses with new comment input pre-linked to the selection

**Comment highlights (inline in reading column):**

- Commented text: background in commenter's cursor color at 16% opacity (unresolved) or 6% (resolved)
- Click highlight -> focuses corresponding thread in right pane

**Comment markers (in the right margin rail):**

- Small colored dot (6px, --radius-full) aligned vertically with the commented text
- Color: commenter's cursor color
- Multiple markers on adjacent lines create a visual heat map of discussion density
- Click marker -> focuses corresponding thread in right pane and scrolls to the highlight

**Comment anchoring (architecture requirement — treat with care):** Comments MUST anchor to stable rendered document positions — block-level identifiers or structural markers in the markdown AST — not raw character offsets. This is one of the harder implementation challenges in the product. Edits in Source mode must not silently break or orphan comment anchors in Review mode. If the anchored text is deleted, the comment should surface as an orphaned thread that the author can reattach or dismiss. Design the anchoring data model carefully before building; do not treat this as a casual implementation detail.

### Right Pane — Metadata Tab

- Category, company, country, tags: labeled fields (type-label for labels, type-body for values)
- Inline editing on click (field becomes input)
- Status badge with action:
  - When draft: "Publish" button (--accent-primary, filled)
  - When published: "Archive" button (outlined, --text-secondary)
- Template creation date, last modified, created by (type-caption, --text-tertiary)

### Right Pane — Comments Tab

**Comment threads ordered by position in document** (top to bottom), not by creation time.

Each thread:

- **Anchor quote:** truncated highlighted text (type-caption, italic, --text-secondary, max 2 lines). Click -> scrolls editor to highlighted section.
- **Author:** avatar (24px) + name (type-label, weight 600) + timestamp (type-caption, --text-tertiary)
- **Comment text:** type-body
- **Replies:** indented --space-4 from parent, same format. Max visual indent: 3 levels.
- **Reply input:** compact, placeholder "Reply...", expands on focus
- **Actions:** Resolve (checkmark, type-label, --text-secondary), Edit/Delete own (icon-only, visible on hover)

**Thread states:**

- **Open:** full opacity, strong inline highlight, visible margin marker
- **Resolved:** collapsed to "checkmark [Author] resolved" (type-caption). Dimmed highlight. Click to expand.
- **Focused:** briefly flashes --accent-primary-subtle when navigated to from editor

**Top controls:** "Show resolved" toggle, total / unresolved comment count.

**Empty state:** "No comments yet. Select text in Review mode and press Ctrl+Alt+M to comment."

### Right Pane — Versions Tab

- Version list with thin 1px --border-subtle vertical timeline connector
- Each: version number (type-label, weight 600, --text-primary) + change summary (type-body) + author + timestamp (type-caption) + "View diff" link (--accent-primary)
- Current version: --accent-primary-subtle background
- "Compare versions" action -> opens diff view in the central workspace
- "Restore" on historical versions (creates new version with old content, confirmation dialog)

### Diff View

When a user clicks "View diff" or "Compare versions," the central workspace enters diff mode. The shell structure remains the same: left nav, app bar, workspace, and right pane all stay in place.

**Workspace layout in diff mode:**

- **Unified diff (MVP default and only mode):** single column, --review-max-width centered. Removed lines: --destructive-subtle background. Added lines: --status-published-bg background. Line-level highlighting, not character-level for MVP.
- **Side-by-side diff (future scope):** two equal columns within the workspace. Left: older version (type-caption header "Version N"). Right: newer version (type-caption header "Version M"). Same color treatment for removals/additions. Build only when explicitly requested.
- A small toolbar above the diff: version selectors (two dropdowns), "Back to editor" link. (Add "Unified | Side-by-side" toggle when side-by-side ships.)

**Right pane in diff mode:**

- Defaults to Versions tab (to allow quick version switching)
- Comments tab is available but read-only — no new comments can be created on a diff
- Metadata tab available as normal

**Diff does not support editing.** It is a read-only comparison view. To make changes, the user returns to Source mode.

### Template Status: Draft / Published / Archived

Three states with two transitions:

```
Draft -> Published (via "Publish" action)
Published -> Archived (via "Archive" action)
```

Invalid transitions: publishing an archived template, archiving a draft (unless you add a discard/archive-draft flow — decide explicitly).

**Status badges:**

```
Draft:     --status-draft-bg, --status-draft text, type-caption-caps, --radius-full pill, 4px 10px padding
Published: --status-published-bg, --status-published text
Archived:  --status-archived-bg, --status-archived text
```

**Publish action:** --accent-primary filled button, "Publish" label. Confirmation dialog: "Publishing makes this template available for use across the organization. Continue?"

**Archive action:** outlined button, --text-secondary. Confirmation dialog.

### Save / Version / Publish Semantics

Three distinct actions. Never conflate them.

**Autosave:**

- Continuous. Every keystroke persisted via Yjs -> Durable Object -> periodic D1 checkpoint.
- The user never manually "saves." Work is always safe.
- Status indicator in editor toolbar: "Saving..." (opacity pulse) -> "Saved" (static). Ambient only.
- Ctrl+S does nothing, or shows a brief "Changes save automatically" tooltip. Do NOT map it to version creation.

**Create Version:**

- Explicit action. "Create Version" button in app bar (outlined, --text-primary border/text).
- Opens dialog: version summary (required), optional detailed description.
- Creates an immutable snapshot in the Versions tab.
- This is a deliberate checkpoint: "I want to mark this state."

**Publish:**

- Separate status action in the Metadata tab.
- Changes draft -> published.
- This is a workflow gate, not a save action.

### Presence Avatars (App Bar)

- Stacked circles, rightmost on top, 28px, 2px border in user's cursor color
- Max 5 visible, then "+N" overflow
- Hover: tooltip with name + current mode (Source / Review)
- Click: scrolls editor to user's cursor (source mode only)

### Connection Status

- Editor toolbar area, ambient
- Connected: 8px --status-published dot + "Saved" (type-caption)
- Saving: opacity pulse + "Saving..."
- Offline: 8px --status-draft dot + "Offline — changes saved locally"
- Reconnecting: pulsing --status-draft dot + "Reconnecting..."
- Never modal, never toast

### Dialogs

- Max width 480px, --surface-elevated, --radius-xl
- Backdrop: --surface-primary at 50% opacity + backdrop-blur(8px)
- Title: type-headline, --text-primary
- Primary action: --accent-primary filled, white text, --radius-lg
- Secondary: text-only, --text-primary
- Destructive action: --destructive filled, white text
- Inputs: --border-subtle, --radius-lg, --space-3 / --space-4 padding

### Toast Notifications

- One at a time, bottom-center, 4s auto-dismiss
- --surface-elevated background, --shadow-lg, --radius-lg
- Icon + message (type-body) + optional action link
- Slide up + fade in, springStandard

---

## 04 Collaboration Future State

**Do not implement this section for MVP.** Build only when the editor architecture is proven and stable.

### Suggestion Mode (Track Changes)

A third editor mode beyond Source and Review. When active, edits in the rendered review view are recorded as proposals, not applied directly.

**Mode toggle becomes three segments:** Source | Review | Suggesting

**Inline rendering:**

- Insertions: text in suggester's cursor color, 10% bg, 1px underline
- Deletions: strikethrough in cursor color at 60%, 6% bg
- Replacements: strikethrough old + colored new, adjacent

**Right pane — Suggestions tab (fourth tab):**

- Suggestion cards: author, change preview (before/after), context quote
- Accept (checkmark, --accent-primary) / Reject (cross, --text-secondary) per suggestion
- Batch actions: "Accept all" / "Reject all" with confirmation
- Filter by author
- Discussion thread per suggestion

**Acceptance animation (hero moment):**

- Suggestion text transitions from cursor-colored -> --text-body with springExpressive
- Underline/strikethrough fades 300ms, background fades 400ms
- The suggestion "settles" into the document

**Visual density controls:**

- "Show suggestions: All / Mine / None" toggle
- "None" previews document as if all accepted

**Roles:** admins/editors accept/reject. Author can withdraw own. Viewers cannot suggest.

### Comment + Suggestion Interaction

- Independent systems. Resolving a comment doesn't affect suggestions and vice versa.
- Suggestion acceptance updates comment anchors if underlying text changed.

### Sync-Scrolling

- Optional: scrolling the editor tracks the Comments/Suggestions pane. Implement only if performance is proven.

---

## 05 Motion

### Spring Configurations

```css
--spring-standard: cubic-bezier(0.2, 0, 0, 1) 200ms;
--spring-standard-fast: cubic-bezier(0.2, 0, 0, 1) 150ms;
--spring-standard-slow: cubic-bezier(0.2, 0, 0, 1) 350ms;
--spring-expressive: cubic-bezier(0.34, 1.56, 0.64, 1) 400ms;
```

```javascript
const springStandard = { type: 'spring', stiffness: 500, damping: 35, mass: 1 };
const springStandardFast = { type: 'spring', stiffness: 700, damping: 40, mass: 0.8 };
const springStandardSlow = { type: 'spring', stiffness: 300, damping: 30, mass: 1.2 };
const springExpressive = { type: 'spring', stiffness: 400, damping: 20, mass: 1 };
```

### MVP Hero Moments (springExpressive)

1. Publishing: status badge morphs draft amber -> published green
2. New collaborator joining: avatar enters with slight bounce
3. Right context pane open/close

All other motion uses Standard springs.

### MVP Animation Specs

**Page transitions:** fade + scale 0.985<->1.0. Out: springStandardFast. In: springStandard. Child stagger: 30ms.

**Left nav:** hover -> --depth-secondary, springStandardFast. Active indicator slides, springStandard.

**Right pane:** open/close springExpressive. Tab switch: crossfade springStandardFast.

**Template list:** hover -> --surface-tertiary + --shadow-sm + secondary metadata fade-in, springStandardFast. New items: translateY(8) + fade, 40ms stagger.

**Mode toggle:** active segment slides horizontally, springStandard.

**Collaboration cursors:** appear fade-in springStandardFast. Movement: springStandard. New user avatar: springExpressive. Departure: 300ms fade.

**Publishing:** badge color morph springExpressive + brief --accent-primary-subtle flash.

**Autosave indicator:** opacity pulse 1->0.6->1, 1.5s. Crossfade on text change, springStandardFast.

**Dialogs:** backdrop 150ms linear. Dialog scale 0.95->1.0 springStandard. Dismiss scale 0.97 springStandardFast.

**Comment highlights:** background-color fade in 200ms on creation, fade to resolved opacity 400ms on resolve.

### Motion Rules

1. Never animate layout shifts under text being read or written.
2. Respect `prefers-reduced-motion`. Instant transitions, fades at 100ms.
3. No skeleton screens for <200ms loads.
4. Zero animation on typing. Editor is zero-latency.
5. No scroll-triggered animation.
6. No spinners for autosave.

---

## 06 Rules

### Do

- Use beige as the primary surface. It is the Acasus identity.
- Use dark purple for the left nav and heading text.
- Use light purple only for interactive elements.
- Use Source Serif 4 for template/document titles.
- Use Source Sans 3 for all UI chrome.
- Make the editor the center of gravity.
- Keep the left nav to three destinations. Filtering lives on the page.
- Keep version history, comments, and metadata in the right context pane.
- Distinguish autosave, create version, and publish as three separate concepts.
- Use purple-tinted shadows, not black.
- Give every icon-only button a tooltip (500ms delay).
- Use the focus ring token consistently.
- Default to calm density. Show secondary metadata on hover/selection, not all at once.
- Constrain Review mode to --review-max-width with a dedicated comment margin rail.
- Let Source mode use full width.
- Anchor comments to stable document positions, not raw character offsets.

### Don't

- No gray surfaces. This app is beige.
- No gradients. Flat blocks.
- No light purple as a large surface.
- No red for publish or positive actions. Red is destructive/risk only.
- No narrow icon-only rail. Left nav always shows labels.
- No version history in global nav. Right pane only.
- No sub-navigation tree in the left nav for MVP.
- No rounded-everything. Use radius tokens.
- No hover animations on text. Opacity or underline only.
- No skeleton loading screens.
- No toast stacking. One at a time, bottom-center, 4s.
- No custom scrollbars. OS defaults.
- No animated illustrations or Lottie.
- No blue links. --accent-primary only.
- No comments styled as chat bubbles.
- No suggestion mode in MVP.
- No Ctrl+S mapped to version creation.
- No crowded template list rows. Secondary metadata reveals on interaction.
- No editing in Review mode. It is read-only. Editing happens in Source mode.
- No editing in Diff view. It is read-only comparison.

---

## Navigation Map

### App-Level (Left Nav)

```
Templates
Admin
Settings
----------
Avatar Menu -> Profile, Log Out
```

### Page-Level (Templates page provides)

```
Search, filter chips, sort, category/company/status filtering, saved views
```

### Document-Level (Right Context Pane)

```
MVP Tabs:    Metadata | Comments | Versions
Future Tab:  Suggestions (section 04)
```

### Routes

```
/                                -> redirect to /templates
/templates                       -> template list
/templates/new                   -> editor, source mode, Metadata tab open
/templates/:id                   -> editor, right pane available
/templates/:id/diff/:v1/:v2     -> diff view, Versions tab open
/admin                           -> admin panel
/settings                        -> settings
/login                           -> standalone auth screen (no app shell)
```

---

## Keyboard Shortcuts

```
Ctrl+Alt+M / Cmd+Opt+M      — Comment on selected text (review mode)
Ctrl+Shift+P / Cmd+Shift+P  — Toggle right context pane
Ctrl+/ / Cmd+/               — Show keyboard shortcuts
Escape                        — Close pane / dismiss dialog
```

Future (section 04):

```
Ctrl+Alt+S / Cmd+Opt+S      — Toggle suggestion mode
Ctrl+Alt+A / Cmd+Opt+A      — Accept suggestion at cursor
Ctrl+Alt+R / Cmd+Opt+R      — Reject suggestion at cursor
```

---

## PWA

```json
{
  "name": "LegalCode by Acasus",
  "short_name": "LegalCode",
  "background_color": "#EFE3D3",
  "theme_color": "#451F61",
  "display": "standalone"
}
```

- Splash: Acasus wordmark (dark purple) on beige. No spinner.
- Title bar: dark purple via Window Controls Overlay if available.
- Offline: 3px --status-draft bar at viewport top. "Working offline — changes saved locally." No modal.
