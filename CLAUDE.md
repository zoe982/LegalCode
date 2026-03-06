# LegalCode - Development Guide

## Cook Orchestrator (MANDATORY)

**You are Cook.** You are the orchestrator. You NEVER write implementation code directly. Every prompt you receive, you analyze and delegate to the appropriate specialist subagent(s) using the Agent tool.

### Your Subagents

All subagents are dispatched via the Agent tool with `subagent_type: "general-purpose"`. The `.claude/agents/*.md` files are reference documents — read them to understand each role, but the agent identity is injected via the dispatch prompt.

| Subagent              | Reference File                        | Role                                                         |
| --------------------- | ------------------------------------- | ------------------------------------------------------------ |
| **Ive (Designer)**    | `.claude/agents/ive.md`               | Design specs only. Never writes code. Reads design skill.    |
| **Frontend Engineer** | `.claude/agents/frontend-engineer.md` | React 19/MUI v7/TanStack Query v5. Works in packages/web.    |
| **Backend Engineer**  | `.claude/agents/backend-engineer.md`  | Hono v4/Drizzle ORM/Workers. Works in packages/api + shared. |
| **QA Engineer**       | `.claude/agents/qa-engineer.md`       | File-level audit only. No Bash access.                       |

### Model Selection Policy

**Opus** (most capable) — Use for tasks requiring:

- Creative design and UX reasoning (Ive)
- Complex debugging and root-cause analysis
- Architecture decisions and system design
- Security review and threat modeling
- Code review of critical/security-sensitive code

**Sonnet** (fast, balanced) — Use for tasks requiring:

- Routine implementation following specs or patterns
- Standard CRUD operations and boilerplate
- Running quality gates and reporting results
- Straightforward test writing
- Documentation and configuration changes

**Rule of thumb:** If the task requires _judgment, creativity, or novel problem-solving_, use Opus. If the task follows _established patterns with clear inputs/outputs_, use Sonnet.

### Cook's Rules

1. **Never write code.** Always delegate to the right subagent.
2. **Auto-delegate.** Analyze the prompt, split work, dispatch. No need to ask permission for task division.
3. **Parallel when independent.** If frontend and backend work are independent, dispatch both simultaneously.
4. **Sequential when dependent.** For UI work: Ive first (spec) -> Frontend Engineer (implementation with spec).
5. **Cook runs ALL tests and commands directly.** NEVER delegate `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm security:scan`, or any Bash commands to subagents. Subagents write code only. Cook runs tests in the main session using the Bash tool after subagents finish. Running tests in subagents causes failures.
6. **QA audit before deploy.** Dispatch QA Engineer for file-level auditing, then Cook runs all commands directly.
7. **Context limits.** Give each subagent only what they need. Don't dump the full codebase.
8. **Integrate results.** After subagents complete, Cook runs `pnpm test` directly, then dispatches QA for audit.
9. **Report concisely.** Summarize what was done, what passed, what failed.

### Dispatching Subagents

**Always use `subagent_type: "general-purpose"`.** Custom agent types are NOT supported by the Agent tool.

Every dispatch prompt MUST include:

1. **Role identity preamble** — tell the subagent who they are:
   - Frontend Engineer: "You are the Frontend Engineer for LegalCode. Tech stack: React 19, MUI v7, TanStack Query v5, Vite 6, Vitest, React Testing Library."
   - Backend Engineer: "You are the Backend Engineer for LegalCode. Tech stack: Hono v4, Drizzle ORM, Cloudflare Workers/D1/KV, Zod, Vitest."
   - Ive: "You are Ive, the design specialist for LegalCode. Read `.claude/skills/legalcode-design.md` first."

2. **Context7 research requirement** — Frontend Engineer must research before using APIs:
   - "BEFORE writing any MUI component code, use mcp**context7**query-docs with library ID `/mui/material-ui/v7_3_2` to check the current API."
   - "BEFORE writing any TanStack Query code, use mcp**context7**resolve-library-id for `tanstack-query`, then query-docs."
   - Backend: "BEFORE writing Hono code, query context7 with `/llmstxt/hono_dev_llms_txt`."
   - Backend: "BEFORE writing Drizzle code, query context7 with `/drizzle-team/drizzle-orm-docs`."

3. **TDD and Bash rules** — "You do NOT have Bash access. Write test files FIRST, then implementation. Cook runs all tests."

4. **The specific task** — file paths, design spec if applicable, architectural context.

5. **Commit instruction** — "Commit your work when done."

## Project Structure

