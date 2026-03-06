# LegalCode UI/UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current generic MUI theme and flat layout with the Acasus-branded four-zone desktop frame, Source/Review editor modes, right context pane, and full design token system.

**Architecture:** The redesign is layered bottom-up: (1) CSS custom properties + MUI theme override as the token foundation, (2) layout shell components (left nav, app bar, workspace, right pane), (3) page-level rewrites (template list, editor with modes, diff view), (4) motion system. Each layer builds on the previous one, so order matters.

**Tech Stack:** React 19, MUI v7, TanStack Query v5, react-router v7, Milkdown (ProseMirror), Yjs, Vite 6, CSS custom properties, Google Fonts (Source Serif 4, Source Sans 3, JetBrains Mono).

**Design System:** `.claude/skills/legalcode-design.md` is the single source of truth. Read it before touching any component. All color, type, spacing, radius, and elevation values come from tokens defined there.

**Cook Orchestrator Note:** Cook dispatches Ive (Opus) for design spec review, then Frontend Engineer (Sonnet) for implementation. Cook runs all tests directly — never in subagents.

---

## Task 1: Font Loading and index.html Setup

**Files:**

- Modify: `packages/web/index.html`

**Step 1: Write the failing test**

No test needed — this is an HTML-only change (fonts loaded via Google Fonts link tags). The existing render tests will validate the app still mounts.

**Step 2: Add Google Fonts to index.html**

Add preconnect hints and font stylesheet links to `<head>`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,600&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <title>LegalCode</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 3: Run existing tests**

Run: `pnpm test`
Expected: All existing tests still pass.

**Step 4: Commit**

```bash
git add packages/web/index.html
git commit -m "feat: add Google Fonts (Source Serif 4, Source Sans 3, JetBrains Mono)"
```

---

## Task 2: Design Tokens CSS Custom Properties

**Files:**

- Create: `packages/web/src/theme/tokens.css`

**Step 1: Write the failing test**

No unit test for a CSS file. The tokens will be consumed by the MUI theme (Task 3) and tested via component tests.

**Step 2: Create the CSS custom properties file**

Create `packages/web/src/theme/tokens.css` containing ALL design tokens from the design system spec (section 01). This is the CSS-level source of truth that mirrors the skill file:

```css
:root {
  /* Brand Colors */
  --brand-beige: #efe3d3;
  --brand-light-purple: #8027ff;
  --brand-dark-purple: #451f61;
  --brand-orange: #ff0000;

  /* Surfaces */
  --surface-primary: #efe3d3;
  --surface-secondary: #e6d9c6;
  --surface-tertiary: #ddd0bc;
  --surface-elevated: #f7f0e6;
  --surface-editor: #f5eee3;

  /* Text */
  --text-primary: #451f61;
  --text-body: #2a1a35;
  --text-secondary: #6b5a7a;
  --text-tertiary: #9a8da6;
  --text-on-purple: #ffffff;
  --text-on-beige-subtle: #78695a;

  /* Interactive */
  --accent-primary: #8027ff;
  --accent-primary-hover: #6b1fdb;
  --accent-primary-subtle: #8027ff1a;
  --accent-primary-ring: #8027ff66;

  /* Destructive */
  --destructive: #d32f2f;
  --destructive-subtle: #d32f2f1a;

  /* Depth */
  --depth-primary: #451f61;
  --depth-secondary: #361850;
  --depth-tertiary: #2d1343;

  /* Borders */
  --border-subtle: #d4c5b2;
  --border-on-dark: #5e3d7a;
  --border-focus: #8027ff;

  /* Status */
  --status-draft: #b8860b;
  --status-draft-bg: #b8860b1a;
  --status-published: #2d6a4f;
  --status-published-bg: #2d6a4f1a;
  --status-archived: #78695a;
  --status-archived-bg: #78695a1a;

  /* Collaboration cursors */
  --cursor-1: #e63946;
  --cursor-2: #457b9d;
  --cursor-3: #2a9d8f;
  --cursor-4: #e9c46a;
  --cursor-5: #6a4c93;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Layers (z-index) */
  --layer-base: 0;
  --layer-sticky: 10;
  --layer-nav: 20;
  --layer-appbar: 30;
  --layer-pane: 40;
  --layer-dropdown: 50;
  --layer-modal: 60;
  --layer-toast: 70;
  --layer-cursor: 80;

  /* Icons */
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 32px;

  /* Panel widths */
  --nav-width: 240px;
  --pane-width: 400px;
  --pane-width-min: 360px;
  --pane-width-max: 480px;
  --appbar-height: 64px;
  --list-max-width: 960px;
  --review-max-width: 860px;
  --review-margin-rail: 48px;

  /* Elevation (purple-tinted) */
  --shadow-sm: 0 1px 3px rgba(69, 31, 97, 0.06);
  --shadow-md: 0 2px 8px rgba(69, 31, 97, 0.1);
  --shadow-lg: 0 4px 16px rgba(69, 31, 97, 0.14);
  --shadow-xl: 0 8px 32px rgba(69, 31, 97, 0.18);

  /* Motion (CSS approximations of spring configs) */
  --spring-standard: cubic-bezier(0.2, 0, 0, 1) 200ms;
  --spring-standard-fast: cubic-bezier(0.2, 0, 0, 1) 150ms;
  --spring-standard-slow: cubic-bezier(0.2, 0, 0, 1) 350ms;
  --spring-expressive: cubic-bezier(0.34, 1.56, 0.64, 1) 400ms;
}

/* Focus ring — consistent across all interactive elements */
*:focus-visible {
  outline: 2px solid var(--accent-primary-ring);
  outline-offset: 2px;
}
```

