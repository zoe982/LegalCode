# Template Management UI Design

## Overview

Build the frontend template management UI (Phases 3 + 4) using the existing backend CRUD API.

## Routes

| Route            | Page               | Purpose                                         |
| ---------------- | ------------------ | ----------------------------------------------- |
| `/`              | TemplateListPage   | Templates grouped by category, search + filters |
| `/templates/new` | TemplateEditorPage | Create new template                             |
| `/templates/:id` | TemplateEditorPage | Tabbed view: Edit, Versions                     |

## Pages & Components

### TemplateListPage (`/`)

- Search bar at top (debounced, filters across all groups)
- Filter chips: status (draft/active/archived), country
- Templates grouped by category in MUI Accordions (expanded by default)
- Each group shows a table: title, version, country, status
- Rows clickable → navigate to `/templates/:id`
- FAB bottom-right: "+ New Template" (editors/admins only)
- Empty state when no templates exist

### TemplateEditorPage (`/templates/:id` and `/templates/new`)

- Top bar: Back button (←), template title, Export button (download .md)
- Two tabs: **Edit** | **Versions**
- Create mode (`/templates/new`): Edit tab only, no Versions tab

#### Edit Tab (TemplateForm)

- Fields: Title (text), Category (text/autocomplete), Country (select, optional), Tags (chip input)
- Milkdown markdown editor for template content
- Action buttons:
  - Draft: "Save Draft" (creates new version)
  - Active: "Save" (with change summary dialog)
  - Draft → Active: "Publish" button
  - Active → Archived: "Archive" button (with confirmation)
- Optional change summary prompted on save (for versioned updates)
- Viewers see read-only view (fields disabled, editor not editable)

#### Versions Tab (VersionHistory)

- List of versions: version number, change summary, created by, date
- Click a version → shows that version's content in read-only editor
- Current version highlighted

### Shared Components

- `MarkdownEditor` — Milkdown (ProseMirror + Markdown) wrapper
  - Toolbar: bold, italic, headings, lists, blockquote, code
  - Read-only mode for viewers and version preview
- `StatusChip` — Colored chip for draft/active/archived
- `TagInput` — Autocomplete chip input for tags

## Data Layer

### API Service (`services/templates.ts`)

```typescript
templateService = {
  list(params): Promise<{ templates, total, page, limit }>
  get(id): Promise<{ template, content, changeSummary, tags }>
  create(data): Promise<{ template, tags }>
  update(id, data): Promise<{ template, tags }>
  publish(id): Promise<{ template }>
  archive(id): Promise<{ template }>
  getVersions(id): Promise<{ versions }>
  getVersion(id, version): Promise<{ version }>
  download(id): triggers file download
}
```

### TanStack Query Hooks (`hooks/useTemplates.ts`)

- `useTemplates(filters)` — list with search/filter params
- `useTemplate(id)` — single template with content
- `useTemplateVersions(id)` — version history
- `useCreateTemplate()` — mutation
- `useUpdateTemplate()` — mutation (invalidates template + versions)
- `usePublishTemplate()` — mutation
- `useArchiveTemplate()` — mutation

## Authorization

- **Viewers**: Read-only. No FAB, disabled form fields, no save/publish/archive buttons.
- **Editors + Admins**: Full CRUD. FAB visible, form editable, all action buttons.

## Deferred (Next Phase)

- Comments (needs backend: comments table, API routes)
- Google Doc export (needs backend: Google Docs API integration)
