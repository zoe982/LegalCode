# LegalCode - Development Guide

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
- **Deploy:** `pnpm build && npx wrangler deploy`
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