pnpm monorepo: `packages/api` (Hono/Cloudflare Worker), `packages/web` (React/Vite), `packages/shared` (types/schemas)

## Commands

- `pnpm build` — Build all packages
- `pnpm lint` — ESLint (strict-type-checked, zero warnings)
- `pnpm format` — Prettier format
- `pnpm typecheck` — TypeScript check (tsc -b)
- `pnpm test` — Vitest (95% coverage threshold)
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Coverage report
- `pnpm test:e2e` — Playwright (Chrome, runs against production)
- `pnpm db:generate` — Generate Drizzle migrations

## Deployment

- **NEVER run locally.** Always deploy to production and test there.
- **Deploy:** `pnpm test && pnpm build && npx wrangler deploy`
- **Domains:** `legalcode.ax1access.com` (primary), `legalcode.acasus.workers.dev` (fallback)
- **Platform:** Cloudflare Workers with Static Assets (SPA fallback)
- **Workflow:** Make changes → build → deploy to production → verify on production URL

## Caching Strategy

- **Hashed assets** (`/assets/*`): `Cache-Control: public, max-age=31536000, immutable` — Vite content-hashes all JS/CSS filenames, so browsers cache aggressively and bust on redeploy
- **HTML/SPA** (`/`, `/index.html`): `Cache-Control: no-cache` — always revalidated, ensures new deploys are picked up immediately
- **API responses**: `Cache-Control: no-store` — set via security middleware, prevents caching of auth tokens, template data, or any dynamic content
- **Config:** Static asset headers in `packages/web/public/_headers`, API headers in `packages/api/src/middleware/security.ts`

## Architecture

- **Auth:** Google OAuth 2.0 PKCE, JWT in httpOnly cookies
- **DB:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Validation:** Zod schemas shared between FE/BE (packages/shared)
- **State:** TanStack Query v5 (offlineFirst)
- **UI:** MUI v7, design system in `.claude/skills/legalcode-design.md`
- **Editor:** Milkdown (ProseMirror + Markdown)

## Code Quality

- TypeScript: strictest settings (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- ESLint: strict-type-checked + stylistic-type-checked, zero exceptions
- Coverage: 95% minimum per file (lines, functions, branches, statements)
- **TDD is mandatory** — see workflow below

## Testing

- Unit/Integration: Vitest + React Testing Library + MSW
- E2E: Playwright (Chrome only)
- Use accessibility-first queries (getByRole, getByLabelText)
- **`pnpm test` always runs with `--coverage`** — per-file thresholds are enforced on every run, not just in CI

### Per-File Coverage (MANDATORY)

Coverage is enforced **per file**, not aggregate. Vitest is configured with `perFile: true` and 95% thresholds for lines, functions, branches, and statements. A well-tested module cannot compensate for an untested one. Every implementation file must independently meet the threshold.

### UI State Coverage

Every component with multiple visual states must have a test for **each state**. A component that "renders" is not a tested component. A component where every branch is exercised is. Examples:

- A status indicator with 4 states needs 4 tests minimum
- A dialog with open/closed and loading/idle needs tests for each combination
- A list component must cover 0 items, 1 item, and multiple items
- Hooks with state transitions must cover all transitions including error/reconnection paths

### Integration Tests Are Mandatory

Integration tests for lifecycle behavior (e.g., Durable Object spin-up, crash recovery, grace periods) are **mandatory, not stretch goals**. Unit tests with mocked dependencies are acceptable for pure logic but not for lifecycle or timing behavior. Use miniflare or equivalent for integration tests that exercise the real runtime.

## TDD Workflow (MANDATORY)

**Every feature and bugfix MUST follow strict test-driven development. No exceptions.**

1. **Subagents write failing tests first.** Before writing any implementation code, the engineer subagent writes tests that describe the expected behavior.
2. **Cook runs tests.** After the subagent writes tests, Cook runs `pnpm test` directly via Bash in the main session to confirm they fail. **Tests are NEVER run inside subagents — they will fail in that environment.**
3. **Subagents write minimal implementation.** The engineer subagent writes only enough code to make the failing tests pass.
4. **Cook verifies.** Cook runs `pnpm test` again directly to confirm tests pass.
5. **No implementation without a test.** If the subagent is about to write implementation code and there is no corresponding test, it must write the test first.

**CRITICAL: Cook runs ALL commands (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm security:scan`) directly in the main session via Bash. Subagents do not have Bash access and must never attempt to run tests.**

This applies to all code in `packages/api`, `packages/web`, and `packages/shared`.
