# Phase 1: Auth + DB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Google OAuth 2.0 PKCE authentication with JWT sessions, admin-provisioned users, and Cloudflare D1/KV integration.

**Architecture:** Server-side OAuth flow using Hono on Cloudflare Workers. JWT access tokens in \_\_Host- httpOnly cookies, refresh tokens in KV with signed cookies. PKCE state in KV. Admin pre-creates users before they can log in. CSRF protection via Hono middleware.

**Tech Stack:** Hono v4, Cloudflare Workers (D1, KV, Web Crypto API), Drizzle ORM, Zod, Vitest, MSW, React 19, TanStack Query v5, MUI v7

---

## Prerequisites

Before starting, ensure dependencies are installed and the dev environment works:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
```

All must pass green before proceeding.

---

### Task 1: Shared Auth Types and Schemas

**Files:**

- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Modify: `packages/shared/src/types/index.ts` (line 1 — add re-export)
- Modify: `packages/shared/src/schemas/index.ts` (line 1 — add re-export)
- Create: `packages/shared/tests/auth-schemas.test.ts`

**Step 1: Write the failing tests**

Create `packages/shared/tests/auth-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserRoleSchema,
  loginResponseSchema,
} from '../src/schemas/auth.js';

describe('createUserSchema', () => {
  it('validates a valid user creation input', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: 'Alice Smith',
      role: 'editor',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      name: 'Alice',
      role: 'editor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: '',
      role: 'editor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'editor', 'viewer']) {
      const result = createUserSchema.safeParse({
        email: `user@acasus.com`,
        name: 'User',
        role,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateUserRoleSchema', () => {
  it('validates a valid role update', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'admin' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'superadmin' });
    expect(result.success).toBe(false);
  });
});