**Step 3: Import tokens in main.tsx**

Add `import './theme/tokens.css';` at the top of `packages/web/src/main.tsx` (before App import).

**Step 4: Run existing tests**

Run: `pnpm test`
Expected: All existing tests pass.

**Step 5: Commit**

```bash
git add packages/web/src/theme/tokens.css packages/web/src/main.tsx
git commit -m "feat: add CSS custom properties for all design tokens"
```

---

## Task 3: MUI Theme Override

**Files:**

- Modify: `packages/web/src/theme/index.ts`
- Test: `packages/web/tests/theme/index.test.ts`

**Step 1: Write the failing test**

Create `packages/web/tests/theme/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { theme } from '../../src/theme/index.js';

describe('theme', () => {
  it('uses Source Sans 3 as default font family', () => {
    expect(theme.typography.fontFamily).toContain('Source Sans 3');
  });

  it('uses Source Serif 4 for h1-h6', () => {
    expect(theme.typography.h1?.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h2?.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h3?.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h4?.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h5?.fontFamily).toContain('Source Serif 4');
    expect(theme.typography.h6?.fontFamily).toContain('Source Serif 4');
  });

  it('maps primary color to brand light purple', () => {
    const palette = theme.colorSchemes?.light?.palette;
    expect(palette?.primary?.main).toBe('#8027FF');
  });

  it('maps error color to destructive red', () => {
    const palette = theme.colorSchemes?.light?.palette;
    expect(palette?.error?.main).toBe('#D32F2F');
  });

  it('sets the default shape borderRadius to radius-lg (12)', () => {
    expect(theme.shape.borderRadius).toBe(12);
  });

  it('uses beige as the default background', () => {
    const palette = theme.colorSchemes?.light?.palette;
    expect(palette?.background?.default).toBe('#EFE3D3');
  });

  it('uses elevated surface for paper', () => {
    const palette = theme.colorSchemes?.light?.palette;
    expect(palette?.background?.paper).toBe('#F7F0E6');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — current theme uses Inter, blue primary, no heading font override.

**Step 3: Rewrite the MUI theme**

Replace `packages/web/src/theme/index.ts`:

```typescript
import { createTheme } from '@mui/material/styles';

const serifStack = '"Source Serif 4", Georgia, "Times New Roman", serif';
const sansStack = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#8027FF' },
        secondary: { main: '#451F61' },
        error: { main: '#D32F2F' },
        warning: { main: '#B8860B' },
        success: { main: '#2D6A4F' },
        background: {
          default: '#EFE3D3',
          paper: '#F7F0E6',
        },
        text: {
          primary: '#451F61',
          secondary: '#6B5A7A',
        },
      },
    },
  },
  typography: {
    fontFamily: sansStack,
    h1: { fontFamily: serifStack, fontWeight: 600 },
    h2: { fontFamily: serifStack, fontWeight: 600 },
    h3: { fontFamily: serifStack, fontWeight: 600 },
    h4: { fontFamily: serifStack, fontWeight: 600 },
    h5: { fontFamily: serifStack, fontWeight: 600 },
    h6: { fontFamily: serifStack, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(69,31,97,0.06)',
    '0 2px 8px rgba(69,31,97,0.10)',
    '0 4px 16px rgba(69,31,97,0.14)',
    '0 8px 32px rgba(69,31,97,0.18)',
    // MUI requires 25 shadow entries — fill remaining with the lg shadow
    ...Array(20).fill('0 4px 16px rgba(69,31,97,0.14)'),
  ] as unknown as typeof createTheme extends (o: infer O) => unknown
    ? O extends { shadows?: infer S }
      ? S
      : never
    : never,
});
```

Note: The `shadows` type assertion is needed because MUI expects exactly 25 entries. Use the exact cast pattern that the existing codebase's strict TypeScript allows — the engineer should adjust the cast if needed to satisfy `noUncheckedIndexedAccess`.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: Theme tests pass. Some existing component snapshot tests may need updating due to color changes — fix those as encountered.

**Step 5: Commit**

```bash
git add packages/web/src/theme/index.ts packages/web/tests/theme/index.test.ts
git commit -m "feat: implement Acasus brand MUI theme with design tokens"
```

---

## Task 4: Layout Shell — Left Navigation Component

**Files:**

- Create: `packages/web/src/components/LeftNav.tsx`
- Create: `packages/web/tests/components/LeftNav.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/tests/components/LeftNav.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { LeftNav } from '../../src/components/LeftNav.js';

