# Phase 2: Template CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full template CRUD with versioning, tagging, search/filter, audit logging, and markdown download on Drizzle ORM.

**Architecture:** Drizzle query builder wrapping D1 via `getDb()` helper. Plain service functions (not classes). D1 batch API for atomic multi-table writes. Two-layer Zod validation (route + service). Semgrep + gitleaks for security scanning. Global error handler with internal logging and sanitized responses.

**Tech Stack:** Hono v4, Drizzle ORM (d1 driver), Cloudflare D1/Workers, Zod, Vitest, Semgrep, gitleaks

---

## Context for Implementers

### Project structure

- `packages/api/` — Hono API on Cloudflare Workers
- `packages/web/` — React 19 frontend (not modified in this phase)
- `packages/shared/` — Zod schemas + TypeScript types shared between FE/BE
- Root `wrangler.jsonc` — Cloudflare Worker configuration

### Existing patterns

- **ESLint**: `strict-type-checked` + `stylistic-type-checked`, zero warnings. Run `pnpm lint`.
- **TypeScript**: Strictest — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Run `pnpm typecheck`.
- **Tests**: Vitest, 95% coverage threshold per package. Run `pnpm test`.
- **Commits**: Husky pre-commit runs lint-staged (ESLint + Prettier) then typecheck.

### Key files to understand

- `packages/api/src/db/schema.ts` — Drizzle schema (templates, templateVersions, tags, templateTags, auditLog tables already defined)
- `packages/shared/src/schemas/index.ts` — `createTemplateSchema`, `updateTemplateSchema`, `templateQuerySchema` already defined
- `packages/shared/src/types/index.ts` — `Template`, `TemplateVersion`, `Tag`, `AuditLogEntry` interfaces already defined
- `packages/api/src/services/user.ts` — Current UserService class (will be migrated)
- `packages/api/src/routes/admin.ts` — Current admin routes using UserService (will be updated)
- `packages/api/src/routes/auth.ts` — Current auth routes using UserService (will be updated)
- `packages/api/src/middleware/auth.ts` — authMiddleware + requireRole (reuse for template routes)
- `packages/api/src/types/env.ts` — AppEnv type with Bindings and Variables

### Design document

- `docs/plans/2026-03-05-template-crud-design.md` — Full design with decisions, state machine, data ownership

---

## Task 0: Security Infrastructure

**Files:**

- Create: `.semgreprc.yml`
- Create: `.gitleaks.toml`
- Create: `packages/api/src/middleware/error.ts`
- Create: `packages/api/src/middleware/security.ts`
- Create: `packages/api/tests/middleware/error.test.ts`
- Create: `packages/api/tests/middleware/security.test.ts`
- Modify: `.husky/pre-commit`
- Modify: `packages/api/src/index.ts`
- Modify: `package.json`

### Step 1: Install semgrep and gitleaks

Run:

```bash
brew install semgrep gitleaks
```

Verify both are available:

```bash
semgrep --version
gitleaks version
```

### Step 2: Create semgrep configuration

Create `.semgreprc.yml`:

```yaml
rules:
  - p/owasp-top-ten
  - p/typescript
  - p/security-audit
```

Note: `p/owasp-top-ten` and `p/typescript` will be enforced as errors. `p/security-audit` will be treated as warnings initially.

### Step 3: Create gitleaks configuration

Create `.gitleaks.toml`:

```toml
[allowlist]
paths = [
  '''node_modules''',
  '''\.git''',
  '''dist''',
  '''\.wrangler''',
]
```

### Step 4: Add semgrep and gitleaks to pre-commit hook

Read the current `.husky/pre-commit` file first. Then modify it to add semgrep and gitleaks before the existing lint-staged command:

Add these lines before the existing commands:

```bash
# Security scanning
gitleaks protect --staged --verbose
semgrep scan --config p/owasp-top-ten --config p/typescript --error --quiet packages/
```

### Step 5: Add semgrep scan script to package.json

Add to the root `package.json` scripts:

```json
"security:scan": "semgrep scan --config p/owasp-top-ten --config p/typescript --config p/security-audit packages/",
"security:secrets": "gitleaks detect --verbose"
```

### Step 6: Write failing test for global error handler

Create `packages/api/tests/middleware/error.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/env.js';
import { errorHandler } from '../../src/middleware/error.js';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns 500 with generic message for unexpected errors', async () => {
    const app = createTestApp();
    app.get('/explode', () => {
      throw new Error('database connection string leaked');
    });
    const res = await app.request('/explode');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('database');
    expect(JSON.stringify(body)).not.toContain('leaked');
  });

  it('returns 400 for validation errors with safe details', async () => {
    const app = createTestApp();
    app.get('/validate', () => {
      const err = new Error('Validation failed');
      (err as Error & { status: number }).status = 400;
      (err as Error & { details: unknown }).details = { field: 'title', message: 'required' };
      throw err;
    });
    const res = await app.request('/validate');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Validation failed');
  });

  it('never exposes stack traces', async () => {
    const app = createTestApp();
    app.get('/crash', () => {
      throw new TypeError('Cannot read properties of undefined');
    });
    const res = await app.request('/crash');
    const text = await res.text();
    expect(text).not.toContain('at ');
    expect(text).not.toContain('.ts:');
    expect(text).not.toContain('.js:');
  });
});
```