describe('loginResponseSchema', () => {
  it('validates a successful login response', () => {
    const result = loginResponseSchema.safeParse({
      user: {
        id: 'abc-123',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing user fields', () => {
    const result = loginResponseSchema.safeParse({
      user: { id: 'abc-123', email: 'alice@acasus.com' },
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/shared/tests/auth-schemas.test.ts`
Expected: FAIL — cannot resolve `'../src/schemas/auth.js'`

**Step 3: Write the types**

Create `packages/shared/src/types/auth.ts`:

```ts
import type { Role } from './index.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
}

export interface UpdateUserRoleInput {
  role: Role;
}
```

**Step 4: Write the schemas**

Create `packages/shared/src/schemas/auth.ts`:

```ts
import { z } from 'zod';
import { roleSchema } from './index.js';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: roleSchema,
});

export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

export const loginResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    role: roleSchema,
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
```

**Step 5: Add re-exports**

Modify `packages/shared/src/types/index.ts` — add at the end:

```ts
export * from './auth.js';
```

Modify `packages/shared/src/schemas/index.ts` — add at the end:

```ts
export * from './auth.js';
```

**Step 6: Run tests to verify they pass**

Run: `pnpm vitest run packages/shared/tests/auth-schemas.test.ts`
Expected: All PASS

**Step 7: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 8: Commit**

```bash
git add packages/shared/src/types/auth.ts packages/shared/src/schemas/auth.ts packages/shared/src/types/index.ts packages/shared/src/schemas/index.ts packages/shared/tests/auth-schemas.test.ts
git commit -m "feat(shared): add auth types and Zod schemas for user management"
```

---

### Task 2: Wrangler Configuration and D1 Migration

**Files:**

- Modify: `wrangler.jsonc` (full rewrite)
- Modify: `drizzle.config.ts` (add migrations_dir)
- Create: `packages/api/src/db/seed.sql`

**Step 1: Update wrangler.jsonc**

Replace contents of `wrangler.jsonc`:

```jsonc
{
  "name": "legalcode-api",
  "main": "packages/api/src/index.ts",
  "compatibility_date": "2026-03-05",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "legalcode-db",
      "database_id": "placeholder-id",
      "migrations_dir": "drizzle",
    },
  ],
  "kv_namespaces": [
    {
      "binding": "AUTH_KV",
      "id": "placeholder-id",
      "preview_id": "placeholder-preview-id",
    },
  ],
  "vars": {
    "ALLOWED_EMAILS": "zoe@marsico.org",
    "GOOGLE_CLIENT_ID": "",
    "GOOGLE_CLIENT_SECRET": "",
    "JWT_SECRET": "",
  },
}
```

**Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: Migration SQL file created in `drizzle/` directory

**Step 3: Create seed SQL**

Create `packages/api/src/db/seed.sql`:

```sql
INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'seed-admin-001',
  'zoe@marsico.org',
  'Zoe Marsico',
  'admin',
  datetime('now'),
  datetime('now')
);
```

**Step 4: Apply migration locally and seed**

Run: `pnpm db:migrate && pnpm db:seed`
Expected: Migration applied, seed data inserted

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint`
Expected: All PASS

**Step 6: Commit**

```bash
git add wrangler.jsonc drizzle.config.ts drizzle/ packages/api/src/db/seed.sql
git commit -m "feat(api): configure wrangler D1/KV bindings, generate migration, add seed"
```

---

### Task 3: API Env Types

**Files:**

- Create: `packages/api/src/types/env.ts`
- Modify: `packages/api/src/index.ts` (lines 4-10 — replace inline Env)
- Create: `packages/api/tests/env.test.ts`

**Step 1: Write the failing test**

Create `packages/api/tests/env.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { AppEnv, AuthUser } from '../src/types/env.js';

describe('AppEnv types', () => {
  it('has required bindings', () => {
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('DB');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('AUTH_KV');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('JWT_SECRET');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('GOOGLE_CLIENT_ID');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('GOOGLE_CLIENT_SECRET');
    expectTypeOf<AppEnv['Bindings']>().toHaveProperty('ALLOWED_EMAILS');
  });

  it('has user variable', () => {
    expectTypeOf<AppEnv['Variables']>().toHaveProperty('user');
  });

  it('AuthUser has required fields', () => {
    expectTypeOf<AuthUser>().toHaveProperty('id');
    expectTypeOf<AuthUser>().toHaveProperty('email');
    expectTypeOf<AuthUser>().toHaveProperty('role');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/env.test.ts`
Expected: FAIL — cannot resolve `'../src/types/env.js'`

**Step 3: Write the implementation**

Create `packages/api/src/types/env.ts`:

```ts
import type { Role } from '@legalcode/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AppEnv {
  Bindings: {
    DB: D1Database;
    AUTH_KV: KVNamespace;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ALLOWED_EMAILS: string;
  };
  Variables: {
    user: AuthUser;
  };
}
```

**Step 4: Update packages/api/src/index.ts**

Replace the entire file with:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types/env.js';

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/env.test.ts`
Expected: All PASS

**Step 6: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 7: Commit**

```bash
git add packages/api/src/types/env.ts packages/api/src/index.ts packages/api/tests/env.test.ts
git commit -m "feat(api): extract AppEnv types with D1, KV, and auth bindings"
```

---

### Task 4: Auth Service — PKCE and JWT

**Files:**

- Create: `packages/api/src/services/auth.ts`
- Create: `packages/api/tests/services/auth.test.ts`

**Step 1: Write the failing tests**

Create `packages/api/tests/services/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePKCE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  issueJWT,
  verifyJWT,
} from '../../src/services/auth.js';

describe('generatePKCE', () => {
  it('returns a code_verifier and code_challenge', async () => {
    const result = await generatePKCE();
    expect(result.codeVerifier).toBeDefined();
    expect(result.codeChallenge).toBeDefined();
    expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(result.codeChallenge.length).toBeGreaterThan(0);
  });

  it('generates different values each time', async () => {
    const a = await generatePKCE();
    const b = await generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe('buildGoogleAuthUrl', () => {
  it('returns a URL with required OAuth parameters', () => {
    const url = buildGoogleAuthUrl({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:8787/auth/callback',
      state: 'random-state',
      codeChallenge: 'test-challenge',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:8787/auth/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toContain('email');
    expect(parsed.searchParams.get('scope')).toContain('profile');
    expect(parsed.searchParams.get('state')).toBe('random-state');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('access_type')).toBe('online');
    expect(parsed.searchParams.get('prompt')).toBe('select_account');
  });
});

describe('issueJWT and verifyJWT', () => {
  const secret = 'test-secret-that-is-long-enough-for-hmac-256';

  it('issues a JWT that can be verified', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      900,
    );
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyJWT(token, secret);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('test@acasus.com');
    expect(payload.role).toBe('editor');
  });

  it('rejects a tampered token', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      900,
    );
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyJWT(tampered, secret)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      -1, // already expired
    );
    await expect(verifyJWT(token, secret)).rejects.toThrow();
  });
});

describe('exchangeCodeForTokens', () => {
  it('calls Google token endpoint with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          token_type: 'Bearer',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await exchangeCodeForTokens({
      code: 'auth-code',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost:8787/auth/callback',
      codeVerifier: 'verifier',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(options.method).toBe('POST');
    expect(result.access_token).toBe('mock-access-token');

    vi.unstubAllGlobals();
  });

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Request', { status: 400 })));

    await expect(
      exchangeCodeForTokens({
        code: 'bad-code',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'http://localhost:8787/auth/callback',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow();

    vi.unstubAllGlobals();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/services/auth.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/api/src/services/auth.ts`:

```ts
import { sign, verify, decode } from 'hono/utils/jwt';
import type { Role } from '@legalcode/shared';

// --- PKCE ---

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const codeVerifier = base64urlEncode(randomBytes.buffer as ArrayBuffer);

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
  const codeChallenge = base64urlEncode(digest);

  return { codeVerifier, codeChallenge };
}

// --- Google OAuth URL ---

interface GoogleAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export function buildGoogleAuthUrl(params: GoogleAuthUrlParams): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

// --- Token Exchange ---

interface ExchangeParams {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

export async function exchangeCodeForTokens(params: ExchangeParams): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status.toString()}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

// --- Google User Info ---

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo failed: ${response.status.toString()}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

// --- JWT ---

interface JWTPayload {
  sub: string;
  email: string;
  role: Role;
}

export async function issueJWT(
  payload: JWTPayload,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ ...payload, iat: now, exp: now + expiresInSeconds }, secret, 'HS256');
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload & { iat: number; exp: number }> {
  const payload = await verify(token, secret, 'HS256');
  return payload as JWTPayload & { iat: number; exp: number };
}

// --- Helpers ---

export function isEmailAllowed(email: string, allowedEmails: string): boolean {
  const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/services/auth.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/services/auth.ts packages/api/tests/services/auth.test.ts
git commit -m "feat(api): add auth service — PKCE, Google OAuth, JWT issue/verify"
```

---

### Task 5: User Service

**Files:**

- Create: `packages/api/src/services/user.ts`
- Create: `packages/api/tests/services/user.test.ts`

**Step 1: Write the failing tests**

Create `packages/api/tests/services/user.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../src/services/user.js';

// Mock D1 database
function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };
  const mockDb = {
    prepare: vi.fn().mockReturnValue(mockStatement),
  };
  return { db: mockDb as unknown as D1Database, stmt: mockStatement };
}

describe('UserService', () => {
  let db: D1Database;
  let stmt: ReturnType<typeof createMockDb>['stmt'];
  let service: UserService;

  beforeEach(() => {
    const mock = createMockDb();
    db = mock.db;
    stmt = mock.stmt;
    service = new UserService(db);
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      stmt.first.mockResolvedValue(user);

      const result = await service.findByEmail('alice@acasus.com');
      expect(result).toEqual(user);
      expect(stmt.bind).toHaveBeenCalledWith('alice@acasus.com');
    });

    it('returns null when not found', async () => {
      stmt.first.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@acasus.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = {
        id: '1',
        email: 'alice@acasus.com',
        name: 'Alice',
        role: 'editor',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      stmt.first.mockResolvedValue(user);

      const result = await service.findById('1');
      expect(result).toEqual(user);
      expect(stmt.bind).toHaveBeenCalledWith('1');
    });
  });

  describe('listAll', () => {
    it('returns all users', async () => {
      const users = [
        {
          id: '1',
          email: 'alice@acasus.com',
          name: 'Alice',
          role: 'editor',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];
      stmt.all.mockResolvedValue({ results: users });

      const result = await service.listAll();
      expect(result).toEqual(users);
    });
  });

  describe('create', () => {
    it('creates a user and returns it', async () => {
      stmt.run.mockResolvedValue({ success: true });

      const result = await service.create({
        email: 'bob@acasus.com',
        name: 'Bob',
        role: 'viewer',
      });

      expect(result.email).toBe('bob@acasus.com');
      expect(result.name).toBe('Bob');
      expect(result.role).toBe('viewer');
      expect(result.id).toBeDefined();
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      stmt.run.mockResolvedValue({ success: true });

      await service.updateRole('1', 'admin');
      expect(stmt.bind).toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('deletes user by id', async () => {
      stmt.run.mockResolvedValue({ success: true });

      await service.deactivate('1');
      expect(stmt.bind).toHaveBeenCalledWith('1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/services/user.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/api/src/services/user.ts`:

```ts
import type { Role } from '@legalcode/shared';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
}

export class UserService {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  }

  async findById(id: string): Promise<UserRow | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  }

  async listAll(): Promise<UserRow[]> {
    const result = await this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all<UserRow>();
    return result.results;
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        'INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, input.email, input.name, input.role, now, now)
      .run();

    return {
      id,
      email: input.email,
      name: input.name,
      role: input.role,
      created_at: now,
      updated_at: now,
    };
  }

  async updateRole(id: string, role: Role): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, now, id)
      .run();
  }

  async deactivate(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/services/user.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/services/user.ts packages/api/tests/services/user.test.ts
git commit -m "feat(api): add UserService with D1 CRUD operations"
```

---

### Task 6: Auth Middleware

**Files:**

- Create: `packages/api/src/middleware/auth.ts`
- Create: `packages/api/tests/middleware/auth.test.ts`

**Step 1: Write the failing tests**

Create `packages/api/tests/middleware/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../src/middleware/auth.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

function createTestApp() {
  const app = new Hono<AppEnv>();

  // Inject env bindings for tests
  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- test mock
    (c.env as any).JWT_SECRET = JWT_SECRET;
    await next();
  });

  return app;
}

describe('authMiddleware', () => {
  it('returns 401 when no cookie present', async () => {
    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => c.json({ ok: true }));

    const res = await app.request('/protected/data');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid JWT', async () => {
    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => c.json({ ok: true }));

    const res = await app.request('/protected/data', {
      headers: { Cookie: '__Host-auth=invalid.jwt.token' },
    });
    expect(res.status).toBe(401);
  });

  it('sets user on context for valid JWT', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );

    const app = createTestApp();
    app.use('/protected/*', authMiddleware);
    app.get('/protected/data', (c) => {
      const user = c.get('user');
      return c.json({ id: user.id, email: user.email, role: user.role });
    });

    const res = await app.request('/protected/data', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; email: string; role: string };
    expect(body.id).toBe('user-1');
    expect(body.email).toBe('alice@acasus.com');
    expect(body.role).toBe('editor');
  });
});

describe('requireRole', () => {
  it('allows access when user has required role', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'admin@acasus.com', role: 'admin' },
      JWT_SECRET,
      900,
    );

    const app = createTestApp();
    app.use('/admin/*', authMiddleware);
    app.use('/admin/*', requireRole('admin'));
    app.get('/admin/users', (c) => c.json({ ok: true }));

    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('returns 403 when user lacks required role', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'viewer@acasus.com', role: 'viewer' },
      JWT_SECRET,
      900,
    );

    const app = createTestApp();
    app.use('/admin/*', authMiddleware);
    app.use('/admin/*', requireRole('admin'));
    app.get('/admin/users', (c) => c.json({ ok: true }));

    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/middleware/auth.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/api/src/middleware/auth.ts`:

```ts
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env.js';
import { verifyJWT } from '../services/auth.js';
import type { Role } from '@legalcode/shared';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, '__Host-auth');

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/middleware/auth.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/middleware/auth.ts packages/api/tests/middleware/auth.test.ts
git commit -m "feat(api): add auth middleware with JWT cookie verification and role guards"
```

---

### Task 7: Auth Routes (OAuth Flow)

**Files:**

- Create: `packages/api/src/routes/auth.ts`
- Create: `packages/api/tests/routes/auth.test.ts`
- Modify: `packages/api/src/index.ts` (add route mounting + CSRF)

**Step 1: Write the failing tests**

Create `packages/api/tests/routes/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../../src/routes/auth.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT, generateRefreshToken } from '../../src/services/auth.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

function createMockKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    _store: store,
  } as unknown as KVNamespace;
}

function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _stmt: mockStatement,
  } as unknown as D1Database & { _stmt: typeof mockStatement };
}

function createTestApp() {
  const kv = createMockKv();
  const db = createMockDb();

  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- test mock
    (c.env as any).JWT_SECRET = JWT_SECRET;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).AUTH_KV = kv;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).DB = db;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).GOOGLE_CLIENT_ID = 'test-client-id';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).GOOGLE_CLIENT_SECRET = 'test-client-secret';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).ALLOWED_EMAILS = 'alice@acasus.com,zoe@marsico.org';
    await next();
  });
  app.route('/auth', authRoutes);

  return { app, kv, db };
}

describe('GET /auth/google', () => {
  it('redirects to Google OAuth with PKCE parameters', async () => {
    const { app } = createTestApp();
    const res = await app.request('/auth/google');

    expect(res.status).toBe(302);
    const location = res.headers.get('Location');
    expect(location).toBeDefined();
    const url = new URL(location!);
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeDefined();
  });

  it('stores PKCE state in KV', async () => {
    const { app, kv } = createTestApp();
    await app.request('/auth/google');
    expect(kv.put).toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  it('returns 401 without auth cookie', async () => {
    const { app } = createTestApp();
    // Mount auth middleware for /auth/me manually in the route file
    const res = await app.request('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid auth cookie', async () => {
    const { app } = createTestApp();
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );

    const res = await app.request('/auth/me', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string; role: string } };
    expect(body.user.email).toBe('alice@acasus.com');
  });
});

describe('POST /auth/logout', () => {
  it('clears auth cookies', async () => {
    const { app } = createTestApp();
    const token = await issueJWT(
      { sub: 'user-1', email: 'alice@acasus.com', role: 'editor' },
      JWT_SECRET,
      900,
    );

    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain('__Host-auth=');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/routes/auth.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/api/src/routes/auth.ts`:

```ts
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from '../types/env.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  generatePKCE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  issueJWT,
  isEmailAllowed,
  generateRefreshToken,
} from '../services/auth.js';
import { UserService } from '../services/user.js';

const ACCESS_TOKEN_TTL = 900; // 15 minutes
const REFRESH_TOKEN_TTL = 604800; // 7 days
const PKCE_STATE_TTL = 300; // 5 minutes

export const authRoutes = new Hono<AppEnv>();

// Initiate Google OAuth
authRoutes.get('/google', async (c) => {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = crypto.randomUUID();

  await c.env.AUTH_KV.put(`pkce:${state}`, JSON.stringify({ codeVerifier }), {
    expirationTtl: PKCE_STATE_TTL,
  });

  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const url = buildGoogleAuthUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    codeChallenge,
  });

  return c.redirect(url);
});

// OAuth callback
authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error ?? !code ?? !state) {
    return c.json({ error: 'OAuth authorization failed' }, 400);
  }

  // Retrieve and delete PKCE state
  const pkceData = await c.env.AUTH_KV.get(`pkce:${state!}`);
  if (!pkceData) {
    return c.json({ error: 'Invalid or expired state' }, 400);
  }
  await c.env.AUTH_KV.delete(`pkce:${state!}`);

  const { codeVerifier } = JSON.parse(pkceData) as { codeVerifier: string };

  // Exchange code for tokens
  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const tokens = await exchangeCodeForTokens({
    code: code!,
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
    codeVerifier,
  });

  // Get user info from Google
  const googleUser = await fetchGoogleUserInfo(tokens.access_token);

  // Check email allowlist
  if (!isEmailAllowed(googleUser.email, c.env.ALLOWED_EMAILS)) {
    return c.json({ error: 'Email not authorized' }, 403);
  }

  // Check user exists in DB
  const userService = new UserService(c.env.DB);
  const user = await userService.findByEmail(googleUser.email);
  if (!user) {
    return c.json({ error: 'User not provisioned. Contact an admin.' }, 403);
  }

  // Issue JWT access token
  const accessToken = await issueJWT(
    { sub: user.id, email: user.email, role: user.role },
    c.env.JWT_SECRET,
    ACCESS_TOKEN_TTL,
  );

  // Issue refresh token
  const refreshToken = generateRefreshToken();
  await c.env.AUTH_KV.put(
    `refresh:${refreshToken}`,
    JSON.stringify({ userId: user.id, email: user.email, role: user.role }),
    { expirationTtl: REFRESH_TOKEN_TTL },
  );

  // Set cookies
  setCookie(c, '__Host-auth', accessToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_TTL,
  });

  setCookie(c, '__Host-refresh', refreshToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: REFRESH_TOKEN_TTL,
  });

  // Redirect to frontend
  return c.redirect('http://localhost:5173');
});

// Refresh access token
authRoutes.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, '__Host-refresh');
  if (!refreshToken) {
    return c.json({ error: 'No refresh token' }, 401);
  }

  const data = await c.env.AUTH_KV.get(`refresh:${refreshToken}`);
  if (!data) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  // Delete old refresh token (rotation)
  await c.env.AUTH_KV.delete(`refresh:${refreshToken}`);

  const { userId, email, role } = JSON.parse(data) as {
    userId: string;
    email: string;
    role: string;
  };

  // Issue new tokens
  const newAccessToken = await issueJWT(
    { sub: userId, email, role: role as 'admin' | 'editor' | 'viewer' },
    c.env.JWT_SECRET,
    ACCESS_TOKEN_TTL,
  );

  const newRefreshToken = generateRefreshToken();
  await c.env.AUTH_KV.put(`refresh:${newRefreshToken}`, JSON.stringify({ userId, email, role }), {
    expirationTtl: REFRESH_TOKEN_TTL,
  });

  setCookie(c, '__Host-auth', newAccessToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_TTL,
  });

  setCookie(c, '__Host-refresh', newRefreshToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: REFRESH_TOKEN_TTL,
  });

  return c.json({ ok: true });
});

// Get current user
authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Logout
authRoutes.post('/logout', authMiddleware, async (c) => {
  const refreshToken = getCookie(c, '__Host-refresh');
  if (refreshToken) {
    await c.env.AUTH_KV.delete(`refresh:${refreshToken}`);
  }

  deleteCookie(c, '__Host-auth', { path: '/' });
  deleteCookie(c, '__Host-refresh', { path: '/' });

  return c.json({ ok: true });
});
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/routes/auth.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/routes/auth.ts packages/api/tests/routes/auth.test.ts
git commit -m "feat(api): add OAuth routes — google login, callback, refresh, logout, me"
```

---

### Task 8: Admin Routes (User Management)

**Files:**

- Create: `packages/api/src/routes/admin.ts`
- Create: `packages/api/tests/routes/admin.test.ts`

**Step 1: Write the failing tests**

Create `packages/api/tests/routes/admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { adminRoutes } from '../../src/routes/admin.js';
import type { AppEnv } from '../../src/types/env.js';
import { issueJWT } from '../../src/services/auth.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-testing';

function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _stmt: mockStatement,
  };
}

function createTestApp() {
  const db = createMockDb();

  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- test mock
    (c.env as any).JWT_SECRET = JWT_SECRET;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (c.env as any).DB = db;
    await next();
  });
  app.route('/admin', adminRoutes);

  return { app, db };
}

async function adminToken() {
  return issueJWT({ sub: 'admin-1', email: 'admin@acasus.com', role: 'admin' }, JWT_SECRET, 900);
}

async function viewerToken() {
  return issueJWT({ sub: 'viewer-1', email: 'viewer@acasus.com', role: 'viewer' }, JWT_SECRET, 900);
}

describe('GET /admin/users', () => {
  it('returns 401 without auth', async () => {
    const { app } = createTestApp();
    const res = await app.request('/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const { app } = createTestApp();
    const token = await viewerToken();
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns users list for admin', async () => {
    const { app } = createTestApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /admin/users', () => {
  it('creates a user when admin', async () => {
    const { app } = createTestApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'new@acasus.com', name: 'New User', role: 'editor' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { email: string } };
    expect(body.user.email).toBe('new@acasus.com');
  });

  it('returns 400 for invalid input', async () => {
    const { app } = createTestApp();
    const token = await adminToken();
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'invalid', name: '', role: 'superadmin' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /admin/users/:id', () => {
  it('updates role when admin', async () => {
    const { app } = createTestApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/user-1', {
      method: 'PATCH',
      headers: {
        Cookie: `__Host-auth=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'admin' }),
    });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /admin/users/:id', () => {
  it('deletes user when admin', async () => {
    const { app } = createTestApp();
    const token = await adminToken();
    const res = await app.request('/admin/users/user-1', {
      method: 'DELETE',
      headers: { Cookie: `__Host-auth=${token}` },
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/routes/admin.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/api/src/routes/admin.ts`:

```ts
import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { UserService } from '../services/user.js';
import { createUserSchema, updateUserRoleSchema } from '@legalcode/shared';

export const adminRoutes = new Hono<AppEnv>();

// All admin routes require admin role
adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', requireRole('admin'));

// List users
adminRoutes.get('/users', async (c) => {
  const service = new UserService(c.env.DB);
  const users = await service.listAll();
  return c.json({ users });
});

// Create user
adminRoutes.post('/users', async (c) => {
  const body: unknown = await c.req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
  }

  const service = new UserService(c.env.DB);
  const user = await service.create(parsed.data);
  return c.json({ user }, 201);
});

// Update user role
adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body: unknown = await c.req.json();
  const parsed = updateUserRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
  }

  const service = new UserService(c.env.DB);
  await service.updateRole(id, parsed.data.role);
  return c.json({ ok: true });
});

// Delete user
adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const service = new UserService(c.env.DB);
  await service.deactivate(id);
  return c.json({ ok: true });
});
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/routes/admin.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/routes/admin.ts packages/api/tests/routes/admin.test.ts
git commit -m "feat(api): add admin routes for user CRUD with role-based access"
```

---

### Task 9: Wire Routes into Main App + CSRF

**Files:**

- Modify: `packages/api/src/index.ts` (add route mounting, CSRF)
- Create: `packages/api/tests/app.test.ts`

**Step 1: Write the failing test**

Create `packages/api/tests/app.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import app from '../src/index.js';

describe('app', () => {
  it('responds to /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('mounts auth routes at /auth', async () => {
    const res = await app.request('/auth/google', undefined, {
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      ALLOWED_EMAILS: 'test@test.com',
      AUTH_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(),
        }),
      },
    });
    // Should redirect to Google (302)
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('accounts.google.com');
  });

  it('mounts admin routes at /admin', async () => {
    const res = await app.request('/admin/users');
    // Should return 401 (no auth)
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/api/tests/app.test.ts`
Expected: FAIL — `/auth/google` returns 404 (routes not mounted)

**Step 3: Update packages/api/src/index.ts**

Replace the entire file:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import type { AppEnv } from './types/env.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.use(
  '*',
  csrf({
    origin: ['http://localhost:5173'],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);

export default app;
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/api/tests/app.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/api/src/index.ts packages/api/tests/app.test.ts
git commit -m "feat(api): wire auth + admin routes, add CSRF middleware"
```

---

### Task 10: Frontend Auth Service

**Files:**

- Create: `packages/web/src/services/auth.ts`
- Create: `packages/web/tests/services/auth.test.ts`

**Step 1: Write the failing tests**

Create `packages/web/tests/services/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../src/services/auth.js';

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getLoginUrl', () => {
    it('returns the Google OAuth initiation URL', () => {
      expect(authService.getLoginUrl()).toBe('/api/auth/google');
    });
  });

  describe('getCurrentUser', () => {
    it('returns user data on success', async () => {
      const mockUser = {
        user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' },
      };
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockUser), { status: 200 }));

      const result = await authService.getCurrentUser();
      expect(result).toEqual(mockUser.user);
      expect(fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
    });

    it('returns null on 401', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('calls logout endpoint', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      await authService.logout();
      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    });
  });

  describe('refresh', () => {
    it('calls refresh endpoint', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const result = await authService.refresh();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
    });

    it('returns false on failure', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      const result = await authService.refresh();
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/web/tests/services/auth.test.ts`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/web/src/services/auth.ts`:

```ts
import type { AuthUser } from '@legalcode/shared';

interface MeResponse {
  user: AuthUser;
}

export const authService = {
  getLoginUrl(): string {
    return '/api/auth/google';
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as MeResponse;
    return data.user;
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  async refresh(): Promise<boolean> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/web/tests/services/auth.test.ts`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/web/src/services/auth.ts packages/web/tests/services/auth.test.ts
git commit -m "feat(web): add auth service for login, logout, refresh, and user fetch"
```

---

### Task 11: Frontend useAuth Hook

**Files:**

- Create: `packages/web/src/hooks/useAuth.ts`
- Create: `packages/web/tests/hooks/useAuth.test.tsx`

**Step 1: Write the failing tests**

Create `packages/web/tests/hooks/useAuth.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuth } from '../../src/hooks/useAuth.js';
import { authService } from '../../src/services/auth.js';

vi.mock('../../src/services/auth.js', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getLoginUrl: vi.fn().mockReturnValue('/api/auth/google'),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuth', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: '1',
      email: 'alice@acasus.com',
      name: 'Alice',
      role: 'editor',
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.email).toBe('alice@acasus.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null when not authenticated', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('provides login URL', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.loginUrl).toBe('/api/auth/google');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/web/tests/hooks/useAuth.test.tsx`
Expected: FAIL — cannot resolve module

**Step 3: Write the implementation**

Create `packages/web/src/hooks/useAuth.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@legalcode/shared';
import { authService } from '../services/auth.js';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: user != null,
    loginUrl: authService.getLoginUrl(),
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/web/tests/hooks/useAuth.test.tsx`
Expected: All PASS

**Step 5: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/web/src/hooks/useAuth.ts packages/web/tests/hooks/useAuth.test.tsx
git commit -m "feat(web): add useAuth hook with TanStack Query"
```

---

### Task 12: LoginPage and AuthGuard Components

**Files:**

- Create: `packages/web/src/pages/LoginPage.tsx`
- Create: `packages/web/src/components/AuthGuard.tsx`
- Create: `packages/web/tests/pages/LoginPage.test.tsx`
- Create: `packages/web/tests/components/AuthGuard.test.tsx`

**Step 1: Write failing tests for LoginPage**

Create `packages/web/tests/pages/LoginPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { LoginPage } from '../../src/pages/LoginPage.js';

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    loginUrl: '/api/auth/google',
    logout: vi.fn(),
    isLoggingOut: false,
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  it('renders login heading', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: /legalcode/i })).toBeInTheDocument();
  });

  it('renders sign in link pointing to Google OAuth', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /sign in with google/i });
    expect(link).toHaveAttribute('href', '/api/auth/google');
  });
});
```

**Step 2: Write failing tests for AuthGuard**

Create `packages/web/tests/components/AuthGuard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { AuthGuard } from '../../src/components/AuthGuard.js';

