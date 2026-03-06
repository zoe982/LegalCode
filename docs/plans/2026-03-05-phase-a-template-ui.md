# Phase A: Template Management UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full template management frontend — list, create, edit, version history, and markdown export — using the existing backend API.

**Architecture:** React Router for page navigation, TanStack Query for server state, Milkdown Crepe editor for markdown editing, MUI v7 for UI components. All template data fetched from existing `/templates` API routes.

**Tech Stack:** React 19, React Router 7, TanStack Query v5, MUI v7, Milkdown Crepe (ProseMirror), Vitest + React Testing Library + MSW

---

### Task 1: Install Dependencies

**Files:**

- Modify: `packages/web/package.json`

**Step 1: Install Milkdown packages**

Run:

```bash
pnpm --filter @legalcode/web add @milkdown/crepe @milkdown/react @milkdown/kit
```

**Step 2: Verify install succeeded**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore: add milkdown editor dependencies"
```

---

### Task 2: Template API Service

**Files:**

- Create: `packages/web/src/services/templates.ts`
- Create: `packages/web/tests/services/templates.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/web/tests/services/templates.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { templateService } from '../../src/services/templates.js';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('templateService', () => {
  describe('list', () => {
    it('fetches templates with query params', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ templates: [], total: 0, page: 1, limit: 20 })),
      );
      await templateService.list({ search: 'nda', status: 'active' });
      const url = new URL(mockFetch.mock.calls[0][0] as string, 'http://localhost');
      expect(url.pathname).toBe('/templates');
      expect(url.searchParams.get('search')).toBe('nda');
      expect(url.searchParams.get('status')).toBe('active');
    });

    it('returns template list response', async () => {
      const data = { templates: [{ id: '1', title: 'Test' }], total: 1, page: 1, limit: 20 };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(data)));
      const result = await templateService.list({});
      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('get', () => {
    it('fetches a single template by id', async () => {
      const data = { template: { id: '1' }, content: '# Hello', changeSummary: null, tags: [] };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(data)));
      const result = await templateService.get('1');
      expect(result.template.id).toBe('1');
      expect(result.content).toBe('# Hello');
      expect(mockFetch).toHaveBeenCalledWith(
        '/templates/1',
        expect.objectContaining({ credentials: 'include' }),
      );
    });
  });

  describe('create', () => {
    it('posts new template data', async () => {
      const body = { title: 'NDA', category: 'NDA', content: '# NDA' };
      const data = { template: { id: '1', ...body }, tags: [] };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(data), { status: 201 }));
      const result = await templateService.create(body);
      expect(result.template.title).toBe('NDA');
      expect(mockFetch).toHaveBeenCalledWith(
        '/templates',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  describe('update', () => {
    it('patches template with partial data', async () => {
      const body = { title: 'Updated NDA', changeSummary: 'Fixed clause 3' };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ template: { id: '1' }, tags: [] })),
      );
      await templateService.update('1', body);
      expect(mockFetch).toHaveBeenCalledWith(
        '/templates/1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('publish', () => {
    it('publishes a draft template', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ template: { id: '1', status: 'active' } })),
      );
      const result = await templateService.publish('1');
      expect(result.template.status).toBe('active');
      expect(mockFetch).toHaveBeenCalledWith(
        '/templates/1/publish',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('archive', () => {
    it('archives a template', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ template: { id: '1', status: 'archived' } })),
      );
      const result = await templateService.archive('1');
      expect(result.template.status).toBe('archived');
    });
  });

  describe('getVersions', () => {
    it('fetches version history', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ versions: [{ version: 1 }, { version: 2 }] })),
      );
      const result = await templateService.getVersions('1');
      expect(result.versions).toHaveLength(2);
    });
  });

  describe('getVersion', () => {
    it('fetches a specific version', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ version: { version: 1, content: '# v1' } })),
      );
      const result = await templateService.getVersion('1', 1);
      expect(result.version.content).toBe('# v1');
      expect(mockFetch).toHaveBeenCalledWith('/templates/1/versions/1', expect.any(Object));
    });
  });

  describe('download', () => {
    it('triggers file download', async () => {
      const blob = new Blob(['# Content'], { type: 'text/markdown' });
      mockFetch.mockResolvedValue(
        new Response(blob, {
          headers: { 'Content-Disposition': 'attachment; filename="template.md"' },
        }),
      );
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node);
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => node);

      await templateService.download('1');

      expect(mockFetch).toHaveBeenCalledWith('/templates/1/download', expect.any(Object));
      expect(createElementSpy).toHaveBeenCalledWith('a');
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- packages/web/tests/services/templates.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// packages/web/src/services/templates.ts
import type {
  Template,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@legalcode/shared';

interface ListParams {
  search?: string;
  category?: string;
  country?: string;
  status?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

interface ListResponse {
  templates: Template[];
  total: number;
  page: number;
  limit: number;
}

interface GetResponse {
  template: Template;
  content: string;
  changeSummary: string | null;
  tags: string[];
}

interface MutateResponse {
  template: Template;
  tags: string[];
}

interface VersionsResponse {
  versions: TemplateVersion[];
}

interface VersionResponse {
  version: TemplateVersion;
}

const opts: RequestInit = { credentials: 'include' };

export const templateService = {
  async list(params: ListParams): Promise<ListResponse> {
    const url = new URL('/templates', window.location.origin);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    const res = await fetch(url.toString(), opts);
    return (await res.json()) as ListResponse;
  },

  async get(id: string): Promise<GetResponse> {
    const res = await fetch(`/templates/${id}`, opts);
    return (await res.json()) as GetResponse;
  },

  async create(data: CreateTemplateInput): Promise<MutateResponse> {
    const res = await fetch('/templates', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await res.json()) as MutateResponse;
  },

  async update(id: string, data: UpdateTemplateInput): Promise<MutateResponse> {
    const res = await fetch(`/templates/${id}`, {
      ...opts,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await res.json()) as MutateResponse;
  },

  async publish(id: string): Promise<{ template: Template }> {
    const res = await fetch(`/templates/${id}/publish`, { ...opts, method: 'POST' });
    return (await res.json()) as { template: Template };
  },

  async archive(id: string): Promise<{ template: Template }> {
    const res = await fetch(`/templates/${id}/archive`, { ...opts, method: 'POST' });
    return (await res.json()) as { template: Template };
  },

  async getVersions(id: string): Promise<VersionsResponse> {
    const res = await fetch(`/templates/${id}/versions`, opts);
    return (await res.json()) as VersionsResponse;
  },

  async getVersion(id: string, version: number): Promise<VersionResponse> {
    const res = await fetch(`/templates/${id}/versions/${String(version)}`, opts);
    return (await res.json()) as VersionResponse;
  },

  async download(id: string): Promise<void> {
    const res = await fetch(`/templates/${id}/download`, opts);
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = match?.[1] ?? 'template.md';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- packages/web/tests/services/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/services/templates.ts packages/web/tests/services/templates.test.ts
git commit -m "feat: add template API service with tests"
```

---

### Task 3: TanStack Query Hooks

**Files:**

- Create: `packages/web/src/hooks/useTemplates.ts`
- Create: `packages/web/tests/hooks/useTemplates.test.tsx`

**Step 1: Write the failing tests**

```typescript
// packages/web/tests/hooks/useTemplates.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
} from '../../src/hooks/useTemplates.js';
import { templateService } from '../../src/services/templates.js';

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    getVersions: vi.fn(),
    getVersion: vi.fn(),
    download: vi.fn(),
  },
}));

const mockedService = vi.mocked(templateService);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches template list', async () => {
    mockedService.list.mockResolvedValue({
      templates: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const { result } = renderHook(() => useTemplates({}), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.templates).toEqual([]);
  });

  it('passes filter params to service', async () => {
    mockedService.list.mockResolvedValue({
      templates: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    renderHook(() => useTemplates({ search: 'nda', status: 'active' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(mockedService.list).toHaveBeenCalledWith({
        search: 'nda',
        status: 'active',
      });
    });
  });
});

describe('useTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches single template by id', async () => {
    const data = {
      template: { id: '1', title: 'Test' },
      content: '# Hi',
      changeSummary: null,
      tags: [],
    };
    mockedService.get.mockResolvedValue(
      data as Awaited<ReturnType<typeof mockedService.get>>,
    );
    const { result } = renderHook(() => useTemplate('1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.template.id).toBe('1');
  });
});

describe('useTemplateVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches version history', async () => {
    mockedService.getVersions.mockResolvedValue({
      versions: [{ version: 1 }],
    } as Awaited<ReturnType<typeof mockedService.getVersions>>);
    const { result } = renderHook(() => useTemplateVersions('1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.versions).toHaveLength(1);
  });
});

describe('useCreateTemplate', () => {
  it('provides create mutation', () => {
    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useUpdateTemplate', () => {
  it('provides update mutation', () => {
    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('usePublishTemplate', () => {
  it('provides publish mutation', () => {
    const { result } = renderHook(() => usePublishTemplate(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useArchiveTemplate', () => {
  it('provides archive mutation', () => {
    const { result } = renderHook(() => useArchiveTemplate(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- packages/web/tests/hooks/useTemplates.test.tsx`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// packages/web/src/hooks/useTemplates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateService } from '../services/templates.js';
import type { CreateTemplateInput, UpdateTemplateInput } from '@legalcode/shared';

interface ListFilters {
  search?: string;
  category?: string;
  country?: string;
  status?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export function useTemplates(filters: ListFilters) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => templateService.list(filters),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templateService.get(id),
    enabled: id !== '',
  });
}

export function useTemplateVersions(id: string) {
  return useQuery({
    queryKey: ['templates', id, 'versions'],
    queryFn: () => templateService.getVersions(id),
    enabled: id !== '',
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateInput) => templateService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      templateService.update(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({
        queryKey: ['templates', id, 'versions'],
      });
    },
  });
}

export function usePublishTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templateService.publish(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useArchiveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templateService.archive(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
```

**Step 4: Run tests**

Run: `pnpm test -- packages/web/tests/hooks/useTemplates.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/hooks/useTemplates.ts packages/web/tests/hooks/useTemplates.test.tsx
git commit -m "feat: add TanStack Query hooks for template CRUD"
```

---

### Task 4: MSW Handlers for Templates

**Files:**

- Modify: `packages/web/src/mocks/handlers.ts`

**Step 1: Read existing handlers file and add template mock handlers**

Add MSW handlers for template endpoints used by integration tests. The handlers should cover:

- `GET /templates` — return list with 3 templates across 2 categories (Employment, NDA)
- `GET /templates/:id` — return a single template with content
- `POST /templates` — return created template (201)
- `PATCH /templates/:id` — return updated template
- `POST /templates/:id/publish` — return template with status 'active'
- `POST /templates/:id/archive` — return template with status 'archived'
- `GET /templates/:id/versions` — return version list
- `GET /templates/:id/versions/:version` — return single version
- `GET /templates/:id/download` — return markdown blob

**Step 2: Run all tests to verify nothing broke**

Run: `pnpm test`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/web/src/mocks/handlers.ts
git commit -m "feat: add MSW handlers for template API mocking"
```

---

### Task 5: React Router Setup

**Files:**

- Modify: `packages/web/src/App.tsx`
- Create: `packages/web/src/pages/TemplateListPage.tsx` (stub)
- Create: `packages/web/src/pages/TemplateEditorPage.tsx` (stub)
- Modify: `packages/web/tests/App.test.tsx`

**Step 1: Write failing test**

Update `App.test.tsx` — the authenticated test should verify router renders template list at `/`. Mock `/templates` endpoint via MSW to return empty list.

**Step 2: Run to verify it fails**

Run: `pnpm test -- packages/web/tests/App.test.tsx`

**Step 3: Implement**

Set up `createBrowserRouter` with routes:

- `/` — `TemplateListPage`
- `/templates/new` — `TemplateEditorPage` (create mode)
- `/templates/:id` — `TemplateEditorPage` (edit mode)

All routes wrapped in a layout that includes the AppBar (from current `AuthenticatedApp`). Create stub page components that render placeholder text.

Use `RouterProvider` inside `AuthGuard`. The `AuthenticatedApp` component becomes the layout route element.

**Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/pages/ packages/web/tests/App.test.tsx
git commit -m "feat: add React Router with template page routes"
```

---

### Task 6: Template List Page

**Files:**

- Modify: `packages/web/src/pages/TemplateListPage.tsx`
- Create: `packages/web/tests/pages/TemplateListPage.test.tsx`

**Step 1: Write failing tests**

Test cases:

- Renders loading spinner while fetching
- Renders empty state when no templates
- Groups templates by category in accordion sections
- Each template row shows title, version, country, status chip
- Search input filters templates (updates query params)
- FAB visible for editors, hidden for viewers
- Clicking FAB navigates to `/templates/new`
- Status filter chips filter templates

Use MSW for API mocking. Wrap component in router + query provider + theme for tests.

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- packages/web/tests/pages/TemplateListPage.test.tsx`
Expected: FAIL

**Step 3: Implement TemplateListPage**

Key elements:

- `TextField` search with debounce (300ms via `setTimeout`/`clearTimeout`)
- Status `Chip` components: All, Draft, Active, Archived
- `useTemplates(filters)` with search/status as query params
- Group templates by `category` using `Object.groupBy` or reduce
- MUI `Accordion` per category (all `defaultExpanded`)
- MUI `Table` inside each: Title, Version (vN), Country, Status (`StatusChip`)
- `TableRow` clickable: `onClick={() => navigate('/templates/' + id)}`
- `Fab` with `AddIcon` at bottom-right, only if `user.role !== 'viewer'`
- Empty state: centered text "No templates yet" with "Create your first template" button

**Step 4: Run tests**

Run: `pnpm test -- packages/web/tests/pages/TemplateListPage.test.tsx`
Expected: PASS

**Step 5: Run all quality gates**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/web/src/pages/TemplateListPage.tsx packages/web/tests/pages/TemplateListPage.test.tsx packages/web/src/components/StatusChip.tsx packages/web/tests/components/StatusChip.test.tsx
git commit -m "feat: add template list page with category grouping and filters"
```

---

### Task 7: Milkdown Editor Component

**Files:**

- Create: `packages/web/src/components/MarkdownEditor.tsx`
- Create: `packages/web/tests/components/MarkdownEditor.test.tsx`

**Step 1: Write failing tests**

Test cases:

- Renders the editor container element
- Accepts `defaultValue` prop
- Accepts `readOnly` prop
- Accepts `onChange` callback prop

Note: Milkdown uses ProseMirror which needs a real DOM. Unit tests verify the component mounts without errors and the prop interface is correct. Deep editor interaction is covered by e2e tests.

**Step 2: Run tests to verify they fail**

**Step 3: Implement MarkdownEditor**

Props interface:

```typescript
interface MarkdownEditorProps {
  defaultValue?: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
}
```

Implementation:

- Use `MilkdownProvider` + `Milkdown` from `@milkdown/react`
- Use `useEditor` hook to create `Crepe` instance from `@milkdown/crepe`
- Configure `Crepe.Feature.Toolbar: true`, `Crepe.Feature.Placeholder` with text
- Register `markdownUpdated` listener to call `onChange`
- Use `crepe.setReadonly(readOnly)` when readOnly changes
- Import CSS: `@milkdown/crepe/theme/common/style.css`, `@milkdown/crepe/theme/frame.css`
- Wrap in `Box` with `sx={{ minHeight: 300, border: 1, borderColor: 'divider', borderRadius: 1 }}`

**Step 4: Run tests**

Run: `pnpm test -- packages/web/tests/components/MarkdownEditor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/components/MarkdownEditor.tsx packages/web/tests/components/MarkdownEditor.test.tsx
git commit -m "feat: add Milkdown Crepe markdown editor component"
```

---

### Task 8: Template Editor Page

**Files:**

- Modify: `packages/web/src/pages/TemplateEditorPage.tsx`
- Create: `packages/web/tests/pages/TemplateEditorPage.test.tsx`

**Step 1: Write failing tests**

Test cases for create mode (`/templates/new`):

- Renders empty form with title, category, country, tags fields
- Renders markdown editor
- Shows "Save Draft" button
- No Versions tab in create mode
- Submitting calls create mutation

Test cases for edit mode (`/templates/:id`):

- Loads template data and populates form fields
- Shows Edit and Versions tabs
- Shows "Save" button for active templates
- Shows "Publish" button for draft templates
- Shows "Archive" button for active templates
- Export button triggers download
- Back button present
- Read-only mode for viewers (no action buttons)

Use MSW for API mocking. Mock `useAuth` for role-based tests. Mock `useParams` for id.

**Step 2: Run tests to verify they fail**

**Step 3: Implement TemplateEditorPage**

Layout:

- Top bar: `IconButton` (ArrowBack, navigates to `/`) + `Typography` (title or "New Template") + `Button` (Export, calls `templateService.download`)
- `Tabs` component: Edit | Versions (Versions hidden when `isNew`)
- Edit `TabPanel`: form fields + `MarkdownEditor` + action buttons
- Versions `TabPanel`: `VersionHistory` component (Task 9)

Form fields:

- `TextField` for title (required)
- `TextField` for category (required)
- `Autocomplete` with `freeSolo` for country (optional, 2-letter codes)
- `Autocomplete` with `freeSolo` + `multiple` for tags

Action buttons (based on status + role):

- Draft: "Save Draft" + "Publish"
- Active: "Save" (prompts change summary dialog) + "Archive"
- Archived: read-only, no buttons
- Viewers: no buttons regardless

Change summary: `Dialog` with `TextField` that appears before saving active templates.

**Step 4: Run tests**

Run: `pnpm test -- packages/web/tests/pages/TemplateEditorPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/pages/TemplateEditorPage.tsx packages/web/tests/pages/TemplateEditorPage.test.tsx
git commit -m "feat: add template editor page with create/edit form"
```

---

### Task 9: Version History Component

**Files:**

- Create: `packages/web/src/components/VersionHistory.tsx`
- Create: `packages/web/tests/components/VersionHistory.test.tsx`

**Step 1: Write failing tests**

Test cases:

- Renders loading state while fetching versions
- Renders list of versions with version number, change summary, date
- Current version (highest number) is highlighted
- Clicking a version loads that version's content in read-only editor

**Step 2: Run tests to verify they fail**

**Step 3: Implement VersionHistory**

Props: `templateId: string`, `currentVersion: number`

- Use `useTemplateVersions(templateId)` hook
- MUI `List` with `ListItemButton` per version
- Each item: `Chip` label="v{n}", `ListItemText` primary=changeSummary secondary=date
- Current version gets `selected` prop
- Clicking loads version content via `templateService.getVersion()` into local state
- Display selected version content in read-only `MarkdownEditor` below list

**Step 4: Run tests**

Run: `pnpm test -- packages/web/tests/components/VersionHistory.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web/src/components/VersionHistory.tsx packages/web/tests/components/VersionHistory.test.tsx
git commit -m "feat: add version history component with version preview"
```

---

### Task 10: StatusChip Component

**Files:**

- Create: `packages/web/src/components/StatusChip.tsx`
- Create: `packages/web/tests/components/StatusChip.test.tsx`

**Step 1: Write failing tests**

```typescript
// packages/web/tests/components/StatusChip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../../src/components/StatusChip.js';

describe('StatusChip', () => {
  it('renders draft with default color', () => {
    render(<StatusChip status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders active with success color', () => {
    render(<StatusChip status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders archived with default color', () => {
    render(<StatusChip status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
```

**Step 2: Implement**

```typescript
// packages/web/src/components/StatusChip.tsx
import { Chip } from '@mui/material';
import type { TemplateStatus } from '@legalcode/shared';

const statusConfig: Record<TemplateStatus, { label: string; color: 'default' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'success' },
  archived: { label: 'Archived', color: 'warning' },
};

interface StatusChipProps {
  status: TemplateStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];
  return <Chip label={config.label} color={config.color} size="small" />;
}
```

**Step 3: Run tests, commit**

```bash
git add packages/web/src/components/StatusChip.tsx packages/web/tests/components/StatusChip.test.tsx
git commit -m "feat: add StatusChip component"
```

---

### Task 11: Integration Testing & Quality Gates

**Step 1: Run all quality gates**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

All must pass with zero warnings and 95% per-file coverage.

**Step 2: Fix any issues found**

Address any lint errors, type errors, or coverage gaps.

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve quality gate issues for template UI"
```

---

### Task 12: Build, Deploy, Verify

**Step 1: Build**

Run: `pnpm build`
Expected: PASS

**Step 2: Deploy**

Run: `npx wrangler deploy`
Expected: Deployed successfully

**Step 3: Verify on production**

Visit https://legalcode.ax1access.com:

- Sign in -> see template list (empty state)
- Click FAB -> navigate to create page
- Fill form, save draft -> returns to list with new template
- Click template -> edit page with tabs
- Edit tab: modify content, save
- Versions tab: see version history
- Export downloads .md file

**Step 4: Push to GitHub**

```bash
git push origin main
```