### Step 7: Run test to verify it fails

Run: `pnpm test packages/api/tests/middleware/error.test.ts`
Expected: FAIL — module `../../src/middleware/error.js` does not exist

### Step 8: Implement global error handler

Create `packages/api/src/middleware/error.ts`:

```typescript
import type { ErrorHandler } from 'hono';
import type { AppEnv } from '../types/env.js';

interface AppError extends Error {
  status?: number;
  details?: unknown;
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const appErr = err as AppError;
  const status = appErr.status ?? 500;

  // Internal logging — full error details as structured JSON
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      message: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    }),
  );

  // External response — sanitized, never expose internals
  if (status >= 500) {
    return c.json({ error: 'Internal server error' }, 500);
  }

  return c.json({ error: appErr.message }, { status });
};
```

### Step 9: Run test to verify it passes

Run: `pnpm test packages/api/tests/middleware/error.test.ts`
Expected: PASS (3 tests)

### Step 10: Write failing test for security middleware

Create `packages/api/tests/middleware/security.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../../src/middleware/security.js';

describe('securityHeaders', () => {
  it('sets Content-Security-Policy header', async () => {
    const app = new Hono();
    app.use('*', securityHeaders);
    app.get('/test', (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
  });

  it('sets X-Content-Type-Options header', async () => {
    const app = new Hono();
    app.use('*', securityHeaders);
    app.get('/test', (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const app = new Hono();
    app.use('*', securityHeaders);
    app.get('/test', (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Referrer-Policy header', async () => {
    const app = new Hono();
    app.use('*', securityHeaders);
    app.get('/test', (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
```

### Step 11: Run test to verify it fails

Run: `pnpm test packages/api/tests/middleware/security.test.ts`
Expected: FAIL — module does not exist

### Step 12: Implement security headers middleware

Create `packages/api/src/middleware/security.ts`:

```typescript
import { createMiddleware } from 'hono/factory';

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});
```

### Step 13: Run test to verify it passes

Run: `pnpm test packages/api/tests/middleware/security.test.ts`
Expected: PASS (4 tests)

### Step 14: Wire error handler and security middleware into app

Modify `packages/api/src/index.ts`. Add imports and wire them in:

Add imports:

```typescript
import { errorHandler } from './middleware/error.js';
import { securityHeaders } from './middleware/security.js';
```

Add after the app declaration (`const app = new Hono<AppEnv>()`):

```typescript
app.onError(errorHandler);
app.use('*', securityHeaders);
```

The security headers middleware should be added before CORS/CSRF middleware so all responses get headers.

### Step 15: Run all tests

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All pass, zero warnings

### Step 16: Commit

```bash
git add .semgreprc.yml .gitleaks.toml .husky/pre-commit package.json \
  packages/api/src/middleware/error.ts packages/api/src/middleware/security.ts \
  packages/api/tests/middleware/error.test.ts packages/api/tests/middleware/security.test.ts \
  packages/api/src/index.ts
git commit -m "feat: add security infrastructure (semgrep, gitleaks, CSP, error handler)"
```

---

## Task 1: Database Helper

**Files:**

- Create: `packages/api/src/db/index.ts`
- Create: `packages/api/tests/db/index.test.ts`

### Step 1: Write failing test

Create `packages/api/tests/db/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDb } from '../../src/db/index.js';

describe('getDb', () => {
  it('returns a drizzle instance wrapping a D1 database', () => {
    // Minimal D1 mock — getDb just wraps it
    const mockD1 = {} as D1Database;
    const db = getDb(mockD1);
    expect(db).toBeDefined();
    // Drizzle instance should have query property with schema tables
    expect(db.query).toBeDefined();
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm test packages/api/tests/db/index.test.ts`
Expected: FAIL — module does not exist

### Step 3: Install drizzle-orm d1 driver (if not already installed)

Run:

```bash
pnpm --filter @legalcode/api add drizzle-orm
```

Note: `drizzle-orm` may already be installed from Phase 0 for schema definitions. Check `packages/api/package.json` first. If already present, skip this step.

### Step 4: Implement getDb helper

Create `packages/api/src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type AppDb = ReturnType<typeof getDb>;
```

### Step 5: Run test to verify it passes

Run: `pnpm test packages/api/tests/db/index.test.ts`
Expected: PASS

### Step 6: Run all tests

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All pass

### Step 7: Commit

```bash
git add packages/api/src/db/index.ts packages/api/tests/db/index.test.ts
git commit -m "feat: add getDb helper for Drizzle D1 instance"
```

---

## Task 2: Migrate UserService to Drizzle Functions

**Files:**

- Modify: `packages/api/src/services/user.ts` (rewrite from class to functions)
- Modify: `packages/api/tests/services/user.test.ts` (update tests for new API)
- Modify: `packages/api/src/routes/admin.ts` (use new function signatures)
- Modify: `packages/api/src/routes/auth.ts` (use new function signatures)
- Modify: `packages/api/tests/routes/admin.test.ts` (update mocks)
- Modify: `packages/api/tests/routes/auth.test.ts` (update mocks)