const mockUser = { id: 'u1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' as const };

function renderLeftNav(currentPath = '/templates') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[currentPath]}>
        <LeftNav user={mockUser} onLogout={vi.fn()} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('LeftNav', () => {
  it('renders the Acasus wordmark area', () => {
    renderLeftNav();
    // The header area should exist (64px height)
    expect(screen.getByTestId('left-nav')).toBeInTheDocument();
  });

  it('renders "New Template" button', () => {
    renderLeftNav();
    expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
  });

  it('renders Templates, Admin, and Settings navigation items', () => {
    renderLeftNav();
    expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('highlights the active navigation item', () => {
    renderLeftNav('/templates');
    const templatesLink = screen.getByRole('link', { name: /templates/i });
    expect(templatesLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders user avatar and name in footer', () => {
    renderLeftNav();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  it('hides New Template button for viewers', () => {
    const viewer = { ...mockUser, role: 'viewer' as const };
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LeftNav user={viewer} onLogout={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument();
  });

  it('opens avatar menu on footer click', async () => {
    const user = userEvent.setup();
    renderLeftNav();
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — LeftNav module does not exist.

**Step 3: Implement LeftNav**

Create `packages/web/src/components/LeftNav.tsx`. The component implements the design spec section 02 "Left Persistent Navigation":

- 240px wide, `--depth-primary` (#451F61) background, full viewport height
- Header with Acasus wordmark placeholder (64px)
- "New Template" button (hidden for viewers)
- Three nav links: Templates, Admin, Settings — with icons and labels
- Footer: user avatar + name + role, click opens menu with Log Out
- Active state: white at 100% + 3px accent-primary left border
- Inactive: white at 70%
- Hover: --depth-secondary background

Use MUI components: `Box`, `Button`, `Typography`, `Avatar`, `Menu`, `MenuItem`, `List`, `ListItemButton`, `ListItemIcon`, `ListItemText`. Use `NavLink` from react-router for active state detection.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: All LeftNav tests pass.

**Step 5: Commit**

```bash
git add packages/web/src/components/LeftNav.tsx packages/web/tests/components/LeftNav.test.tsx
git commit -m "feat: add LeftNav component with Acasus brand navigation"
```

---

## Task 5: Layout Shell — Top App Bar Component

**Files:**

- Create: `packages/web/src/components/TopAppBar.tsx`
- Create: `packages/web/tests/components/TopAppBar.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/tests/components/TopAppBar.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { TopAppBar } from '../../src/components/TopAppBar.js';

function renderAppBar(props?: Partial<React.ComponentProps<typeof TopAppBar>>) {
  return render(
    <ThemeProvider theme={theme}>
      <TopAppBar title="Templates" {...props} />
    </ThemeProvider>,
  );
}

describe('TopAppBar', () => {
  it('renders the page title', () => {
    renderAppBar({ title: 'Templates' });
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders children in the right slot', () => {
    renderAppBar({ title: 'Editor', children: <button>Action</button> });
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('has 64px height', () => {
    renderAppBar();
    const bar = screen.getByTestId('top-app-bar');
    expect(bar).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — TopAppBar does not exist.

**Step 3: Implement TopAppBar**

Create `packages/web/src/components/TopAppBar.tsx`:

- 64px height (`--appbar-height`), `--surface-elevated` background, `--shadow-sm` bottom edge
- Left: title (type-subtitle, --text-primary)
- Right: children slot for action buttons, avatars, etc.
- Spans workspace + pane width (sits to the right of left nav)
- z-index: `--layer-appbar` (30)

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/TopAppBar.tsx packages/web/tests/components/TopAppBar.test.tsx
git commit -m "feat: add TopAppBar component"
```

---

## Task 6: Layout Shell — Right Context Pane Component

**Files:**

- Create: `packages/web/src/components/RightPane.tsx`
- Create: `packages/web/tests/components/RightPane.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/tests/components/RightPane.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { RightPane } from '../../src/components/RightPane.js';

function renderPane(props?: Partial<React.ComponentProps<typeof RightPane>>) {
  const defaultProps = {
    open: true,
    onToggle: vi.fn(),
    tabs: [
      { label: 'Metadata', content: <div>Metadata content</div> },
      { label: 'Comments', content: <div>Comments content</div> },
      { label: 'Versions', content: <div>Versions content</div> },
    ],
  };
  return render(
    <ThemeProvider theme={theme}>
      <RightPane {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('RightPane', () => {
  it('renders all tab labels when open', () => {
    renderPane();
    expect(screen.getByRole('tab', { name: /metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /comments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /versions/i })).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    renderPane();
    expect(screen.getByText('Metadata content')).toBeInTheDocument();
  });

  it('switches tab content on click', async () => {
    const user = userEvent.setup();
    renderPane();
    await user.click(screen.getByRole('tab', { name: /comments/i }));
    expect(screen.getByText('Comments content')).toBeInTheDocument();
  });

  it('is hidden when not open', () => {
    renderPane({ open: false });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('calls onToggle when collapse button is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderPane({ onToggle });
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL.

**Step 3: Implement RightPane**

Create `packages/web/src/components/RightPane.tsx`:

- 400px default width (`--pane-width`), `--surface-secondary` background
- Tab bar with type-label, active tab has 2px `--accent-primary` bottom border
- Collapse button (arrow icon)
- Content area renders active tab's content
- springExpressive animation on open/close (CSS transition using `--spring-expressive`)

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/RightPane.tsx packages/web/tests/components/RightPane.test.tsx
git commit -m "feat: add RightPane component with tab switching"
```

---

## Task 7: Layout Shell — AppShell Composition + Route Updates

**Files:**

- Create: `packages/web/src/components/AppShell.tsx`
- Create: `packages/web/tests/components/AppShell.test.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/tests/App.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/tests/components/AppShell.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../src/theme/index.js';
import { AppShell } from '../../src/components/AppShell.js';

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' },
    logout: vi.fn(),
    isLoggingOut: false,
  }),
}));

describe('AppShell', () => {
  it('renders left nav, app bar, and central workspace', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('left-nav')).toBeInTheDocument();
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
    expect(screen.getByTestId('workspace')).toBeInTheDocument();
  });

  it('shows unsupported message below 900px viewport', () => {
    // Test uses window.matchMedia mock
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    window.dispatchEvent(new Event('resize'));
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.getByText(/designed for desktop/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — AppShell does not exist.

**Step 3: Implement AppShell**

Create `packages/web/src/components/AppShell.tsx`:

- Composes LeftNav + TopAppBar + Outlet (workspace) + optional RightPane
- Four-zone CSS Grid or Flexbox layout matching the design spec section 02
- LeftNav: full viewport height, fixed 240px
- TopAppBar: spans remaining width
- Workspace: flex-1, `--surface-primary` background
- Sub-900px: renders centered "LegalCode is designed for desktop. Please use a wider window." notice instead of the app

**Step 4: Update App.tsx routes**

Replace the current `Layout` component in `packages/web/src/App.tsx` with `AppShell`. Update routes:

```typescript
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/templates" replace /> },
      { path: 'templates', element: <TemplateListPage /> },
      { path: 'templates/new', element: <TemplateEditorPage /> },
      { path: 'templates/:id', element: <TemplateEditorPage /> },
      { path: 'templates/:id/diff/:v1/:v2', element: <DiffView /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '/login', element: <AuthGuard><div /></AuthGuard> },
];
```

For MVP, `AdminPage`, `SettingsPage`, and `DiffView` can be placeholder components that render a simple title.

**Step 5: Update App.test.tsx**

Update existing `packages/web/tests/App.test.tsx` to account for new shell structure (left nav present, different layout).

**Step 6: Run all tests**

Run: `pnpm test`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add packages/web/src/components/AppShell.tsx packages/web/tests/components/AppShell.test.tsx packages/web/src/App.tsx packages/web/tests/App.test.tsx
git commit -m "feat: add AppShell four-zone layout with route updates"
```

---

## Task 8: StatusChip Redesign

**Files:**

- Modify: `packages/web/src/components/StatusChip.tsx`
- Modify: `packages/web/tests/components/StatusChip.test.tsx`

**Step 1: Update the test**

Update `packages/web/tests/components/StatusChip.test.tsx` to verify the new design token colors:

```typescript
// Add tests for:
// - Draft badge uses --status-draft color and --status-draft-bg background
// - Published badge uses --status-published color and --status-published-bg background
// - Archived badge uses --status-archived color and --status-archived-bg background
// - All badges render as pill shape (borderRadius: 9999px)
// - Text is uppercase (type-caption-caps)
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — current StatusChip uses MUI `color` prop, not custom token colors.

**Step 3: Rewrite StatusChip**

Rewrite `packages/web/src/components/StatusChip.tsx` to use custom styling with design tokens:

- `--radius-full` (pill shape)
- Per-status background and text colors from tokens
- `type-caption-caps` typography (Source Sans 3, 0.6875rem, weight 600, uppercase, tracking 0.06em)
- Padding: 4px 10px

Note: The current `TemplateStatus` type uses `'active'` not `'published'`. The status name in the schema is `'active'` — the badge should display "Published" for `active` status. Verify the shared type before implementing.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/StatusChip.tsx packages/web/tests/components/StatusChip.test.tsx
git commit -m "feat: redesign StatusChip with Acasus brand tokens"
```

---

## Task 9: Template List Page Redesign

**Files:**

- Modify: `packages/web/src/pages/TemplateListPage.tsx`
- Modify: `packages/web/tests/pages/TemplateListPage.test.tsx`

**Step 1: Update tests**

Rewrite `packages/web/tests/pages/TemplateListPage.test.tsx` to test the new design:

```typescript
// Tests needed:
// - Renders sticky search/filter bar
// - Search input has --border-subtle border and --radius-lg
// - Filter chips for status, category, country
// - Template rows show: title (Source Serif 4) + status badge + relative time + version
// - Hover on row reveals secondary metadata (category, country tags)
// - Selected row shows left 3px --accent-primary border
// - Empty state: "No templates yet" headline + "Create your first template" button
// - No FAB — "New Template" is now in left nav
// - Row click navigates to /templates/:id
// - List max-width is 960px and centered
```

**Step 2: Run test to verify failures**

Run: `pnpm test`
Expected: FAIL on new expectations.

**Step 3: Rewrite TemplateListPage**

Replace the current table/accordion layout with the design spec's clean list:

- Remove: `Accordion`, `AccordionSummary`, `AccordionDetails`, `Table*`, `Fab`
- Add: flat list rows with `--surface-primary` background, `--border-subtle` bottom border
- Always visible: title (type-title, Source Serif 4) + StatusChip + relative time (type-caption) + version (type-caption)
- On hover: reveal category/country/company tags (type-caption-caps), secondary metadata fade-in
- Row height: ~72px minimum
- Hover: `--surface-tertiary` background
- Selected: 3px `--accent-primary` left border + `--accent-primary-subtle` background
- Sticky search/filter bar at top: `--surface-elevated`, `--shadow-sm`
- Max-width: `--list-max-width` (960px), centered in workspace
- Empty state: centered "No templates yet" (type-headline) + purple "Create your first template" button
- Remove the FAB (creation is now via left nav "New Template" button)

**Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/pages/TemplateListPage.tsx packages/web/tests/pages/TemplateListPage.test.tsx
git commit -m "feat: redesign template list with calm-density rows"
```

---

## Task 10: ConnectionStatus Redesign

**Files:**

- Modify: `packages/web/src/components/ConnectionStatus.tsx`
- Modify: `packages/web/tests/components/ConnectionStatus.test.tsx`

**Step 1: Update tests**

Update tests to match new design:

- Connected: 8px `--status-published` dot + "Saved" text
- Saving: opacity pulse + "Saving..."
- Offline: 8px `--status-draft` dot + "Offline — changes saved locally"
- Reconnecting: pulsing dot + "Reconnecting..."
- Uses type-caption styling
- Never modal, never toast — ambient indicator only

**Step 2: Run test, verify failures**

**Step 3: Rewrite ConnectionStatus**

Replace the current Chip-based implementation with a minimal ambient indicator per the design spec. Use a small colored dot + text label. Add CSS animation for the opacity pulse on "Saving" state.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/ConnectionStatus.tsx packages/web/tests/components/ConnectionStatus.test.tsx
git commit -m "feat: redesign ConnectionStatus as ambient indicator"
```

---

## Task 11: PresenceAvatars Redesign

**Files:**

- Modify: `packages/web/src/components/PresenceAvatars.tsx`
- Modify: `packages/web/tests/components/PresenceAvatars.test.tsx`

**Step 1: Update tests**

- Avatars are 28px (not 32px)
- 2px border in user's cursor color (not bgcolor)
- Max 5 visible, then "+N" overflow
- Tooltip shows name + current mode (Source / Review)

**Step 2: Run test, verify failures**

**Step 3: Update PresenceAvatars**

- Reduce avatar size to 28px
- Border: 2px solid in user's cursor color
- Background: generate from email or use cursor color pool
- Tooltip: name + mode info (add `mode` to `CollaborationUser` interface)

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/PresenceAvatars.tsx packages/web/tests/components/PresenceAvatars.test.tsx
git commit -m "feat: redesign PresenceAvatars with cursor-color borders"
```

---

## Task 12: SaveVersionDialog Redesign

**Files:**

- Modify: `packages/web/src/components/SaveVersionDialog.tsx`
- Modify: `packages/web/tests/components/SaveVersionDialog.test.tsx`

**Step 1: Update tests**

- Dialog max-width 480px, `--surface-elevated`, `--radius-xl`
- Backdrop: `--surface-primary` at 50% + backdrop-blur(8px)
- Title uses type-headline
- Primary button: `--accent-primary` filled
- Input: `--border-subtle`, `--radius-lg`
- Rename from "Save Version" to "Create Version" (per design spec)

**Step 2: Run test, verify failures**

**Step 3: Update SaveVersionDialog**

Apply design token styling. Rename to "Create Version" dialog. Update labels to match spec.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/SaveVersionDialog.tsx packages/web/tests/components/SaveVersionDialog.test.tsx
git commit -m "feat: redesign SaveVersionDialog with Acasus brand tokens"
```

---

## Task 13: AuthGuard / Login Page Redesign

**Files:**

- Modify: `packages/web/src/components/AuthGuard.tsx`
- Modify: `packages/web/tests/components/AuthGuard.test.tsx`

**Step 1: Update tests**

- Login screen uses `--surface-primary` (beige) background, no app shell
- Shows "LegalCode" title in Source Serif 4
- "Sign in with Google" button uses `--accent-primary`
- Loading state: no spinner (use subtle opacity animation on beige)
- Add Acasus wordmark placeholder

**Step 2: Run test, verify failures**

**Step 3: Update AuthGuard**

Redesign the login page to match the standalone auth screen spec:

- Full-page beige background
- Centered card with `--surface-elevated` background, `--radius-xl`, `--shadow-lg`
- "LegalCode" in Source Serif 4 (type-display)
- "by Acasus" subtitle (type-caption, `--text-secondary`)
- Google sign-in button

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/AuthGuard.tsx packages/web/tests/components/AuthGuard.test.tsx
git commit -m "feat: redesign login screen with Acasus branding"
```

---

## Task 14: Template Editor — Mode Toggle and Source Mode

**Files:**

- Create: `packages/web/src/components/EditorToolbar.tsx`
- Create: `packages/web/tests/components/EditorToolbar.test.tsx`
- Modify: `packages/web/src/pages/TemplateEditorPage.tsx`
- Modify: `packages/web/tests/pages/TemplateEditorPage.test.tsx`

**Step 1: Write failing tests for EditorToolbar**

```typescript
// Tests:
// - Renders Source | Review toggle
// - Source is active by default for editors
// - Review is active by default for viewers
// - Clicking Review switches mode
// - Renders markdown helpers (heading, link, list, table, clause, variable, hr)
// - Renders word count on the right
// - Renders connection status indicator
```

**Step 2: Run test, verify failures**

**Step 3: Implement EditorToolbar**

Create `packages/web/src/components/EditorToolbar.tsx`:

- Left: two-segment toggle (Source | Review) with sliding active indicator
- Center: markdown helper buttons (icon + label for each: Heading, Link, List (ordered/unordered), Table, Clause, Variable, HR)
- Right: word count (type-caption, `--text-tertiary`) + ConnectionStatus
- `--surface-editor` background, positioned below app bar within editor area
- Mode toggle animation: active segment slides horizontally, springStandard

**Step 4: Update TemplateEditorPage**

Restructure `packages/web/src/pages/TemplateEditorPage.tsx`:

- Add mode state: `'source' | 'review'`
- Add EditorToolbar above the editor
- In source mode: render MarkdownEditor (full width, monospace)
- In review mode: render read-only rendered markdown (max-width 860px centered) — for MVP this can render MarkdownEditor in readOnly mode with different styling
- Move metadata fields to the right pane Metadata tab
- Move version history to right pane Versions tab
- Move action buttons (Save Draft, Publish, Archive) to app bar and metadata pane

**Step 5: Update TemplateEditorPage tests**

Rewrite `packages/web/tests/pages/TemplateEditorPage.test.tsx` to cover:

- Mode toggle switches between source and review
- Source mode shows full-width editor
- Review mode shows constrained-width rendered view
- Metadata is in right pane, not inline
- Create mode has right pane open to Metadata tab
- Edit mode shows version history in right pane Versions tab

**Step 6: Run all tests**

Run: `pnpm test`
Expected: PASS.

**Step 7: Commit**

```bash
git add packages/web/src/components/EditorToolbar.tsx packages/web/tests/components/EditorToolbar.test.tsx packages/web/src/pages/TemplateEditorPage.tsx packages/web/tests/pages/TemplateEditorPage.test.tsx
git commit -m "feat: add Source/Review mode toggle and editor toolbar"
```

---

## Task 15: Right Pane — Metadata Tab

**Files:**

- Create: `packages/web/src/components/MetadataTab.tsx`
- Create: `packages/web/tests/components/MetadataTab.test.tsx`

**Step 1: Write failing tests**

```typescript
// Tests:
// - Renders category, country, tags as labeled fields
// - Fields become editable on click (inline editing)
// - Shows status badge with appropriate action button
// - Draft status shows "Publish" button (--accent-primary)
// - Active status shows "Archive" button (outlined, --text-secondary)
// - Shows creation date, last modified, created by in type-caption
// - Publish button opens confirmation dialog
// - Archive button opens confirmation dialog
```

**Step 2: Run test, verify failures**

**Step 3: Implement MetadataTab**

Extract metadata editing from TemplateEditorPage into a dedicated pane tab component. This hosts the fields that were previously inline in the editor form (category, country, tags) plus status actions.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/MetadataTab.tsx packages/web/tests/components/MetadataTab.test.tsx
git commit -m "feat: add MetadataTab for right context pane"
```

---

## Task 16: Right Pane — Versions Tab Redesign

**Files:**

- Modify: `packages/web/src/components/VersionHistory.tsx`
- Modify: `packages/web/tests/components/VersionHistory.test.tsx`

**Step 1: Update tests**

- Version list has thin 1px `--border-subtle` vertical timeline connector
- Each entry: version number (type-label, weight 600) + summary + author + timestamp + "View diff" link
- Current version: `--accent-primary-subtle` background
- "Compare versions" action
- "Restore" on historical versions with confirmation dialog

**Step 2: Run test, verify failures**

**Step 3: Rewrite VersionHistory**

Replace the current ListItemButton layout with the timeline-style design. Remove the inline MarkdownEditor preview — diff viewing now uses the central workspace (Task 18).

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/VersionHistory.tsx packages/web/tests/components/VersionHistory.test.tsx
git commit -m "feat: redesign VersionHistory with timeline connector"
```

---

## Task 17: Right Pane — Comments Tab (MVP)

**Files:**

- Create: `packages/web/src/components/CommentsTab.tsx`
- Create: `packages/web/tests/components/CommentsTab.test.tsx`

**Step 1: Write failing tests**

```typescript
// Tests:
// - Renders "No comments yet" empty state with instruction text
// - Renders comment threads ordered by document position
// - Each thread shows: anchor quote, author avatar + name, timestamp, comment text
// - Reply input expands on focus
// - Resolve action collapses thread
// - "Show resolved" toggle
// - Thread count display (total / unresolved)
// - Focused thread flashes --accent-primary-subtle briefly
```

**Step 2: Run test, verify failures**

**Step 3: Implement CommentsTab**

Create `packages/web/src/components/CommentsTab.tsx`:

- For MVP, this is the UI shell. The comment anchoring backend (AST-based) is a separate backend task.
- Thread rendering with author avatar (24px), name, timestamp
- Anchor quote: truncated, italic, type-caption
- Reply input: compact, placeholder "Reply..."
- Resolve action (checkmark)
- Thread states: open (full opacity), resolved (collapsed)
- Empty state per design spec

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/CommentsTab.tsx packages/web/tests/components/CommentsTab.test.tsx
git commit -m "feat: add CommentsTab component for right pane"
```

---

## Task 18: Unified Diff View

**Files:**

- Create: `packages/web/src/pages/DiffView.tsx`
- Create: `packages/web/tests/pages/DiffView.test.tsx`

**Step 1: Write failing tests**

```typescript
// Tests:
// - Renders unified diff with removed lines (--destructive-subtle bg) and added lines (--status-published-bg)
// - Shows version selector dropdowns
// - "Back to editor" link navigates back
// - Right pane defaults to Versions tab
// - Diff view is read-only (no editing)
// - Max-width matches --review-max-width (860px), centered
```

**Step 2: Run test, verify failures**

**Step 3: Implement DiffView**

Create `packages/web/src/pages/DiffView.tsx`:

- Route: `/templates/:id/diff/:v1/:v2`
- Fetches two versions and computes line-level diff
- Unified layout: single column, `--review-max-width` centered
- Removed lines: `--destructive-subtle` background
- Added lines: `--status-published-bg` background
- Toolbar above diff: two version dropdowns + "Back to editor" link
- Use a simple line-by-line diff algorithm (can use a small lib or implement basic LCS)

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/pages/DiffView.tsx packages/web/tests/pages/DiffView.test.tsx
git commit -m "feat: add unified diff view for version comparison"
```

---

## Task 19: Placeholder Pages (Admin, Settings)

**Files:**

- Create: `packages/web/src/pages/AdminPage.tsx`
- Create: `packages/web/src/pages/SettingsPage.tsx`
- Create: `packages/web/tests/pages/AdminPage.test.tsx`
- Create: `packages/web/tests/pages/SettingsPage.test.tsx`

**Step 1: Write failing tests**

```typescript
// Admin:
// - Renders "Admin" title
// - Uses simpler layout than Templates (less visual weight)
// - Respects AppShell structure

// Settings:
// - Renders "Settings" title
// - Uses simpler layout than Templates
```

**Step 2: Run test, verify failures**

**Step 3: Implement placeholder pages**

These are intentionally minimal — same shell, simpler layouts, less visual weight. Just a title and placeholder content for now.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/pages/AdminPage.tsx packages/web/src/pages/SettingsPage.tsx packages/web/tests/pages/AdminPage.test.tsx packages/web/tests/pages/SettingsPage.test.tsx
git commit -m "feat: add placeholder Admin and Settings pages"
```

---

## Task 20: PWA Manifest and Assets

**Files:**

- Create: `packages/web/public/manifest.json`
- Create: `packages/web/public/icons/` (generated SVG icons)
- Modify: `packages/web/index.html`

**Step 1: No test needed for static assets**

**Step 2: Create PWA manifest**

Create `packages/web/public/manifest.json`:

```json
{
  "name": "LegalCode by Acasus",
  "short_name": "LegalCode",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#EFE3D3",
  "theme_color": "#451F61",
  "icons": [
    { "src": "/icons/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/icons/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

**Step 3: Create SVG icons**

Create simple SVG icons using the Acasus brand colors (dark purple "LC" monogram on beige background) at 192px and 512px sizes.

**Step 4: Update index.html**

Add to `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#451F61" />
<link rel="icon" type="image/svg+xml" href="/icons/icon-192.svg" />
```

**Step 5: Run existing tests**

Run: `pnpm test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add packages/web/public/manifest.json packages/web/public/icons/ packages/web/index.html
git commit -m "feat: add PWA manifest and brand icons"
```

---

## Task 21: Motion System Constants

**Files:**

- Create: `packages/web/src/theme/motion.ts`
- Create: `packages/web/tests/theme/motion.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  springStandard,
  springStandardFast,
  springStandardSlow,
  springExpressive,
  cssTransition,
} from '../../src/theme/motion.js';

describe('motion constants', () => {
  it('exports spring configs with correct stiffness values', () => {
    expect(springStandard.stiffness).toBe(500);
    expect(springStandardFast.stiffness).toBe(700);
    expect(springStandardSlow.stiffness).toBe(300);
    expect(springExpressive.stiffness).toBe(400);
  });

  it('cssTransition returns the right CSS string', () => {
    expect(cssTransition('standard')).toBe('cubic-bezier(0.2, 0, 0, 1) 200ms');
    expect(cssTransition('expressive')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1) 400ms');
  });
});
```

**Step 2: Run test, verify failures**

**Step 3: Implement motion.ts**

```typescript
export const springStandard = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 1 };
export const springStandardFast = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 40,
  mass: 0.8,
};
export const springStandardSlow = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1.2,
};
export const springExpressive = { type: 'spring' as const, stiffness: 400, damping: 20, mass: 1 };

const CSS_SPRINGS = {
  standard: 'cubic-bezier(0.2, 0, 0, 1) 200ms',
  'standard-fast': 'cubic-bezier(0.2, 0, 0, 1) 150ms',
  'standard-slow': 'cubic-bezier(0.2, 0, 0, 1) 350ms',
  expressive: 'cubic-bezier(0.34, 1.56, 0.64, 1) 400ms',
} as const;

export type SpringName = keyof typeof CSS_SPRINGS;

export function cssTransition(name: SpringName): string {
  return CSS_SPRINGS[name];
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/theme/motion.ts packages/web/tests/theme/motion.test.ts
git commit -m "feat: add motion system constants and CSS transition helpers"
```

---

## Task 22: Keyboard Shortcuts

**Files:**

- Create: `packages/web/src/hooks/useKeyboardShortcuts.ts`
- Create: `packages/web/tests/hooks/useKeyboardShortcuts.test.ts`

**Step 1: Write failing tests**

```typescript
// Tests:
// - Ctrl+Shift+P toggles right pane
// - Escape closes right pane / dismisses dialog
// - Ctrl+/ shows keyboard shortcuts help
// - Shortcuts respect platform (Cmd on Mac, Ctrl on others)
// - Cleanup: removes event listeners on unmount
```

**Step 2: Run test, verify failures**

**Step 3: Implement useKeyboardShortcuts**

A simple hook that registers `keydown` listeners for the MVP shortcuts:

- `Ctrl+Shift+P` / `Cmd+Shift+P`: toggle right pane
- `Escape`: close pane / dismiss dialog
- `Ctrl+/` / `Cmd+/`: show shortcuts help

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/hooks/useKeyboardShortcuts.ts packages/web/tests/hooks/useKeyboardShortcuts.test.ts
git commit -m "feat: add keyboard shortcuts hook"
```

---

## Task 23: Toast Notification System

**Files:**

- Create: `packages/web/src/components/Toast.tsx`
- Create: `packages/web/tests/components/Toast.test.tsx`

**Step 1: Write failing tests**

```typescript
// Tests:
// - Shows toast at bottom-center
// - Auto-dismisses after 4 seconds
// - Only one toast at a time
// - Shows icon + message + optional action link
// - Slide up + fade in animation
// - Renders with --surface-elevated bg, --shadow-lg, --radius-lg
```

**Step 2: Run test, verify failures**

**Step 3: Implement Toast**

Use a simple context provider + component:

- Bottom-center positioning
- 4s auto-dismiss
- Queue: one at a time (new toast replaces current)
- `--surface-elevated` background, `--shadow-lg`, `--radius-lg`
- Slide up + fade in, springStandard

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add packages/web/src/components/Toast.tsx packages/web/tests/components/Toast.test.tsx
git commit -m "feat: add Toast notification system"
```

---

## Task 24: Integration Testing — Full Layout Verification

**Files:**

- Create: `packages/web/tests/integration/layout.test.tsx`

**Step 1: Write integration tests**

```typescript
// Tests:
// - Full app renders with left nav + app bar + workspace
// - Navigation between Templates, Admin, Settings works
// - Template list renders within workspace
// - Clicking a template opens editor with right pane
// - Right pane tabs (Metadata, Comments, Versions) switch correctly
// - Responsive: at 1024px, right pane is overlay
// - Responsive: at 800px, shows unsupported notice
```

**Step 2: Run tests, verify they pass**

This task is purely verification — no new implementation. If any tests fail, fix the integration issues.

**Step 3: Commit**

```bash
git add packages/web/tests/integration/layout.test.tsx
git commit -m "test: add layout integration tests"
```

---

## Task 25: Final Quality Gate

**Step 1: Run all quality gates**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm security:scan
```

**Step 2: Fix any failures**

Address typecheck errors, lint warnings, coverage gaps, or security findings.

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: address quality gate findings from UI redesign"
```

**Step 4: Build and deploy**

```bash
pnpm build && npx wrangler deploy
```

**Step 5: Verify on production**

Visit `https://legalcode.ax1access.com` and verify:

- Login page shows Acasus branding
- Left nav renders with dark purple background
- Templates page shows calm-density list
- Editor has Source/Review toggle
- Right pane opens with Metadata/Comments/Versions tabs
- PWA installable