const mockUseAuth = vi.fn();

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('AuthGuard', () => {
  it('shows loading indicator while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      loginUrl: '/api/auth/google',
      logout: vi.fn(),
      isLoggingOut: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' },
      isLoading: false,
      isAuthenticated: true,
      loginUrl: '/api/auth/google',
      logout: vi.fn(),
      isLoggingOut: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      loginUrl: '/api/auth/google',
      logout: vi.fn(),
      isLoggingOut: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // Should show login page or redirect indication
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm vitest run packages/web/tests/pages/LoginPage.test.tsx packages/web/tests/components/AuthGuard.test.tsx`
Expected: FAIL — cannot resolve modules

**Step 4: Write LoginPage**

Create `packages/web/src/pages/LoginPage.tsx`:

```tsx
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { useAuth } from '../hooks/useAuth.js';

export const LoginPage: React.FC = () => {
  const { loginUrl } = useAuth();

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={2} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            LegalCode
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Template Management System
          </Typography>
          <Button component="a" href={loginUrl} variant="contained" size="large" fullWidth>
            Sign in with Google
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};
```

**Step 5: Write AuthGuard**

Create `packages/web/src/components/AuthGuard.tsx`:

```tsx
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth.js';
import { LoginPage } from '../pages/LoginPage.js';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};
```

**Step 6: Run tests to verify they pass**

Run: `pnpm vitest run packages/web/tests/pages/LoginPage.test.tsx packages/web/tests/components/AuthGuard.test.tsx`
Expected: All PASS

**Step 7: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 8: Commit**

```bash
git add packages/web/src/pages/LoginPage.tsx packages/web/src/components/AuthGuard.tsx packages/web/tests/pages/LoginPage.test.tsx packages/web/tests/components/AuthGuard.test.tsx
git commit -m "feat(web): add LoginPage and AuthGuard components"
```

---

### Task 13: Wire AuthGuard into App + Update MSW Handlers

**Files:**

- Modify: `packages/web/src/App.tsx` (wrap with AuthGuard)
- Modify: `packages/web/src/mocks/handlers.ts` (add auth mock handlers)
- Create: `packages/web/tests/App.test.tsx`

**Step 1: Write failing test**

Create `packages/web/tests/App.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { server } from '../src/mocks/node.js';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('App', () => {
  it('shows login page when not authenticated', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
    });
  });

  it('shows main content when authenticated', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' },
        }),
      ),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LegalCode')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/web/tests/App.test.tsx`
