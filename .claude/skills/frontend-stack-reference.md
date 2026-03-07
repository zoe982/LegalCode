name: frontend-stack-reference
description: Comprehensive reference guide for the LegalCode frontend stack. Frontend Engineer subagent MUST read this before writing any code.

---

# LegalCode Frontend Stack Reference

## 1. React 19

### Key Changes from React 18

- **ref as prop**: Components accept `ref` as a regular prop — `forwardRef` is no longer needed (though still supported)
- **`useActionState`**: Replaces `useFormState`. Returns `[state, dispatchAction]` for form/action state management
- **`useOptimistic`**: Built-in optimistic UI updates — `const [optimistic, setOptimistic] = useOptimistic(state)`
- **`use()` hook**: Can read promises and context inside render (replaces some `useEffect` + `useState` patterns)
- **React Compiler**: Automatic memoization — reduces need for manual `useMemo`/`useCallback` (not yet enabled in this project)
- **Actions**: Functions that use transitions, can be async, automatically manage pending state

### Patterns Used in This Project

```tsx
// ref as prop (no forwardRef needed in React 19)
function MyInput({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}

// useActionState for form handling
import { useActionState } from 'react';
function MyForm() {
  const [state, dispatch] = useActionState(async (prev, formData) => {
    const result = await submitForm(formData);
    return result;
  }, initialState);
}
```

---

## 2. MUI v7 (Material UI)

### Context7 Library ID: `/mui/material-ui/v7_3_2`

### Key Changes from v6

- **Palette**: `palette.type` renamed to `palette.mode` (`'light'` | `'dark'`)
- **Spacing**: `theme.spacing()` returns CSS-ready values — no `px` suffix needed
- **CSS class names**: Combined selectors (e.g., `.MuiButton-text.MuiButton-colorPrimary` instead of `.MuiButton-textPrimary`)
- **Import `styled` correctly**: Always from `@mui/material/styles`, NOT `@mui/system`

### Correct Import Patterns

```tsx
// Theme and styling
import { ThemeProvider, styled, useTheme } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Components — use named imports from @mui/material
import { Button, TextField, Dialog, Box, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid'; // if using data grid

// Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
```

### sx Prop (Preferred for One-Off Styles)

```tsx
<Box sx={{ display: 'flex', gap: 2, p: 2 }}>
  <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Label</Typography>
</Box>
```

### Theming

```tsx
const theme = createTheme({
  palette: {
    mode: 'dark', // NOT 'type'
    primary: { main: '#1976d2' },
  },
  spacing: 8, // theme.spacing(2) => '16px'
});
```

---

## 3. TanStack Query v5

### Context7 Library ID: `/tanstack/query/v5_84_1`

### queryOptions Pattern (Recommended)

```ts
import { queryOptions } from '@tanstack/react-query';

function templateOptions(id: string) {
  return queryOptions({
    queryKey: ['templates', id],
    queryFn: () => fetchTemplate(id),
    staleTime: 5 * 1000,
  });
}

// Reusable across hooks and client methods:
useQuery(templateOptions(id));
useSuspenseQuery(templateOptions(id));
queryClient.prefetchQuery(templateOptions(id));
queryClient.setQueryData(templateOptions(id).queryKey, newData);
```

### useMutation with Optimistic Updates

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTemplate,
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['templates', updated.id] });
      const previous = queryClient.getQueryData(['templates', updated.id]);
      queryClient.setQueryData(['templates', updated.id], updated);
      return { previous };
    },
    onError: (_err, updated, context) => {
      queryClient.setQueryData(['templates', updated.id], context?.previous);
    },
    onSettled: (_data, _err, updated) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', updated.id] });
    },
  });
}
```

### Query Invalidation

```tsx
// Invalidate all templates
queryClient.invalidateQueries({ queryKey: ['templates'] });
// Invalidate specific template
queryClient.invalidateQueries({ queryKey: ['templates', id] });
```

### Key v5 Changes from v4

- `useQuery` takes a single object argument (no positional args)
- `cacheTime` renamed to `gcTime`
- `isLoading` split into `isLoading` (first load) and `isFetching` (any fetch)
- `onSuccess`/`onError`/`onSettled` removed from `useQuery` (still on `useMutation`)
- Query key must be an array (no string keys)
- `queryOptions()` helper for type-safe reusable options

---

## 4. React Router v7

### Data Mode Setup (Used in This Project)

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    loader: rootLoader,
    children: [
      { index: true, Component: Dashboard, loader: dashboardLoader },
      { path: 'templates/:id', Component: TemplateEditor, loader: templateLoader },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### Loader Pattern

```tsx
// Loader fetches data before component renders
async function templateLoader({ params }: { params: { id: string } }) {
  return { template: await getTemplate(params.id) };
}