### Step 1: Read existing files

Read these files to understand current implementation:

- `packages/api/src/services/user.ts`
- `packages/api/tests/services/user.test.ts`
- `packages/api/src/routes/admin.ts`
- `packages/api/src/routes/auth.ts`
- `packages/api/tests/routes/admin.test.ts`
- `packages/api/tests/routes/auth.test.ts`

### Step 2: Rewrite user.test.ts for Drizzle function API

The tests should import plain functions instead of a class, and pass a mock `AppDb` instance. Read the existing test patterns and rewrite all tests to use the new function signatures:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppDb } from '../../src/db/index.js';
import {
  findUserByEmail,
  findUserById,
  listAllUsers,
  createUser,
  updateUserRole,
  deactivateUser,
} from '../../src/services/user.js';
```

Each test should:

- Create a mock `AppDb` with the necessary Drizzle methods mocked
- Call the plain function with `(db, ...args)` signature
- Assert the expected behavior

Key tests to preserve:

- `findUserByEmail` returns user or null
- `findUserById` returns user or null
- `listAllUsers` returns array of users
- `createUser` inserts with UUID and timestamps, returns user
- `updateUserRole` updates role and updatedAt
- `deactivateUser` deletes the user row

### Step 3: Run tests to verify they fail

Run: `pnpm test packages/api/tests/services/user.test.ts`
Expected: FAIL — old class API doesn't match new function imports

### Step 4: Rewrite user.ts as plain Drizzle functions

Replace `packages/api/src/services/user.ts` with:

```typescript
import { eq } from 'drizzle-orm';
import type { AppDb } from '../db/index.js';
import { users } from '../db/schema.js';
import type { Role } from '@legalcode/shared';

interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
}

export async function findUserByEmail(db: AppDb, email: string) {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0] ?? null;
}

export async function findUserById(db: AppDb, id: string) {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] ?? null;
}

