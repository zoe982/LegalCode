# Cook Orchestrator System Design

## Overview

Cook is an orchestrator agent that receives all user prompts and delegates work to specialized subagents. Cook never writes code directly. It analyzes tasks, divides work, dispatches subagents, integrates results, and ensures quality gates pass before deployment.

## Agents

| Agent                 | Specialty                                                                                          | Scope                             |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Cook**              | Orchestration, task division, integration, quality enforcement                                     | All prompts                       |
| **Ive**               | Material Design 3 Expressive. Component specs, layouts, interaction patterns, color/spacing tokens | Design specs only (no code)       |
| **Frontend Engineer** | React 19, MUI v7, TanStack Query v5, Vite 6, React Testing Library                                 | `packages/web`                    |
| **Backend Engineer**  | Hono v4, Drizzle ORM, Cloudflare Workers/D1/KV, Zod                                                | `packages/api`, `packages/shared` |
| **QA Engineer**       | ESLint strict-type-checked, TypeScript strict, Vitest 95% per-file, semgrep OWASP, security audit  | All packages                      |

## Flow

1. User prompt arrives -> Cook analyzes it
2. Cook determines which agents are needed
3. If UI work: Cook dispatches Ive first for design spec, then Frontend Engineer with the spec
4. Cook dispatches subagents in parallel when tasks are independent, sequentially when dependent
5. After implementation: Cook dispatches QA Engineer to run all quality gates
6. Cook reports results

## QA Gates (run before every deploy)

1. `pnpm typecheck` -- TypeScript strict mode
2. `pnpm lint` -- ESLint strict-type-checked, zero warnings
3. `pnpm test` -- Vitest with 95% per-file coverage thresholds
4. `semgrep scan --config p/owasp-top-ten --config p/typescript --config p/security-audit --error packages/` -- Security analysis
5. Verify all UI components in `packages/web/src` have corresponding test files

## Context7 Library IDs

Subagents use these to query up-to-date docs:

### Backend Engineer

- Hono: `/llmstxt/hono_dev_llms_txt`
- Drizzle ORM: `/drizzle-team/drizzle-orm-docs`
- Cloudflare Workers: query Hono docs for Workers-specific bindings (c.env, D1, KV)

### Frontend Engineer

- MUI v7: `/mui/material-ui/v7_3_2`
- React 19: resolve via context7 `react`
- TanStack Query v5: resolve via context7 `tanstack-query`

### Ive

- Material Design 3: reference MD3 Expressive guidelines
- MUI v7 theming: `/mui/material-ui/v7_3_2` (for understanding what components are available)

## Key Rules

- Cook never writes implementation code
- All implementation follows TDD (tests first, confirm failing, then implement)
- Each subagent gets only the context it needs (no full codebase dumps)
- QA Engineer is always dispatched before any deploy
- Cook auto-delegates -- no user approval needed for task splitting
- For design work: Ive produces specs, Frontend Engineer implements them
