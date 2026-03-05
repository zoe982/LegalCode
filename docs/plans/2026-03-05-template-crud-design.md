# Phase 2: Template CRUD Design

## Overview

Implement full template CRUD with versioning, tagging, search/filter, audit logging, and markdown download. Built on Drizzle ORM query builder with D1 batch API for atomic multi-table operations.

## Decisions

| Decision           | Choice                                 | Rationale                                                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------ |
| Service layer      | Drizzle query builder, plain functions | Type-safe, composable filters, injection-proof by default                      |
| Service pattern    | Plain functions taking `db` instance   | Simpler, more testable than classes. Consistent across codebase                |
| Multi-table writes | D1 batch API via `db.batch()`          | Atomic transactions — failure rolls back entire batch                          |
| Versioning         | Auto-version on every save             | Every edit creates immutable version row. Change summary optional              |
| Publishing         | Explicit publish action                | Separate from save — deliberate promotion from draft to active                 |
| Archival           | One-way, no restore                    | draft→archived, active→archived. Keeps state machine simple, audit trail clean |
| Slug strategy      | Title + 6-char random suffix           | Always unique, no race conditions on check-and-retry                           |
| Search             | `LIKE` with `COLLATE NOCASE`           | Sufficient for English template titles in v1                                   |
| Audit logging      | Built into every mutation              | create, update, publish, archive all logged with user context                  |
| Existing code      | Migrate UserService to Drizzle         | One consistent data access pattern across entire codebase                      |

## API Routes

### Authenticated (all users)

- `GET /templates` — List templates (search, filter, paginate)
- `GET /templates/:id` — Get template with current version + tags
- `GET /templates/:id/versions` — List all versions
- `GET /templates/:id/versions/:version` — Get specific version content
- `GET /templates/:id/download` — Download current version as markdown file

### Admin + Editor only

- `POST /templates` — Create template (starts as draft)
- `PATCH /templates/:id` — Update template (creates new version)
- `POST /templates/:id/publish` — Publish template (draft → active)
- `POST /templates/:id/archive` — Archive template (draft/active → archived)

## State Machine

```
┌───────┐   publish    ┌────────┐
│ draft │─────────────→│ active │
└───┬───┘              └───┬────┘
    │                      │
    │ archive              │ archive
    │                      │
    ▼                      ▼
┌──────────┐          ┌──────────┐
│ archived │          │ archived │
└──────────┘          └──────────┘
```

**Valid transitions:**

- draft → active (publish)
- draft → archived (archive/discard)
- active → archived (archive)

**Invalid transitions (return 409 Conflict):**

- archived → anything (archival is permanent)
- active → draft (no unpublish)
- publish on active (already published)

## Data Ownership

### Template row (mutable metadata)

| Field          | Description                                    |
| -------------- | ---------------------------------------------- |
| id             | UUID primary key                               |
| title          | Current title (updated on PATCH)               |
| slug           | URL-safe identifier (immutable after creation) |
| category       | Template category                              |
| country        | ISO 3166-1 alpha-2 or null                     |
| status         | draft / active / archived                      |
| currentVersion | Integer, incremented on each update            |
| createdBy      | User ID who created the template               |
| createdAt      | ISO 8601 timestamp                             |
| updatedAt      | ISO 8601 timestamp (updated on every mutation) |

### Version row (immutable content snapshot)

| Field         | Description                            |
| ------------- | -------------------------------------- |
| id            | UUID primary key                       |
| templateId    | FK to template                         |
| version       | Integer version number                 |
| content       | Markdown content at this point in time |
| changeSummary | Optional description of what changed   |
| createdBy     | User ID who created this version       |
| createdAt     | ISO 8601 timestamp                     |

Template row is the source of truth for current metadata. Version row is the source of truth for content at that point in time. Version rows are never modified after creation.

## Service Layer Architecture

### Database helper

```ts
// packages/api/src/db/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
export type AppDb = ReturnType<typeof getDb>;
```

Single place to create Drizzle instance. Encapsulates schema binding and provides a consistent type.

### Service functions

Plain functions taking `AppDb` as first argument:

```
// Template operations
createTemplate(db, input, userId) → Template + Version
updateTemplate(db, templateId, input, userId) → Template + Version
publishTemplate(db, templateId, userId) → Template
archiveTemplate(db, templateId, userId) → Template
getTemplate(db, templateId) → Template + Version + Tags
listTemplates(db, query) → { templates, total }
getTemplateVersions(db, templateId) → Version[]
getTemplateVersion(db, templateId, version) → Version
downloadTemplate(db, templateId) → { filename, content }

// Tag operations (internal, used by template functions)
syncTemplateTags(db, templateId, tagNames) → void

// Audit operations
logAudit(db, userId, action, entityType, entityId, metadata?) → void

// User operations (migrated from UserService class)
findUserByEmail(db, email) → User | null
findUserById(db, id) → User | null
listAllUsers(db) → User[]
createUser(db, input) → User
updateUserRole(db, id, role) → void
deactivateUser(db, id) → void
```

### Zod validation at two layers

1. **API route layer** — validates request body/query params (external boundary)
2. **Service function layer** — validates inputs structurally (guarantees correctness regardless of call site)

