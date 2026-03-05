# Phase 1: Auth + DB Design

## Overview

Implement Google OAuth 2.0 PKCE authentication with JWT-based sessions for LegalCode. Users are pre-created by admins. Sessions use httpOnly cookies with Cloudflare KV-backed refresh tokens.

## Decisions

| Decision          | Choice                      | Rationale                               |
| ----------------- | --------------------------- | --------------------------------------- |
| Auth provider     | Google OAuth 2.0 PKCE       | Acasus uses Google Workspace            |
| User provisioning | Admin pre-creates users     | Security — no self-registration         |
| Email policy      | Allowlist (specific emails) | acasus.com emails + zoe@marsico.org     |
| Token storage     | Cloudflare KV (AUTH_KV)     | Cloudflare-recommended for session data |
| Token lifetimes   | 15min access / 7d refresh   | Balance of security and UX              |
| Seed admin        | zoe@marsico.org             | Bootstrap user for initial setup        |

## Auth Flow

1. Frontend redirects to `GET /auth/google`
2. API generates PKCE code_verifier (S256) + state, stores in KV (5min TTL), redirects to Google consent screen
3. Google redirects to `GET /auth/callback`
4. API exchanges code using PKCE verifier, validates email is in allowlist AND user exists in DB
5. On success: issues JWT access token (15min) in `__Host-auth` httpOnly cookie + refresh token (7d) as signed cookie in KV
6. `POST /auth/refresh` — validates refresh token from KV, issues new access + refresh pair (rotation, old token invalidated)
7. `POST /auth/logout` — deletes refresh token from KV, clears cookies
8. `GET /auth/me` — returns current user from JWT payload

## Security Measures

### Cookie Configuration

- `__Host-` prefix: enforces Secure, no Domain attribute, Path=/
- `httpOnly: true`: inaccessible to JavaScript
- `secure: true`: HTTPS only (except localhost dev)
- `sameSite: 'Lax'`: prevents CSRF on cross-origin POST
- Refresh token uses Hono `setSignedCookie` (HMAC SHA-256 integrity)

### CSRF Protection

- Hono `csrf()` middleware on all mutating routes
- Validates both `Origin` and `Sec-Fetch-Site` headers
- Origin allowlist: production domain + localhost:5173

### Token Security

- JWT signed with HMAC SHA-256 via `crypto.subtle` (Web Crypto API)
- All IDs generated with `crypto.randomUUID()` (cryptographically secure)
- All HMAC verification uses `crypto.subtle.verify()` (timing-attack resistant)
- Refresh token rotation: old token invalidated on use

### Access Control

- Email allowlist checked at OAuth callback (env var `ALLOWED_EMAILS`)
- User must exist in DB (admin-created) to complete login
- Role-based guards: `requireRole('admin')`, `requireRole('editor')`
- Audit log entry on every login

## JWT Structure

```json
{
  "sub": "<userId>",
  "email": "<user email>",
  "role": "admin | editor | viewer",
  "iat": 1234567890,
  "exp": 1234568790
}
```

## Database

### No Schema Changes

Existing `users` table is sufficient:

- `id` (text, PK) — `crypto.randomUUID()`
- `email` (text, unique)
- `name` (text)
- `role` (enum: admin, editor, viewer)
- `createdAt`, `updatedAt` (ISO 8601 text)

### Migrations

- Generate initial migration from existing Drizzle schema via `drizzle-kit generate`
- Apply with `wrangler d1 migrations apply`

### Seed Data

- Admin user: zoe@marsico.org with role `admin`

## Wrangler Configuration

```toml
name = "legalcode-api"
main = "src/index.ts"
compatibility_date = "2026-03-05"
compatibility_flags = ["nodejs_compat"]

[vars]
ALLOWED_EMAILS = "zoe@marsico.org"

[[d1_databases]]
binding = "DB"
database_name = "legalcode-db"
database_id = "local"
migrations_dir = "migrations"

[[kv_namespaces]]
binding = "AUTH_KV"
id = "local"
preview_id = "local"
```

## API Routes

### Public

- `GET /health` — health check
- `GET /auth/google` — initiate OAuth flow
- `GET /auth/callback` — OAuth callback

### Authenticated

- `POST /auth/refresh` — refresh access token
- `POST /auth/logout` — end session
- `GET /auth/me` — current user info

### Admin Only

- `GET /admin/users` — list all users
- `POST /admin/users` — create user (email, name, role)
- `PATCH /admin/users/:id` — update user role
- `DELETE /admin/users/:id` — deactivate user

## New Files

```
packages/api/
  wrangler.toml
  drizzle.config.ts
  migrations/
    0001_initial.sql
  src/
    types/env.ts              # Env + Variables types (replace inline)
    middleware/auth.ts         # JWT verification via Hono jwt({ cookie })
    middleware/role.ts         # Role-based access guards
    routes/auth.ts             # OAuth flow + refresh + logout + me
    routes/admin.ts            # User CRUD (admin only)
    services/auth.ts           # PKCE, Google OAuth, JWT issue/verify
    services/user.ts           # User CRUD operations

packages/shared/src/
  schemas/auth.ts              # Login response, user creation Zod schemas
  types/auth.ts                # Auth-related TypeScript types

packages/web/src/
  services/auth.ts             # API calls (redirect, logout, me, refresh)
  hooks/useAuth.ts             # TanStack Query hook for auth state
  components/AuthGuard.tsx     # Redirect unauthenticated users to login
  pages/LoginPage.tsx          # Login page with Google sign-in button
```

## Technology Notes

- Hono built-in `jwt()` middleware reads JWT directly from `cookie` option
- Hono `csrf()` middleware for CSRF protection
- Hono `setCookie` / `setSignedCookie` / `getCookie` / `getSignedCookie` for cookie management
- Drizzle `d1-http` driver for drizzle-kit, standard D1 binding in Worker
- All crypto operations use Web Crypto API (native to Cloudflare Workers)