export async function listAllUsers(db: AppDb) {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function createUser(db: AppDb, input: CreateUserInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(users).values(row);
  return row;
}

export async function updateUserRole(db: AppDb, id: string, role: Role) {
  const now = new Date().toISOString();
  await db.update(users).set({ role, updatedAt: now }).where(eq(users.id, id));
}

export async function deactivateUser(db: AppDb, id: string) {
  await db.delete(users).where(eq(users.id, id));
}
```

### Step 5: Run user service tests

Run: `pnpm test packages/api/tests/services/user.test.ts`
Expected: PASS

### Step 6: Update admin.ts routes to use new functions

Modify `packages/api/src/routes/admin.ts`:

Replace:

```typescript
import { UserService } from '../services/user.js';
```

With:

```typescript
import { getDb } from '../db/index.js';
import { listAllUsers, createUser, updateUserRole, deactivateUser } from '../services/user.js';
```

Replace all `new UserService(c.env.DB)` patterns with `getDb(c.env.DB)` and direct function calls:

```typescript
// Before: const userService = new UserService(c.env.DB); const users = await userService.listAll();
// After:  const db = getDb(c.env.DB); const users = await listAllUsers(db);
```

### Step 7: Update auth.ts callback route to use new functions

Modify `packages/api/src/routes/auth.ts`:

Replace:

```typescript
import { UserService } from '../services/user.js';
```

With:

```typescript
import { getDb } from '../db/index.js';
import { findUserByEmail } from '../services/user.js';
```

In the callback handler, replace:

```typescript
// Before: const userService = new UserService(c.env.DB); const user = await userService.findByEmail(googleUser.email);
// After:  const db = getDb(c.env.DB); const user = await findUserByEmail(db, googleUser.email);
```

### Step 8: Update route tests

Update `packages/api/tests/routes/admin.test.ts` and `packages/api/tests/routes/auth.test.ts` to mock the new function signatures instead of the UserService class. The mock pattern changes from:

```typescript
// Before: vi.mock('../../src/services/user.js', () => ({ UserService: vi.fn().mockImplementation(() => ({ ... })) }))
// After:  vi.mock('../../src/services/user.js', () => ({ findUserByEmail: vi.fn(), listAllUsers: vi.fn(), ... }))
```

### Step 9: Run all tests

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All 84+ tests pass

### Step 10: Commit

```bash
git add packages/api/src/services/user.ts packages/api/tests/services/user.test.ts \
  packages/api/src/routes/admin.ts packages/api/src/routes/auth.ts \
  packages/api/tests/routes/admin.test.ts packages/api/tests/routes/auth.test.ts \
  packages/api/src/db/index.ts
git commit -m "refactor: migrate UserService from raw SQL class to Drizzle functions"
```

---

## Task 3: Audit Logging Service

**Files:**

- Create: `packages/api/src/services/audit.ts`
- Create: `packages/api/tests/services/audit.test.ts`

### Step 1: Write failing test

Create `packages/api/tests/services/audit.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { AppDb } from '../../src/db/index.js';
import { logAudit } from '../../src/services/audit.js';

// Create a minimal mock for db.insert().values()
function createMockDb() {
  const valuesFn = vi.fn().mockResolvedValue(undefined);
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
  return {
    insert: insertFn,
    _valuesFn: valuesFn,
  } as unknown as AppDb & { _valuesFn: ReturnType<typeof vi.fn> };
}

describe('logAudit', () => {
  it('inserts an audit log entry with correct fields', async () => {
    const mockDb = createMockDb();
    await logAudit(mockDb, {
      userId: 'user-1',
      action: 'create',
      entityType: 'template',
      entityId: 'tmpl-1',
      metadata: { title: 'Welcome Email' },
    });
    expect(mockDb.insert).toHaveBeenCalled();
    const insertedValues = mockDb._valuesFn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedValues).toMatchObject({
      userId: 'user-1',
      action: 'create',
      entityType: 'template',
      entityId: 'tmpl-1',
    });
    expect(insertedValues['id']).toBeDefined();
    expect(insertedValues['createdAt']).toBeDefined();
    expect(typeof insertedValues['metadata']).toBe('string'); // JSON stringified
  });

  it('handles missing metadata', async () => {
    const mockDb = createMockDb();
    await logAudit(mockDb, {
      userId: 'user-1',
      action: 'archive',
      entityType: 'template',
      entityId: 'tmpl-1',
    });
    const insertedValues = mockDb._valuesFn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedValues['metadata']).toBeNull();
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm test packages/api/tests/services/audit.test.ts`
Expected: FAIL — module does not exist

### Step 3: Implement audit service

Create `packages/api/src/services/audit.ts`:

```typescript
import type { AppDb } from '../db/index.js';
import { auditLog } from '../db/schema.js';
import type { AuditAction } from '@legalcode/shared';

interface AuditInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(db: AppDb, input: AuditInput): Promise<void> {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: new Date().toISOString(),
  });
}
```

### Step 4: Run test to verify it passes

Run: `pnpm test packages/api/tests/services/audit.test.ts`
Expected: PASS (2 tests)

### Step 5: Run all tests

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All pass

### Step 6: Commit

```bash
git add packages/api/src/services/audit.ts packages/api/tests/services/audit.test.ts
git commit -m "feat: add audit logging service"
```

---

## Task 4: Template Service — Create

**Files:**

- Create: `packages/api/src/services/template.ts`
- Create: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests for createTemplate

Create `packages/api/tests/services/template.test.ts` with tests for the `createTemplate` function:

Tests to write:

- Creates template with status 'draft' and version 1
- Generates slug from title with random suffix (6 chars)
- Creates initial version row with content
- Creates tag rows if tags provided
- Creates audit log entry
- Uses db.batch() for atomic operation
- Validates input with createTemplateSchema

The mock should capture what `db.batch()` is called with to verify all operations are included.

### Step 2: Run test to verify it fails

Run: `pnpm test packages/api/tests/services/template.test.ts`
Expected: FAIL — module does not exist

### Step 3: Implement createTemplate

Create `packages/api/src/services/template.ts`:

```typescript
import { eq, and, like, sql, inArray } from 'drizzle-orm';
import type { AppDb } from '../db/index.js';
import { templates, templateVersions, tags, templateTags, auditLog } from '../db/schema.js';
import { createTemplateSchema, type CreateTemplateInput } from '@legalcode/shared';
import { logAudit } from './audit.js';

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

export async function createTemplate(db: AppDb, input: CreateTemplateInput, userId: string) {
  const parsed = createTemplateSchema.parse(input);
  const templateId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = generateSlug(parsed.title);

  const templateRow = {
    id: templateId,
    title: parsed.title,
    slug,
    category: parsed.category,
    country: parsed.country ?? null,
    status: 'draft' as const,
    currentVersion: 1,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const versionRow = {
    id: versionId,
    templateId,
    version: 1,
    content: parsed.content,
    changeSummary: 'Initial version',
    createdBy: userId,
    createdAt: now,
  };

  // Resolve or create tags
  const tagIds: string[] = [];
  if (parsed.tags && parsed.tags.length > 0) {
    for (const tagName of parsed.tags) {
      const existing = await db.select().from(tags).where(eq(tags.name, tagName));
      if (existing[0]) {
        tagIds.push(existing[0].id);
      } else {
        const tagId = crypto.randomUUID();
        await db.insert(tags).values({ id: tagId, name: tagName });
        tagIds.push(tagId);
      }
    }
  }

  const auditRow = {
    id: crypto.randomUUID(),
    userId,
    action: 'create' as const,
    entityType: 'template',
    entityId: templateId,
    metadata: JSON.stringify({ title: parsed.title, category: parsed.category }),
    createdAt: now,
  };

  // Atomic batch: template + version + tags + audit
  const batchOps: Parameters<typeof db.batch>[0] = [
    db.insert(templates).values(templateRow),
    db.insert(templateVersions).values(versionRow),
    db.insert(auditLog).values(auditRow),
  ];

  for (const tagId of tagIds) {
    batchOps.push(db.insert(templateTags).values({ templateId, tagId }));
  }

  await db.batch(batchOps as [(typeof batchOps)[0], ...typeof batchOps]);

  return { ...templateRow, tags: parsed.tags ?? [] };
}
```

Note: The `db.batch()` type requires a tuple with at least one element, hence the cast.

### Step 4: Run test to verify it passes

Run: `pnpm test packages/api/tests/services/template.test.ts`
Expected: PASS

### Step 5: Run all tests

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All pass

### Step 6: Commit

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add createTemplate service function"
```

---

## Task 5: Template Service — List/Search/Filter

**Files:**

- Modify: `packages/api/src/services/template.ts`
- Modify: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests for listTemplates

Add tests to `packages/api/tests/services/template.test.ts`:

Tests to write:

- Returns paginated results with total count
- Filters by status
- Filters by category (exact match)
- Filters by country (exact match)
- Searches by title (case-insensitive LIKE)
- Filters by tag (join through templateTags)
- Combines multiple filters with AND
- Returns empty results for no matches
- Respects page and limit parameters
- Defaults to page 1, limit 20

### Step 2: Run test to verify it fails

Run: `pnpm test packages/api/tests/services/template.test.ts`
Expected: FAIL — `listTemplates` not exported

### Step 3: Implement listTemplates

Add to `packages/api/src/services/template.ts`:

```typescript
import { templateQuerySchema, type TemplateQuery } from '@legalcode/shared';

export async function listTemplates(db: AppDb, query: TemplateQuery) {
  const parsed = templateQuerySchema.parse(query);
  const conditions: ReturnType<typeof eq>[] = [];

  if (parsed.status) {
    conditions.push(eq(templates.status, parsed.status));
  }
  if (parsed.category) {
    conditions.push(eq(templates.category, parsed.category));
  }
  if (parsed.country) {
    conditions.push(eq(templates.country, parsed.country));
  }
  if (parsed.search) {
    conditions.push(like(templates.title, `%${parsed.search}%`));
  }

  let baseQuery = db.select().from(templates);

  if (parsed.tag) {
    // Join through templateTags and tags to filter by tag name
    baseQuery = baseQuery
      .innerJoin(templateTags, eq(templates.id, templateTags.templateId))
      .innerJoin(tags, eq(templateTags.tagId, tags.id)) as typeof baseQuery;
    conditions.push(eq(tags.name, parsed.tag));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (parsed.page - 1) * parsed.limit;

  const [results, countResult] = await Promise.all([
    baseQuery.where(whereClause).limit(parsed.limit).offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(
        // Same conditions minus the tag join
        conditions.filter((c) => c !== conditions[conditions.length - 1] || !parsed.tag).length > 0
          ? and(...conditions.filter((c) => c !== conditions[conditions.length - 1] || !parsed.tag))
          : undefined,
      ),
  ]);

  return {
    templates: results,
    total: countResult[0]?.count ?? 0,
    page: parsed.page,
    limit: parsed.limit,
  };
}
```

Note: The count query logic for tag filters may need refinement. The implementer should verify the count query works correctly with and without tag filters, and adjust the approach if needed (e.g., use a subquery for tag filtering).

### Step 4: Run test to verify it passes

Run: `pnpm test packages/api/tests/services/template.test.ts`
Expected: PASS

### Step 5: Run all tests and commit

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add listTemplates with search, filter, and pagination"
```

---

## Task 6: Template Service — Get Single Template

**Files:**

- Modify: `packages/api/src/services/template.ts`
- Modify: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests for getTemplate

Tests to write:

- Returns template with current version content and tags
- Returns null for non-existent template ID
- Includes all template metadata fields
- Includes version content and changeSummary

### Step 2: Run test to verify it fails

Run: `pnpm test packages/api/tests/services/template.test.ts`
Expected: FAIL — `getTemplate` not exported

### Step 3: Implement getTemplate

Add to `packages/api/src/services/template.ts`:

```typescript
export async function getTemplate(db: AppDb, templateId: string) {
  const result = await db.select().from(templates).where(eq(templates.id, templateId));
  const template = result[0];
  if (!template) return null;

  const [versions, tagRows] = await Promise.all([
    db
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, template.currentVersion),
        ),
      ),
    db
      .select({ name: tags.name })
      .from(templateTags)
      .innerJoin(tags, eq(templateTags.tagId, tags.id))
      .where(eq(templateTags.templateId, templateId)),
  ]);

  return {
    ...template,
    content: versions[0]?.content ?? '',
    changeSummary: versions[0]?.changeSummary ?? null,
    tags: tagRows.map((t) => t.name),
  };
}
```

### Step 4: Run test, verify passing, run all tests, commit

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add getTemplate with version content and tags"
```