### Atomic operations via D1 batch

Template creation example:

```ts
await db.batch([
  db.insert(templates).values(templateRow),
  db.insert(templateVersions).values(versionRow),
  db.insert(templateTags).values(tagRows),
  db.insert(auditLog).values(auditRow),
]);
```

Failure at any step rolls back the entire batch.

## Security Infrastructure (Task 0)

### Semgrep

- `p/owasp-top-ten` + `p/typescript` — errors (blocking CI and pre-commit)
- `p/security-audit` — warnings initially, promote to errors as rules are validated
- Added to Husky pre-commit hook and CI pipeline

### Gitleaks

- Pre-commit hook for secret scanning
- Catches accidentally committed API keys, tokens, connection strings

### Dependency auditing

- `pnpm audit` in CI pipeline
- Alerts on known vulnerabilities in transitive dependencies

### Global error handler

- Hono `app.onError()` handler
- **Internal**: Log full structured error (request ID, stack trace, user context, timestamp) as JSON
- **External**: Return generic error message to client — never expose DB names, file paths, query shapes, or stack traces
- Different behavior for known errors (validation, auth, not found) vs unexpected errors

### Content-Security-Policy headers

- Hono middleware on all responses
- `default-src 'self'`; restrict scripts, styles, connections to same origin
- Prevent XSS via injected scripts even if markdown content is rendered as HTML

### Rate limiting

- Cloudflare rate limiting on mutation endpoints (POST, PATCH)
- Prevent abuse of template creation and modification

## Search & Filtering

Query parameters parsed through `templateQuerySchema`:

| Param    | Type   | Filter                                  |
| -------- | ------ | --------------------------------------- |
| search   | string | `LIKE '%term%' COLLATE NOCASE` on title |
| category | string | Exact match                             |
| country  | string | Exact match (ISO 3166-1 alpha-2)        |
| status   | enum   | Exact match (draft/active/archived)     |
| tag      | string | Join through templateTags → tags        |
| page     | number | Offset pagination (default 1)           |
| limit    | number | Results per page (default 20, max 100)  |

Dynamic where clause built with Drizzle's `and()`, `eq()`, `like()` operators. Tag filter requires a subquery or join. Response includes `total` count for pagination UI.

## Audit Logging

Every template mutation logs to `audit_log`:

| Action  | Logged data                                     |
| ------- | ----------------------------------------------- |
| create  | Template ID, title, category                    |
| update  | Template ID, new version number, fields changed |
| publish | Template ID, version published                  |
| archive | Template ID, previous status                    |

Each entry includes: user ID, action, entity type ("template"), entity ID, JSON metadata, timestamp.

## Testing Strategy

### Strict TDD workflow

Failing test → minimal implementation → pass → refactor. No code written without a failing test first.

### Coverage

95% minimum on lines, functions, branches, statements — enforced per package by Vitest.

### Test categories

**Service tests** — Mock Drizzle db. Test each function: input validation, query construction, error handling, audit log creation, state transition logic.

**Route tests** — Hono `app.request()` with mocked env. Test auth guards, role checks, request validation, response shapes, error responses.

**Integration tests (mandatory)** — Miniflare D1 for real SQLite behavior. Verify batch atomicity, LIKE semantics, schema constraints, foreign key enforcement. These are not optional — they catch real bugs that mocked tests miss.

**State transition tests** — Explicit tests for every valid and invalid transition:

- draft → active (valid)
- draft → archived (valid)
- active → archived (valid)
- archived → active (error 409)
- archived → draft (error 409)
- active → draft (error 409)
- publish on active (error 409)
- update on archived (error 409)

**Security tests** — Unauthorized access attempts, invalid roles on protected endpoints, malformed input, oversized payloads, injection attempts in search params and template content.

## New/Modified Files

```
packages/api/src/
  db/index.ts                    # NEW: getDb() helper, AppDb type
  services/template.ts           # NEW: Template CRUD functions
  services/audit.ts              # NEW: Audit logging function
  services/user.ts               # MODIFY: Migrate from class/raw SQL to Drizzle functions
  routes/templates.ts            # NEW: Template route handlers
  routes/admin.ts                # MODIFY: Use new user functions
  routes/auth.ts                 # MODIFY: Use new user functions
  middleware/error.ts             # NEW: Global error handler
  middleware/security.ts          # NEW: CSP headers, rate limiting
  index.ts                       # MODIFY: Wire template routes, error handler, security middleware

packages/shared/src/
  schemas/index.ts               # Already has template schemas — may need minor updates
  types/index.ts                 # Already has template types — may need minor updates

Root:
  .semgreprc.yml                 # NEW: Semgrep configuration
  .gitleaks.toml                 # NEW: Gitleaks configuration
  .husky/pre-commit              # MODIFY: Add semgrep + gitleaks
```

## Technology Notes

- Drizzle `drizzle-orm/d1` driver for Cloudflare D1
- `db.batch()` for atomic multi-table operations (confirmed: rolls back on failure)
- Drizzle relational queries for fetching templates with versions and tags
- Slug generation: `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')` + 6-char crypto random suffix
- Markdown download via `Content-Disposition: attachment; filename="<slug>.md"` header
