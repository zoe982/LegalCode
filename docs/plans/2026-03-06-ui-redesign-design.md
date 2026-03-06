# LegalCode UI/UX Redesign — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Design System:** `.claude/skills/legalcode-design.md` (source of truth)

## Summary

Complete UI/UX redesign of LegalCode to implement the Acasus brand identity with a Material Design 3 Expressive foundation. Replaces the current generic MUI theme with a warm, document-first design system built around beige surfaces, purple-tinted depth, and serif document typography.

## What Changes

### Current State

- Generic MUI theme (Inter font, blue primary, gray surfaces, 12px border radius)
- Single editor page with tabs for Edit/Versions
- No persistent navigation — back button only
- No design tokens or systematic spacing
- No review mode, no comment system, no diff view

### Target State

- Four-zone desktop frame: persistent left nav (240px, dark purple), top app bar (64px), central workspace (flex), right context pane (400px, collapsible)
- Source Mode (markdown editing with Yjs collab) and Review Mode (rendered read-only with comment margin rail)
- Right pane with Metadata / Comments / Versions tabs
- Unified diff view for version comparison
- Autosave / Create Version / Publish as three distinct concepts
- Full design token system (color, type, spacing, radius, elevation, layer, motion)
- PWA configuration with Acasus branding

## Design Principles

1. **Document-first.** The template content is the hero.
2. **Warm, not corporate.** Beige surfaces, serif titles, purple-tinted depth.
3. **Calm, not dense.** Secondary metadata on hover/selection, not all at once.
4. **Precise, not decorative.** Every element earns its place.

## Architecture Decisions

### Brand Identity

- **Primary surface:** Beige (#EFE3D3) — not gray, not white
- **Text/structure:** Dark purple (#451F61) — left nav, headings
- **Interactive:** Light purple (#8027FF) — buttons, links, active states only
- **Destructive only:** Red (#D32F2F) — never for publish or positive actions
- **Typography:** Source Serif 4 (document titles), Source Sans 3 (UI chrome), JetBrains Mono (editor)
- **Shadows:** Purple-tinted, not black

### Layout

- Persistent labeled left nav (240px) — three destinations only (Templates, Admin, Settings)
- Admin and Settings are visually quieter than Templates — same shell, simpler layouts, less visual weight
- Desktop-first with four explicit breakpoints (1280+, 1024-1279, 900-1023, sub-900 unsupported)
- Right context pane: inline at 1280+, overlay at 1024-1279, overlay at 900-1023

### Editor Model

- **Source Mode:** Full-width markdown editing with Yjs collaboration, monospace font, line numbers, markdown helpers (not a generic formatting toolbar — legal placeholders and clause blocks are first-class)
- **Review Mode:** Rendered read-only view, max-width 860px centered, 48px right margin rail for comment markers
- Mode toggle in editor toolbar area (not app bar)

### Diff View

- **MVP:** Unified diff only (single column, review max-width centered)
- **Future:** Side-by-side diff when explicitly requested

### Save Semantics

- **Autosave:** Continuous via Yjs, ambient status indicator, Ctrl+S does nothing (or shows tooltip)
- **Create Version:** Explicit action with summary dialog, creates immutable snapshot
- **Publish:** Separate workflow gate in Metadata tab, changes draft to published

### Comment Anchoring (architecture requirement)

- Comments anchor to stable markdown AST positions, not character offsets
- Edits in Source mode must not break comment anchors in Review mode
- Orphaned comments (anchor text deleted) surface for reattachment or dismissal
- This is one of the harder implementation challenges — design the data model carefully before building

### Motion

- Spring-based system with four configs (standard, standardFast, standardSlow, expressive)
- Three hero moments: publish badge morph, collaborator join bounce, pane open/close
- Respects prefers-reduced-motion, zero animation on typing

## MVP Boundary

**Build now (sections 01-03, 05):**

- Design token system and MUI theme
- Four-zone layout shell with responsive breakpoints
- Template list with calm-density hover reveal
- Source mode editor with markdown helpers
- Review mode with rendered view and comment margin rail
- Right pane (Metadata, Comments, Versions tabs)
- Unified diff view
- Status badges and transitions (Draft -> Published -> Archived)
- Presence avatars, connection status
- Dialogs, toasts
- Motion system
- PWA manifest and assets

**Explicitly excluded from MVP:**

- Dark theme (section 01, labeled future scope)
- Side-by-side diff (section 03, build when requested)
- Suggestion mode / track changes (section 04, entire section is future scope)
- Sync-scrolling between editor and pane

## Testing Strategy

- Every component must have tests for all visual states
- Layout shell responsive behavior tested at each breakpoint
- Editor mode switching (Source/Review) tested
- Right pane tab switching and collapse/expand tested
- Comment creation and anchoring tested
- Diff view rendering tested
- Motion respects prefers-reduced-motion tested
- Keyboard shortcuts tested
- WCAG AA contrast ratios verified

## Routes

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

## Implementation Approach

The design system skill (`.claude/skills/legalcode-design.md`) is the single source of truth. All implementation work references it. Ive (designer subagent) reads it before producing any component spec. Frontend Engineer implements against Ive's specs and the design system tokens.

Implementation should proceed in layers:

1. Theme and token foundation (CSS custom properties + MUI theme override)
2. Layout shell (four-zone frame, nav, app bar)
3. Template list page
4. Editor page (source mode first, then review mode)
5. Right context pane (metadata first, then versions, then comments)
6. Diff view
7. Motion system
8. PWA assets and manifest