---

## Task 7: Template Service — Update (Versioning)

**Files:**

- Modify: `packages/api/src/services/template.ts`
- Modify: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests for updateTemplate

Tests to write:

- Increments currentVersion on template row
- Creates new immutable version row with new content
- Updates template metadata (title, category, country) if provided
- Updates updatedAt timestamp
- Syncs tags if provided (remove old, add new)
- Creates audit log entry with version number and changed fields
- Uses db.batch() for atomicity
- Returns 404-like error (null) for non-existent template
- Returns 409-like error for archived templates (cannot update)
- Validates input with updateTemplateSchema
- Preserves existing content if content not provided in update (copies from current version)

### Step 2: Run test to verify it fails

### Step 3: Implement updateTemplate

Add to `packages/api/src/services/template.ts`:

```typescript
import { updateTemplateSchema, type UpdateTemplateInput } from '@legalcode/shared';

export async function updateTemplate(
  db: AppDb,
  templateId: string,
  input: UpdateTemplateInput,
  userId: string,
) {
  const parsed = updateTemplateSchema.parse(input);

  // Fetch current template
  const current = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!current[0]) return { error: 'not_found' as const };
  if (current[0].status === 'archived') return { error: 'archived' as const };

  const template = current[0];
  const newVersion = template.currentVersion + 1;
  const now = new Date().toISOString();

  // Get current version content if not provided
  let content = parsed.content;
  if (!content) {
    const currentVersionRow = await db
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, template.currentVersion),
        ),
      );
    content = currentVersionRow[0]?.content ?? '';
  }

  const versionRow = {
    id: crypto.randomUUID(),
    templateId,
    version: newVersion,
    content,
    changeSummary: parsed.changeSummary ?? null,
    createdBy: userId,
    createdAt: now,
  };

  const templateUpdates: Record<string, unknown> = {
    currentVersion: newVersion,
    updatedAt: now,
  };
  if (parsed.title) templateUpdates['title'] = parsed.title;
  if (parsed.category) templateUpdates['category'] = parsed.category;
  if (parsed.country !== undefined) templateUpdates['country'] = parsed.country;

  const batchOps: Parameters<typeof db.batch>[0] = [
    db.update(templates).set(templateUpdates).where(eq(templates.id, templateId)),
    db.insert(templateVersions).values(versionRow),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action: 'update' as const,
      entityType: 'template',
      entityId: templateId,
      metadata: JSON.stringify({ version: newVersion, fields: Object.keys(parsed) }),
      createdAt: now,
    }),
  ];

  // Sync tags if provided
  if (parsed.tags) {
    // Delete existing tags
    batchOps.push(db.delete(templateTags).where(eq(templateTags.templateId, templateId)));
    // Resolve and insert new tags
    for (const tagName of parsed.tags) {
      const existing = await db.select().from(tags).where(eq(tags.name, tagName));
      const tagId = existing[0]?.id ?? crypto.randomUUID();
      if (!existing[0]) {
        await db.insert(tags).values({ id: tagId, name: tagName });
      }
      batchOps.push(db.insert(templateTags).values({ templateId, tagId }));
    }
  }

  await db.batch(batchOps as [(typeof batchOps)[0], ...typeof batchOps]);

  return { template: { ...template, ...templateUpdates, currentVersion: newVersion } };
}
```