Expected: FAIL — App doesn't use AuthGuard yet

**Step 3: Update MSW handlers**

Replace `packages/web/src/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('/api/auth/me', () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({ ok: true });
  }),
];
```

**Step 4: Update App.tsx**

Replace `packages/web/src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Typography, Container } from '@mui/material';
import { theme } from './theme/index.js';
import { AuthGuard } from './components/AuthGuard.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'offlineFirst' },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthGuard>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1">
              LegalCode
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Template Management System
            </Typography>
          </Container>
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/web/tests/App.test.tsx`
Expected: All PASS

**Step 6: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS

**Step 7: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/mocks/handlers.ts packages/web/tests/App.test.tsx
git commit -m "feat(web): wire AuthGuard into App, add auth mock handlers"
```

---

### Task 14: Initial Git Commit (if not already done)

Before any of the above tasks, if this is a fresh repo with no commits:

**Step 1: Create initial commit with scaffold**

```bash
git add .gitignore .husky/ .nvmrc .prettierignore .prettierrc CLAUDE.md docs/ drizzle.config.ts eslint.config.ts package.json packages/ playwright.config.ts pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vitest.config.ts vitest.setup.ts wrangler.jsonc
git commit -m "chore: initial scaffold — monorepo, strict TS, ESLint, Vitest, Playwright"
```

**Note:** This task should be done FIRST, before Task 1. The task numbering above represents logical dependency order for the auth feature, but this commit establishes the baseline.

---

## Execution Order

1. **Task 14** — Initial commit (baseline)
2. **Task 1** — Shared types and schemas
3. **Task 2** — Wrangler config and D1 migration
4. **Task 3** — API Env types
5. **Task 4** — Auth service (PKCE, JWT)
6. **Task 5** — User service
7. **Task 6** — Auth middleware
8. **Task 7** — Auth routes
9. **Task 8** — Admin routes
10. **Task 9** — Wire routes + CSRF
11. **Task 10** — Frontend auth service
12. **Task 11** — useAuth hook
13. **Task 12** — LoginPage + AuthGuard
14. **Task 13** — Wire into App

## Verification Checkpoint

After all tasks, run:

```bash
pnpm typecheck && pnpm lint && pnpm test:coverage
```

All must pass with 95%+ coverage on new code.