// Component accesses data via useLoaderData
import { useLoaderData } from 'react-router';
function TemplateEditor() {
  const { template } = useLoaderData();
}
```

### Navigation Hooks

```tsx
import { useNavigate, useParams, useSearchParams } from 'react-router';

const navigate = useNavigate();
navigate('/templates'); // push
navigate('/templates', { replace: true }); // replace

const { id } = useParams(); // route params
const [searchParams, setSearchParams] = useSearchParams();
```

### Key v7 Changes from v6

- Package is now just `react-router` (not `react-router-dom`)
- `Component` prop on routes (in addition to `element`)
- Enhanced type safety for loaders/actions
- Framework mode available (optional)

---

## 5. Vitest

### Core Testing Patterns

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should fetch data', async () => {
    const spy = vi.spyOn(api, 'getData').mockResolvedValue({ id: '1' });
    const result = await myService.load();
    expect(spy).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: '1' });
  });
});
```

### Mock Functions

```ts
const mockFn = vi.fn(); // create mock
const mockFn = vi.fn(() => 42); // with implementation
mockFn.mockReturnValue(42); // set return
mockFn.mockResolvedValue({ data: [] }); // async return
mockFn.mockImplementation((x) => x * 2); // custom impl
```

### Spying

```ts
const spy = vi.spyOn(object, 'method');
spy.mockImplementation(() => 'mocked');
expect(spy).toHaveBeenCalledWith('arg1');
spy.mockRestore(); // restore original
```

### Timer Mocking

```ts
vi.useFakeTimers();
vi.advanceTimersByTime(1000); // advance by ms
await vi.runOnlyPendingTimersAsync(); // run pending async timers
vi.useRealTimers(); // restore
```

### Project Config

- 95% per-file coverage thresholds (lines, functions, branches, statements)
- `perFile: true` — every file must independently meet thresholds
- `passWithNoTests: true` in vitest.config.ts

---

## 6. React Testing Library

### Query Priority (Accessibility-First)

1. `getByRole` — ALWAYS prefer this (mirrors assistive technology)
2. `getByLabelText` — for form fields
3. `getByPlaceholderText` — fallback for unlabeled inputs
4. `getByText` — for non-interactive elements
5. `getByTestId` — LAST RESORT only

### Render and Query

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits form', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  await user.type(screen.getByRole('textbox', { name: /title/i }), 'New Title');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByRole('alert')).toHaveTextContent('Success');
});
```

### Async Queries

```tsx
// findBy* — waits for element to appear (returns promise)
const element = await screen.findByRole('heading', { name: /welcome/i });

// waitFor — waits for assertion to pass
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### renderHook (Testing Custom Hooks)

```tsx
import { renderHook } from '@testing-library/react';

test('returns user', () => {
  const { result } = renderHook(() => useLoggedInUser());
  expect(result.current).toEqual({ name: 'Alice' });
});
```

### Anti-Patterns to AVOID

- Do NOT use `fireEvent` — use `userEvent` instead (simulates real user interaction)
- Do NOT use `getByTestId` when a semantic query exists
- Do NOT use `container.querySelector` — use screen queries
- Do NOT wrap in `act()` manually when using userEvent/findBy (they handle it)

---

## 7. MSW v2 (Mock Service Worker)