### Step 4: Run tests, verify passing, run all tests, commit

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add updateTemplate with versioning and tag sync"
```

---

## Task 8: Template Service — Publish & Archive (State Transitions)

**Files:**

- Modify: `packages/api/src/services/template.ts`
- Modify: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests for publishTemplate and archiveTemplate

**State transition tests — these are critical:**

publishTemplate tests:

- draft → active: valid, updates status and updatedAt, creates audit log
- active → publish: returns error 'already_active'
- archived → publish: returns error 'archived'
- non-existent template: returns error 'not_found'

archiveTemplate tests:

- draft → archived: valid (discard), updates status and updatedAt, creates audit log
- active → archived: valid, updates status and updatedAt, creates audit log
- archived → archive: returns error 'already_archived'
- non-existent template: returns error 'not_found'

### Step 2: Run test to verify they fail

### Step 3: Implement publishTemplate and archiveTemplate

Add to `packages/api/src/services/template.ts`:

```typescript
export async function publishTemplate(db: AppDb, templateId: string, userId: string) {
  const result = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!result[0]) return { error: 'not_found' as const };
  if (result[0].status === 'active') return { error: 'already_active' as const };
  if (result[0].status === 'archived') return { error: 'archived' as const };

  const now = new Date().toISOString();
  await db.batch([
    db
      .update(templates)
      .set({ status: 'active', updatedAt: now })
      .where(eq(templates.id, templateId)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action: 'update' as const,
      entityType: 'template',
      entityId: templateId,
      metadata: JSON.stringify({ action: 'publish', version: result[0].currentVersion }),
      createdAt: now,
    }),
  ]);

  return { template: { ...result[0], status: 'active' as const, updatedAt: now } };
}

export async function archiveTemplate(db: AppDb, templateId: string, userId: string) {
  const result = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!result[0]) return { error: 'not_found' as const };
  if (result[0].status === 'archived') return { error: 'already_archived' as const };

  const previousStatus = result[0].status;
  const now = new Date().toISOString();
  await db.batch([
    db
      .update(templates)
      .set({ status: 'archived', updatedAt: now })
      .where(eq(templates.id, templateId)),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action: 'archive' as const,
      entityType: 'template',
      entityId: templateId,
      metadata: JSON.stringify({ previousStatus }),
      createdAt: now,
    }),
  ]);

  return { template: { ...result[0], status: 'archived' as const, updatedAt: now } };
}
```

### Step 4: Run tests, verify passing, run all tests, commit

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add publish and archive with state transition enforcement"
```

---

## Task 9: Template Service — Versions & Download

**Files:**

- Modify: `packages/api/src/services/template.ts`
- Modify: `packages/api/tests/services/template.test.ts`

### Step 1: Write failing tests

getTemplateVersions tests:

- Returns all versions for a template, ordered by version number descending
- Returns empty array for non-existent template

getTemplateVersion tests:

- Returns specific version by number
- Returns null for non-existent version

downloadTemplate tests:

- Returns filename (slug.md) and content for current version
- Returns null for non-existent template

### Step 2: Run test to verify they fail

### Step 3: Implement functions

Add to `packages/api/src/services/template.ts`:

```typescript
export async function getTemplateVersions(db: AppDb, templateId: string) {
  return db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(sql`${templateVersions.version} DESC`);
}

export async function getTemplateVersion(db: AppDb, templateId: string, version: number) {
  const result = await db
    .select()
    .from(templateVersions)
    .where(and(eq(templateVersions.templateId, templateId), eq(templateVersions.version, version)));
  return result[0] ?? null;
}

export async function downloadTemplate(db: AppDb, templateId: string) {
  const template = await getTemplate(db, templateId);
  if (!template) return null;
  return {
    filename: `${template.slug}.md`,
    content: template.content,
  };
}
```

### Step 4: Run tests, verify passing, run all tests, commit

```bash
git add packages/api/src/services/template.ts packages/api/tests/services/template.test.ts
git commit -m "feat: add version listing, version detail, and markdown download"
```

---

## Task 10: Template Routes

**Files:**

- Create: `packages/api/src/routes/templates.ts`
- Create: `packages/api/tests/routes/templates.test.ts`
- Modify: `packages/api/src/index.ts`

### Step 1: Write failing route tests

Create `packages/api/tests/routes/templates.test.ts`:

Tests organized by endpoint:

**GET /templates**

- Returns 401 without auth
- Returns paginated template list
- Passes query params to listTemplates

**POST /templates**

- Returns 401 without auth
- Returns 403 for viewer role
- Returns 400 for invalid input
- Returns 201 with created template

**GET /templates/:id**

- Returns 401 without auth
- Returns 404 for non-existent template
- Returns template with content and tags

**PATCH /templates/:id**

- Returns 401 without auth
- Returns 403 for viewer role
- Returns 400 for invalid input
- Returns 409 for archived template
- Returns 200 with updated template

**POST /templates/:id/publish**

- Returns 401 without auth
- Returns 403 for viewer role
- Returns 409 for already active/archived
- Returns 200 on success

**POST /templates/:id/archive**

- Returns 401 without auth
- Returns 403 for viewer role
- Returns 409 for already archived
- Returns 200 on success

**GET /templates/:id/versions**

- Returns 401 without auth
- Returns version list

**GET /templates/:id/versions/:version**

- Returns 401 without auth
- Returns 404 for non-existent version
- Returns version content

**GET /templates/:id/download**

- Returns 401 without auth
- Returns 404 for non-existent template
- Returns markdown file with Content-Disposition header

### Step 2: Run test to verify they fail

### Step 3: Implement template routes

Create `packages/api/src/routes/templates.ts`:

```typescript
import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplateVersions,
  getTemplateVersion,
  downloadTemplate,
} from '../services/template.js';
import { createTemplateSchema, updateTemplateSchema, templateQuerySchema } from '@legalcode/shared';

export const templateRoutes = new Hono<AppEnv>();

// All routes require auth
templateRoutes.use('*', authMiddleware);

// Read routes — all authenticated users
templateRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const query = templateQuerySchema.parse(c.req.query());
  const result = await listTemplates(db, query);
  return c.json(result);
});

templateRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const template = await getTemplate(db, c.req.param('id'));
  if (!template) return c.json({ error: 'Template not found' }, 404);
  return c.json({ template });
});

templateRoutes.get('/:id/versions', async (c) => {
  const db = getDb(c.env.DB);
  const versions = await getTemplateVersions(db, c.req.param('id'));
  return c.json({ versions });
});

templateRoutes.get('/:id/versions/:version', async (c) => {
  const db = getDb(c.env.DB);
  const version = Number(c.req.param('version'));
  const result = await getTemplateVersion(db, c.req.param('id'), version);
  if (!result) return c.json({ error: 'Version not found' }, 404);
  return c.json({ version: result });
});

templateRoutes.get('/:id/download', async (c) => {
  const db = getDb(c.env.DB);
  const result = await downloadTemplate(db, c.req.param('id'));
  if (!result) return c.json({ error: 'Template not found' }, 404);
  return new Response(result.content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
});

// Write routes — admin + editor only
templateRoutes.post('/', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const body: unknown = await c.req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const user = c.get('user');
  const template = await createTemplate(db, parsed.data, user.id);
  return c.json({ template }, 201);
});

templateRoutes.patch('/:id', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const body: unknown = await c.req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }
  const user = c.get('user');
  const result = await updateTemplate(db, c.req.param('id'), parsed.data, user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    if (result.error === 'archived')
      return c.json({ error: 'Cannot update archived template' }, 409);
  }
  return c.json(result);
});

templateRoutes.post('/:id/publish', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get('user');
  const result = await publishTemplate(db, c.req.param('id'), user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    if (result.error === 'already_active')
      return c.json({ error: 'Template is already active' }, 409);
    if (result.error === 'archived')
      return c.json({ error: 'Cannot publish archived template' }, 409);
  }
  return c.json(result);
});

templateRoutes.post('/:id/archive', requireRole('admin', 'editor'), async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get('user');
  const result = await archiveTemplate(db, c.req.param('id'), user.id);
  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Template not found' }, 404);
    if (result.error === 'already_archived')
      return c.json({ error: 'Template is already archived' }, 409);
  }
  return c.json(result);
});
```

