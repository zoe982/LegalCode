# LegalCode - Development Guide

## Project Structure

pnpm monorepo: `packages/api` (Hono/Cloudflare Worker), `packages/web` (React/Vite), `packages/shared` (types/schemas)

## Commands

- `pnpm dev` — Run API + Web concurrently
- `pnpm dev:api` — API only (wrangler dev --local)
- `pnpm dev:web` — Frontend only (vite dev)
- `pnpm build` — Build all packages
- `pnpm lint` — ESLint (strict-type-checked, zero warnings)
- `pnpm format` — Prettier format
- `pnpm typecheck` — TypeScript check (tsc -b)
- `pnpm test` — Vitest (95% coverage threshold)
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Coverage report
- `pnpm test:e2e` — Playwright (Chrome)
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:migrate` — Apply D1 migrations locally
- `pnpm db:seed` — Seed local D1

## Architecture

- **Auth:** Google OAuth 2.0 PKCE, JWT in httpOnly cookies
- **DB:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Validation:** Zod schemas shared between FE/BE (packages/shared)
- **State:** TanStack Query v5 (offlineFirst)
- **UI:** MUI v7 with Material Design 3 theme
- **Editor:** Milkdown (ProseMirror + Markdown)

## Code Quality

- TypeScript: strictest settings (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- ESLint: strict-type-checked + stylistic-type-checked, zero exceptions
- Coverage: 95% minimum (lines, functions, branches, statements)
- TDD workflow: tests first, then implementation

## Testing

- Unit/Integration: Vitest + React Testing Library + MSW
- E2E: Playwright (Chrome only)
- Use accessibility-first queries (getByRole, getByLabelText)