### Handler Setup

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/templates', () => {
    return HttpResponse.json([{ id: '1', title: 'Template 1' }]);
  }),

  http.post('/api/templates', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),

  http.delete('/api/templates/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Test Server Setup

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Test Setup (Vitest)

```ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Per-Test Handler Override

```ts
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

test('handles error', async () => {
  server.use(
    http.get('/api/templates', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }),
  );
  // ... test error handling
});
```

### Key v2 Changes from v1

- `rest.get()` -> `http.get()`
- `res(ctx.json())` -> `HttpResponse.json()`
- `req.body` -> `await request.json()`
- `req.params` -> destructure `{ params }` from handler arg
- `setupServer` import from `msw/node` (not `msw`)

---

## 8. Milkdown (Markdown Editor)

### Crepe Editor (High-Level API — Used in This Project)

```tsx
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';

const CrepeEditor: React.FC = () => {
  const { get } = useEditor((root) => {
    return new Crepe({ root, defaultValue: '# Hello' });
  });
  return <Milkdown />;
};

export const EditorWrapper: React.FC = () => (
  <MilkdownProvider>
    <CrepeEditor />
  </MilkdownProvider>
);
```

### Event Listeners

```ts
crepe.on((listener) => {
  listener.markdownUpdated((ctx, markdown) => {
    console.log('Content:', markdown);
  });
  listener.focus(() => console.log('Focused'));
  listener.blur(() => console.log('Blurred'));
});
```

### Get/Set Content

```ts
const markdown = crepe.getMarkdown();
crepe.setReadonly(true);
```

### Kit API (Lower-Level — For Custom Plugins)

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';

const { get } = useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
        saveToBackend(markdown);
      });
    })
    .use(commonmark)
    .use(listener),
);
```

---

## 9. Yjs (Real-Time Collaboration)

### Core Concepts

```ts
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const ytext = ydoc.getText('content'); // shared text type
const ymap = ydoc.getMap('metadata'); // shared map type
const yarray = ydoc.getArray('items'); // shared array type
```

### WebSocket + IndexedDB Provider Pattern (Used in This Project)

```ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

const ydoc = new Y.Doc();

// Offline persistence (loads cached data instantly)
const persistence = new IndexeddbPersistence('template-123', ydoc);
persistence.whenSynced.then(() => console.log('Loaded from IndexedDB'));

// Real-time sync via WebSocket
const wsProvider = new WebsocketProvider('wss://server.com', 'room-123', ydoc);
wsProvider.on('status', ({ status }) => {
  console.log('Connection:', status); // 'connected' | 'disconnected'
});
```

### Awareness (Presence/Cursors)

```ts
const awareness = wsProvider.awareness;

// Set local user state
awareness.setLocalState({
  user: { name: 'Alice', color: '#ff0000' },
  cursor: { index: 10 },
});

// Listen for changes
awareness.on('change', ({ added, updated, removed }) => {
  const states = awareness.getStates();
  states.forEach((state, clientId) => {
    console.log(`Client ${clientId}:`, state);
  });
});
```

### y-prosemirror Integration (Milkdown uses ProseMirror)

- `ySyncPlugin(ytext)` — syncs ProseMirror doc with Y.Text
- `yCursorPlugin(awareness)` — renders remote cursors
- `yUndoPlugin()` — collaborative undo/redo

---

## Project-Specific Conventions

### File Structure

```
packages/web/src/
  components/     # React components (PascalCase.tsx)
  hooks/          # Custom hooks (use*.ts)
  services/       # API service functions
  types/          # TypeScript type definitions
  mocks/          # MSW handlers
packages/web/tests/
  components/     # Component tests (*.test.tsx)
  hooks/          # Hook tests (*.test.ts)
```

### TypeScript Strictness

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- All props interfaces must be explicit — no `any` types
- Optional properties use `prop?: T | undefined` (exact optional)

### Context7 Library IDs (For Quick Lookup)

| Library           | Context7 ID                 |
| ----------------- | --------------------------- |
| MUI v7            | `/mui/material-ui/v7_3_2`   |
| TanStack Query v5 | `/tanstack/query/v5_84_1`   |
| React Router v7   | `/websites/reactrouter`     |
| React 19          | `/facebook/react/v19_2_0`   |
| Vitest            | `/websites/vitest_dev`      |
| Testing Library   | `/websites/testing-library` |
| MSW v2            | `/websites/mswjs_io`        |
| Milkdown          | `/websites/milkdown_dev`    |
| Yjs               | `/yjs/yjs`                  |