### Step 4: Wire routes into app

Modify `packages/api/src/index.ts`:

Add import:

```typescript
import { templateRoutes } from './routes/templates.js';
```

Add route:

```typescript
app.route('/templates', templateRoutes);
```

### Step 5: Run tests, verify passing, run all tests, commit

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add packages/api/src/routes/templates.ts packages/api/tests/routes/templates.test.ts \
  packages/api/src/index.ts
git commit -m "feat: add template CRUD routes with auth guards"
```

---

## Task 11: Integration Tests with Miniflare D1

**Files:**

- Create: `packages/api/tests/integration/template-crud.test.ts`
- May need: `vitest.config.ts` updates for integration test setup

### Step 1: Research miniflare D1 test setup

Check if `@cloudflare/vitest-pool-workers` is available and compatible. If not, use `miniflare` directly to create a D1 instance for testing.

Read:

- `packages/api/package.json` for existing test dependencies
- `vitest.config.ts` for current test configuration

### Step 2: Write integration tests

Create `packages/api/tests/integration/template-crud.test.ts`:

These tests use a real D1 SQLite database (via miniflare) and run the full app:

**Full CRUD lifecycle test:**

1. Create a template → verify 201, status draft, version 1
2. Get the template → verify content, tags
3. Update the template → verify version 2, new content preserved
4. List templates → verify it appears in results
5. Search templates → verify title search works
6. Publish the template → verify status active
7. Archive the template → verify status archived
8. Try to update archived → verify 409
9. Try to publish archived → verify 409
10. Download template → verify markdown content and headers

**State transition tests (real DB):**

- All valid transitions succeed
- All invalid transitions return 409

**Batch atomicity test:**

- Trigger a constraint violation mid-batch (e.g., duplicate tag) and verify no partial writes

**Tag management test:**

- Create template with tags
- Update to different tags
- Verify old tags removed, new tags added
- Verify shared tags (used by multiple templates) aren't deleted

**Pagination test:**

- Create 25 templates
- Verify page 1 returns 20
- Verify page 2 returns 5
- Verify total count is 25

**Filter combination test:**

- Create templates with different categories, statuses, countries
- Verify each filter works individually
- Verify filters combine with AND logic

### Step 3: Set up miniflare D1 test helper

Create a test helper that:

- Creates a miniflare instance with D1 binding
- Applies the migration SQL from `drizzle/0000_past_dreadnoughts.sql`
- Seeds a test user
- Returns the app instance configured with the test env

### Step 4: Implement integration tests

Write the full test suite using the helper. Each test should be independent — use `beforeEach` to reset the database state.

### Step 5: Run integration tests

Run: `pnpm test packages/api/tests/integration/`
Expected: All pass

### Step 6: Run full verification

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All tests pass, 95%+ coverage

### Step 7: Commit

```bash
git add packages/api/tests/integration/ packages/api/vitest.config.ts
git commit -m "test: add integration tests with miniflare D1 for template CRUD"
```

---

## Task 12: Deploy to Production

### Step 1: Run full verification

```bash
pnpm typecheck && pnpm lint && pnpm test
```

### Step 2: Run semgrep scan

```bash
pnpm security:scan
```

Verify no errors. Warnings from `p/security-audit` are acceptable for now.

### Step 3: Build and deploy

```bash
pnpm build
npx wrangler deploy
```

### Step 4: Test live endpoints

```bash
# Health check
curl https://legalcode.acasus.workers.dev/health

# Templates list (should return empty, requires auth cookie)
curl -s https://legalcode.acasus.workers.dev/templates
# Expected: 401 (no auth)
```

### Step 5: Push to GitHub

```bash
git push origin main
```

### Step 6: Commit

No commit needed — this is deployment only.

---

## Summary of Tasks

| Task | Description             | Key Files                                            |
| ---- | ----------------------- | ---------------------------------------------------- |
| 0    | Security infrastructure | Semgrep, gitleaks, error handler, CSP headers        |
| 1    | Database helper         | `getDb()`, `AppDb` type                              |
| 2    | Migrate UserService     | Class → Drizzle functions, update all callers        |
| 3    | Audit logging service   | `logAudit()` function                                |
| 4    | Template create         | `createTemplate()` with batch, tags, audit           |
| 5    | Template list/search    | `listTemplates()` with dynamic filters               |
| 6    | Template get            | `getTemplate()` with version + tags                  |
| 7    | Template update         | `updateTemplate()` with versioning                   |
| 8    | Publish & archive       | State transition enforcement                         |
| 9    | Versions & download     | Version list, detail, markdown download              |
| 10   | Template routes         | Wire all service functions to HTTP endpoints         |
| 11   | Integration tests       | Miniflare D1, full CRUD lifecycle, state transitions |
| 12   | Deploy to production    | Build, deploy, verify live                           |
