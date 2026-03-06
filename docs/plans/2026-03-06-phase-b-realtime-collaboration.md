# Phase B: Real-time Collaborative Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google Docs-style real-time collaborative editing to the template editor using Yjs CRDT, Cloudflare Durable Objects, and y-prosemirror.

**Architecture:** A Durable Object per template hosts a Yjs Y.Doc in memory, syncing deltas to connected editors via WebSocket. y-prosemirror binds Yjs to Milkdown's ProseMirror layer. Checkpoints go to DO storage for crash recovery; versions go to D1 on meaningful events only (explicit save, last-editor disconnect).

**Tech Stack:** Yjs, y-prosemirror, y-protocols, y-indexeddb, lib0, Cloudflare Durable Objects, Hono WebSocket routes

**Design Doc:** `docs/plans/2026-03-06-phase-b-realtime-collaboration-design.md`

---

### Task 1: Install Yjs Dependencies

**Files:**

- Modify: `packages/api/package.json`
- Modify: `packages/web/package.json`

**Step 1: Install backend dependencies**

```bash
cd /Users/zoemarsico/Documents/LegalCode
pnpm add --filter @legalcode/api yjs y-protocols lib0
```

These provide:

- `yjs` — CRDT Y.Doc for server-side document hosting
- `y-protocols` — sync and awareness protocol encoders/decoders
- `lib0` — binary encoding/decoding utilities used by Yjs

**Step 2: Install frontend dependencies**

```bash
pnpm add --filter @legalcode/web yjs y-prosemirror y-protocols y-indexeddb lib0
```

These provide:

- `y-prosemirror` — binds Yjs Y.Doc to ProseMirror editor state
- `y-indexeddb` — offline persistence for local Yjs state (crash recovery, offline editing)

**Step 3: Verify installation**

```bash
pnpm install
pnpm typecheck
```

Expected: No errors. Dependencies resolve correctly.

**Step 4: Commit**

```bash
git add packages/api/package.json packages/web/package.json pnpm-lock.yaml
git commit -m "feat: add Yjs dependencies for real-time collaboration"
```

---

### Task 2: Extract Shared Template Persistence Service

Extract D1 write operations from `packages/api/src/services/template.ts` into pure functions that both the template routes and the Durable Object can use, preventing circular imports.

**Files:**

- Create: `packages/api/src/services/template-persistence.ts`
- Create: `packages/api/src/services/__tests__/template-persistence.test.ts`
- Modify: `packages/api/src/services/template.ts`

**Step 1: Write the failing test**

Create `packages/api/src/services/__tests__/template-persistence.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistVersion, getLatestVersionContent } from '../template-persistence.js';

// Mock D1Database
function createMockDb() {
  const batchResults: unknown[] = [];
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    batch: vi.fn().mockResolvedValue(batchResults),
    run: vi.fn(),
  };
  return db;
}

describe('template-persistence', () => {
  describe('persistVersion', () => {
    it('creates a new version row and updates template currentVersion', async () => {
      const db = createMockDb();
      // Mock getting current version number
      db.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ currentVersion: 2 }),
        }),
      });
      db.batch.mockResolvedValue([{}, {}]);

      await persistVersion(db as unknown as D1Database, {
        templateId: 'tmpl-1',
        content: '# Hello',
        createdBy: 'user-1',
        changeSummary: 'Auto-saved on session close',
      });

      expect(db.batch).toHaveBeenCalledTimes(1);
    });

    it('throws if template not found', async () => {
      const db = createMockDb();
      db.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        persistVersion(db as unknown as D1Database, {
          templateId: 'tmpl-missing',
          content: '# Hello',
          createdBy: 'user-1',
          changeSummary: 'test',
        }),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('getLatestVersionContent', () => {
    it('returns content and metadata for the latest version', async () => {
      const db = createMockDb();
      db.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            content: '# Latest',
            version: 3,
            createdAt: '2026-01-01T00:00:00Z',
          }),
        }),
      });

      const result = await getLatestVersionContent(db as unknown as D1Database, 'tmpl-1');

      expect(result).toEqual({
        content: '# Latest',
        version: 3,
        createdAt: '2026-01-01T00:00:00Z',
      });
    });

    it('returns null if no versions exist', async () => {
      const db = createMockDb();
      db.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await getLatestVersionContent(db as unknown as D1Database, 'tmpl-1');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/api test -- src/services/__tests__/template-persistence.test.ts
```

Expected: FAIL — module `../template-persistence.js` not found.

**Step 3: Write the implementation**

Create `packages/api/src/services/template-persistence.ts`:

```typescript
/**
 * Pure persistence functions for template version management.
 * Shared between HTTP routes and Durable Objects.
 * No imports from route or DO layer — takes D1Database as parameter.
 */

export interface PersistVersionInput {
  templateId: string;
  content: string;
  createdBy: string;
  changeSummary: string;
}

export interface VersionContent {
  content: string;
  version: number;
  createdAt: string;
}

export async function persistVersion(
  db: D1Database,
  input: PersistVersionInput,
): Promise<{ version: number }> {
  const { templateId, content, createdBy, changeSummary } = input;

  // Get current version number
  const template = await db
    .prepare('SELECT currentVersion FROM templates WHERE id = ?')
    .bind(templateId)
    .first<{ currentVersion: number }>();

  if (!template) {
    throw new Error('Template not found');
  }

  const newVersion = template.currentVersion + 1;
  const now = new Date().toISOString();
  const versionId = crypto.randomUUID();

  await db.batch([
    db
      .prepare(
        'INSERT INTO template_versions (id, templateId, version, content, changeSummary, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(versionId, templateId, newVersion, content, changeSummary, createdBy, now),
    db
      .prepare('UPDATE templates SET currentVersion = ?, updatedAt = ? WHERE id = ?')
      .bind(newVersion, now, templateId),
  ]);

  return { version: newVersion };
}

export async function getLatestVersionContent(
  db: D1Database,
  templateId: string,
): Promise<VersionContent | null> {
  const row = await db
    .prepare(
      'SELECT content, version, createdAt FROM template_versions WHERE templateId = ? ORDER BY version DESC LIMIT 1',
    )
    .bind(templateId)
    .first<VersionContent>();

  return row ?? null;
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/api test -- src/services/__tests__/template-persistence.test.ts
```

Expected: PASS.

**Step 5: Refactor template.ts to use shared persistence**

In `packages/api/src/services/template.ts`, find the `updateTemplate` function's version-creation logic and import `persistVersion` from `./template-persistence.js`. Replace the inline batch that creates a version row and updates `currentVersion` with a call to `persistVersion(db, { templateId, content, createdBy, changeSummary })`. Keep the rest of `updateTemplate` (tag sync, audit log) as-is.

**Step 6: Run all tests to verify no regressions**

```bash
pnpm --filter @legalcode/api test
```

Expected: All existing tests still pass.

**Step 7: Commit**

```bash
git add packages/api/src/services/template-persistence.ts packages/api/src/services/__tests__/template-persistence.test.ts packages/api/src/services/template.ts
git commit -m "refactor: extract template persistence service for shared use by routes and DO"
```

---

### Task 3: Durable Object — TemplateSession

The core real-time collaboration server. Hosts a Yjs Y.Doc per template, syncs via WebSocket, manages awareness (cursors/presence), checkpoints to DO storage, and persists versions to D1.

**Files:**

- Create: `packages/api/src/durable-objects/template-session.ts`
- Create: `packages/api/src/durable-objects/__tests__/template-session.test.ts`

**Step 1: Write the failing test**

Create `packages/api/src/durable-objects/__tests__/template-session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll need to mock Yjs and related modules
vi.mock('yjs', () => {
  const Doc = vi.fn().mockImplementation(() => ({
    getText: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue(''),
      insert: vi.fn(),
    }),
    on: vi.fn(),
    destroy: vi.fn(),
  }));
  return {
    Doc,
    encodeStateAsUpdate: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    applyUpdate: vi.fn(),
    encodeStateVector: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
  };
});

vi.mock('y-protocols/sync', () => ({
  writeSyncStep1: vi.fn(),
  writeSyncStep2: vi.fn(),
  readSyncStep1: vi.fn(),
  readSyncStep2: vi.fn(),
  readSyncMessage: vi.fn().mockReturnValue(0),
}));

vi.mock('y-protocols/awareness', () => {
  const Awareness = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    destroy: vi.fn(),
    setLocalState: vi.fn(),
    getStates: vi.fn().mockReturnValue(new Map()),
  }));
  return {
    Awareness,
    encodeAwarenessUpdate: vi.fn().mockReturnValue(new Uint8Array([7, 8])),
    applyAwarenessUpdate: vi.fn(),
    removeAwarenessStates: vi.fn(),
  };
});

describe('TemplateSession Durable Object', () => {
  it('module can be imported', async () => {
    const mod = await import('../template-session.js');
    expect(mod.TemplateSession).toBeDefined();
  });

  describe('connection management', () => {
    it('accepts WebSocket connections with valid user headers', async () => {
      const mod = await import('../template-session.js');
      const mockState = {
        storage: {
          get: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
          deleteAll: vi.fn().mockResolvedValue(undefined),
          setAlarm: vi.fn().mockResolvedValue(undefined),
          getAlarm: vi.fn().mockResolvedValue(null),
        },
        id: { toString: () => 'do-id-1' },
      };
      const mockEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({
                content: '# Test',
                version: 1,
                createdAt: '2026-01-01T00:00:00Z',
              }),
            }),
          }),
        },
      };

      const session = new mod.TemplateSession(
        mockState as unknown as DurableObjectState,
        mockEnv as unknown as Record<string, unknown>,
      );

      // Create a WebSocket upgrade request with user headers
      const request = new Request('https://example.com/collaborate/tmpl-1', {
        headers: {
          Upgrade: 'websocket',
          'X-User-Id': 'user-1',
          'X-User-Email': 'test@example.com',
          'X-User-Role': 'editor',
          'X-Template-Id': 'tmpl-1',
        },
      });

      const response = await session.fetch(request);
      expect(response.status).toBe(101);
    });

    it('rejects connections beyond MAX_EDITORS (5)', async () => {
      const mod = await import('../template-session.js');
      const mockState = {
        storage: {
          get: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
          deleteAll: vi.fn().mockResolvedValue(undefined),
          setAlarm: vi.fn().mockResolvedValue(undefined),
          getAlarm: vi.fn().mockResolvedValue(null),
        },
        id: { toString: () => 'do-id-1' },
      };
      const mockEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({
                content: '# Test',
                version: 1,
                createdAt: '2026-01-01T00:00:00Z',
              }),
            }),
          }),
        },
      };

      const session = new mod.TemplateSession(
        mockState as unknown as DurableObjectState,
        mockEnv as unknown as Record<string, unknown>,
      );

      // Connect 5 editors
      for (let i = 0; i < 5; i++) {
        const req = new Request('https://example.com/collaborate/tmpl-1', {
          headers: {
            Upgrade: 'websocket',
            'X-User-Id': `user-${String(i)}`,
            'X-User-Email': `user${String(i)}@example.com`,
            'X-User-Role': 'editor',
            'X-Template-Id': 'tmpl-1',
          },
        });
        await session.fetch(req);
      }

      // 6th connection should be rejected
      const req = new Request('https://example.com/collaborate/tmpl-1', {
        headers: {
          Upgrade: 'websocket',
          'X-User-Id': 'user-6',
          'X-User-Email': 'user6@example.com',
          'X-User-Role': 'editor',
          'X-Template-Id': 'tmpl-1',
        },
      });
      const response = await session.fetch(req);
      expect(response.status).toBe(429);
      const body = (await response.json()) as { error: string; code: string };
      expect(body.code).toBe('MAX_EDITORS');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/api test -- src/durable-objects/__tests__/template-session.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the Durable Object implementation**

Create `packages/api/src/durable-objects/template-session.ts`:

```typescript
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { persistVersion, getLatestVersionContent } from '../services/template-persistence.js';

const MAX_EDITORS = 5;
const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const GRACE_PERIOD_MS = 30 * 1000; // 30 seconds

// Message types for WebSocket protocol
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

interface ConnectedUser {
  ws: WebSocket;
  userId: string;
  email: string;
  role: string;
}

export class TemplateSession {
  private state: DurableObjectState;
  private env: Record<string, unknown>;
  private ydoc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private connections: Map<WebSocket, ConnectedUser> = new Map();
  private templateId: string | null = null;
  private initialized = false;
  private lastCheckpoint: number = 0;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private lastUserId: string | null = null;

  constructor(state: DurableObjectState, env: Record<string, unknown>) {
    this.state = state;
    this.env = env;
  }

  private async initialize(templateId: string): Promise<void> {
    if (this.initialized) return;

    this.templateId = templateId;
    this.ydoc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);

    // Recovery: check DO storage for checkpoint
    const checkpoint = await this.state.storage.get<Uint8Array>('checkpoint');
    const checkpointTimestamp = await this.state.storage.get<number>('checkpointTimestamp');

    // Check D1 for latest version
    const db = this.env['DB'] as D1Database;
    const latestVersion = await getLatestVersionContent(db, templateId);

    if (checkpoint && checkpointTimestamp) {
      const d1Timestamp = latestVersion ? new Date(latestVersion.createdAt).getTime() : 0;

      if (checkpointTimestamp > d1Timestamp) {
        // DO checkpoint is newer — use it
        Y.applyUpdate(this.ydoc, new Uint8Array(checkpoint));
      } else if (latestVersion) {
        // D1 is newer — load from D1
        const text = this.ydoc.getText('content');
        text.insert(0, latestVersion.content);
      }
    } else if (latestVersion) {
      // No checkpoint — load from D1
      const text = this.ydoc.getText('content');
      text.insert(0, latestVersion.content);
    }

    // Listen for updates to broadcast
    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      this.broadcastUpdate(update, origin as WebSocket | null);
    });

    // Start periodic checkpointing
    this.checkpointTimer = setInterval(() => {
      void this.checkpoint();
    }, CHECKPOINT_INTERVAL_MS);

    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const templateId = request.headers.get('X-Template-Id') ?? url.pathname.split('/').pop() ?? '';
    const userId = request.headers.get('X-User-Id') ?? '';
    const email = request.headers.get('X-User-Email') ?? '';
    const role = request.headers.get('X-User-Role') ?? '';

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing user info' }), { status: 400 });
    }

    // Check connection limit
    if (this.connections.size >= MAX_EDITORS) {
      return new Response(
        JSON.stringify({
          error: 'Template is at maximum editor capacity',
          code: 'MAX_EDITORS',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Initialize Yjs doc if first connection
    await this.initialize(templateId);

    // Cancel grace period alarm if reconnecting
    const existingAlarm = await this.state.storage.getAlarm();
    if (existingAlarm !== null) {
      await this.state.storage.deleteAlarm();
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Accept the server side
    this.state.acceptWebSocket(server);

    const connectedUser: ConnectedUser = { ws: server, userId, email, role };
    this.connections.set(server, connectedUser);
    this.lastUserId = userId;

    // Send initial sync
    this.sendSyncStep1(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') return;
    if (!this.ydoc || !this.awareness) return;

    const data = new Uint8Array(message);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, this.ydoc, ws);
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
        break;
      }
      case MSG_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          ws,
        );
        // Broadcast awareness to other clients
        const user = this.connections.get(ws);
        if (user) {
          this.lastUserId = user.userId;
        }
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.handleDisconnect(ws);
  }

  private handleDisconnect(ws: WebSocket): void {
    const user = this.connections.get(ws);
    if (user) {
      this.lastUserId = user.userId;

      // Remove awareness states for this client
      if (this.awareness) {
        const states = this.awareness.getStates();
        const clientIds: number[] = [];
        states.forEach((_state, clientId) => {
          // Remove states associated with this connection
          clientIds.push(clientId);
        });
        // Only remove if we can identify the right client
      }
    }

    this.connections.delete(ws);

    // If no more connections, start grace period
    if (this.connections.size === 0) {
      void this.state.storage.setAlarm(Date.now() + GRACE_PERIOD_MS);
    }
  }

  async alarm(): Promise<void> {
    // Grace period expired — persist to D1 and shut down
    if (this.connections.size > 0) return; // Someone reconnected

    if (this.ydoc && this.templateId && this.lastUserId) {
      const content = this.ydoc.getText('content').toString();
      const db = this.env['DB'] as D1Database;

      try {
        await persistVersion(db, {
          templateId: this.templateId,
          content,
          createdBy: this.lastUserId,
          changeSummary: 'Auto-saved on session close',
        });
      } catch {
        // Log but don't throw — DO will shut down regardless
        console.error('Failed to persist version on session close');
      }

      // Clear checkpoint since we've persisted to D1
      await this.state.storage.delete('checkpoint');
      await this.state.storage.delete('checkpointTimestamp');
    }

    this.cleanup();
  }

  private sendSyncStep1(ws: WebSocket): void {
    if (!this.ydoc) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.ydoc);
    ws.send(encoding.toUint8Array(encoder));
  }

  private broadcastUpdate(update: Uint8Array, origin: WebSocket | null): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep2(encoder, this.ydoc!);
    const msg = encoding.toUint8Array(encoder);

    for (const [ws] of this.connections) {
      if (ws !== origin) {
        try {
          ws.send(msg);
        } catch {
          // Connection may have closed
        }
      }
    }
  }

  private async checkpoint(): Promise<void> {
    if (!this.ydoc) return;
    const update = Y.encodeStateAsUpdate(this.ydoc);
    await this.state.storage.put('checkpoint', update);
    await this.state.storage.put('checkpointTimestamp', Date.now());
    this.lastCheckpoint = Date.now();
  }

  /**
   * Called by the collaborate route when an editor clicks "Save Version".
   */
  async saveVersion(userId: string, changeSummary: string): Promise<{ version: number }> {
    if (!this.ydoc || !this.templateId) {
      throw new Error('Session not initialized');
    }

    const content = this.ydoc.getText('content').toString();
    const db = this.env['DB'] as D1Database;

    return persistVersion(db, {
      templateId: this.templateId,
      content,
      createdBy: userId,
      changeSummary,
    });
  }

  private cleanup(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }
    if (this.ydoc) {
      this.ydoc.destroy();
      this.ydoc = null;
    }
    this.initialized = false;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm --filter @legalcode/api test -- src/durable-objects/__tests__/template-session.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/durable-objects/
git commit -m "feat: add TemplateSession Durable Object for real-time collaboration"
```

---

### Task 4: WebSocket Collaborate Route

Hono route that authenticates WebSocket upgrade requests and forwards them to the TemplateSession Durable Object.

**Files:**

- Create: `packages/api/src/routes/collaborate.ts`
- Create: `packages/api/src/routes/__tests__/collaborate.test.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Write the failing test**

Create `packages/api/src/routes/__tests__/collaborate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../types/env.js';
import { collaborateRoutes } from '../collaborate.js';

// Mock auth middleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation(async (c, next) => {
    c.set('user', { id: 'user-1', email: 'test@example.com', role: 'editor' });
    await next();
  }),
  requireRole: vi.fn().mockImplementation((..._roles: string[]) => {
    return async (c: unknown, next: () => Promise<void>) => {
      await next();
    };
  }),
}));

describe('collaborate routes', () => {
  let app: Hono<AppEnv>;

  beforeEach(() => {
    app = new Hono<AppEnv>();
    app.route('/collaborate', collaborateRoutes);
  });

  it('rejects non-WebSocket requests', async () => {
    const mockDOStub = {
      fetch: vi.fn().mockResolvedValue(new Response('ok', { status: 101 })),
    };
    const mockDONamespace = {
      idFromName: vi.fn().mockReturnValue('do-id'),
      get: vi.fn().mockReturnValue(mockDOStub),
    };

    const res = await app.request(
      '/collaborate/tmpl-1',
      {
        method: 'GET',
      },
      {
        DB: {},
        TEMPLATE_SESSION: mockDONamespace,
      } as unknown as Record<string, unknown>,
    );

    expect(res.status).toBe(426);
  });

  it('exports collaborateRoutes', async () => {
    const mod = await import('../collaborate.js');
    expect(mod.collaborateRoutes).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/api test -- src/routes/__tests__/collaborate.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the route implementation**

Create `packages/api/src/routes/collaborate.ts`:

```typescript
import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export const collaborateRoutes = new Hono<AppEnv>();

// Auth required, editor or admin role
collaborateRoutes.use('*', authMiddleware);
collaborateRoutes.use('*', requireRole('editor', 'admin'));

collaborateRoutes.get('/:templateId', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const templateId = c.req.param('templateId');
  const user = c.get('user');

  // Get Durable Object stub — one DO per template, keyed by template ID
  const doNamespace = c.env.TEMPLATE_SESSION as DurableObjectNamespace;
  const doId = doNamespace.idFromName(templateId);
  const doStub = doNamespace.get(doId);

  // Forward the upgrade request to the DO with user info in headers
  const doRequest = new Request(c.req.url, c.req.raw);
  doRequest.headers.set('X-User-Id', user.id);
  doRequest.headers.set('X-User-Email', user.email);
  doRequest.headers.set('X-User-Role', user.role);
  doRequest.headers.set('X-Template-Id', templateId);

  return doStub.fetch(doRequest);
});

// Save Version endpoint — HTTP POST, not WebSocket
collaborateRoutes.post('/:templateId/save-version', async (c) => {
  const templateId = c.req.param('templateId');
  const user = c.get('user');
  const body = await c.req.json<{ changeSummary?: string }>();

  const doNamespace = c.env.TEMPLATE_SESSION as DurableObjectNamespace;
  const doId = doNamespace.idFromName(templateId);
  const doStub = doNamespace.get(doId);

  // Forward to DO's saveVersion via a special internal route
  const doRequest = new Request(new URL(`/save-version`, c.req.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      changeSummary: body.changeSummary ?? 'Manual save',
    }),
  });

  const doResponse = await doStub.fetch(doRequest);
  return doResponse;
});
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/api test -- src/routes/__tests__/collaborate.test.ts
```

Expected: PASS.

**Step 5: Mount route in index.ts**

In `packages/api/src/index.ts`, add:

```typescript
import { collaborateRoutes } from './routes/collaborate.js';
```

And after the templates route:

```typescript
app.route('/collaborate', collaborateRoutes);
```

**Step 6: Run all API tests**

```bash
pnpm --filter @legalcode/api test
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add packages/api/src/routes/collaborate.ts packages/api/src/routes/__tests__/collaborate.test.ts packages/api/src/index.ts
git commit -m "feat: add WebSocket collaborate route with auth"
```

---

### Task 5: Update Env Types and Wrangler Config

Add the `TEMPLATE_SESSION` Durable Object binding to TypeScript types and Wrangler config.

**Files:**

- Modify: `packages/api/src/types/env.ts`
- Modify: `wrangler.jsonc`

**Step 1: Add TEMPLATE_SESSION to env types**

In `packages/api/src/types/env.ts`, add `TEMPLATE_SESSION: DurableObjectNamespace;` to the `Bindings` interface.

**Step 2: Add DO export to the API entrypoint**

In `packages/api/src/index.ts`, add at the bottom:

```typescript
export { TemplateSession } from './durable-objects/template-session.js';
```

**Step 3: Update wrangler.jsonc**

Add Durable Objects configuration after the KV namespace binding:

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "TEMPLATE_SESSION", "class_name": "TemplateSession" }
  ]
},
"migrations": [
  { "tag": "v1", "new_classes": ["TemplateSession"] }
]
```

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

**Step 5: Commit**

```bash
git add packages/api/src/types/env.ts packages/api/src/index.ts wrangler.jsonc
git commit -m "feat: add TEMPLATE_SESSION Durable Object binding and wrangler config"
```

---

### Task 6: Frontend — useCollaboration Hook

Manages the WebSocket connection, Yjs Y.Doc, y-prosemirror binding, and awareness protocol.

**Files:**

- Create: `packages/web/src/hooks/useCollaboration.ts`
- Create: `packages/web/src/hooks/__tests__/useCollaboration.test.ts`

**Step 1: Write the failing test**

Create `packages/web/src/hooks/__tests__/useCollaboration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollaboration } from '../useCollaboration.js';

// Mock Yjs
vi.mock('yjs', () => {
  const Doc = vi.fn().mockImplementation(() => ({
    getText: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue(''),
      observe: vi.fn(),
    }),
    on: vi.fn(),
    destroy: vi.fn(),
  }));
  return { Doc };
});

// Mock y-indexeddb
vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock y-protocols/awareness
vi.mock('y-protocols/awareness', () => {
  const Awareness = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    destroy: vi.fn(),
    setLocalState: vi.fn(),
    setLocalStateField: vi.fn(),
    getStates: vi.fn().mockReturnValue(new Map()),
  }));
  return { Awareness };
});

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('useCollaboration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Y.Doc and returns it', () => {
    const { result } = renderHook(() =>
      useCollaboration('tmpl-1', { userId: 'u1', email: 'a@b.com', color: '#ff0000' }),
    );

    expect(result.current.ydoc).toBeDefined();
  });

  it('returns null ydoc when templateId is not provided', () => {
    const { result } = renderHook(() =>
      useCollaboration(null, { userId: 'u1', email: 'a@b.com', color: '#ff0000' }),
    );

    expect(result.current.ydoc).toBeNull();
  });

  it('cleans up on unmount', () => {
    const { unmount, result } = renderHook(() =>
      useCollaboration('tmpl-1', { userId: 'u1', email: 'a@b.com', color: '#ff0000' }),
    );

    const ydoc = result.current.ydoc;
    unmount();

    // Y.Doc.destroy should have been called
    expect(ydoc?.destroy).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/hooks/__tests__/useCollaboration.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the hook**

Create `packages/web/src/hooks/useCollaboration.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface CollaborationUser {
  userId: string;
  email: string;
  color: string;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  awareness: Awareness | null;
  status: ConnectionStatus;
  connectedUsers: CollaborationUser[];
  saveVersion: (changeSummary: string) => Promise<void>;
}

export function useCollaboration(
  templateId: string | null,
  user: CollaborationUser,
): UseCollaborationReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!templateId) return;

    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    ydocRef.current = ydoc;
    awarenessRef.current = awareness;

    // Set local awareness state
    awareness.setLocalStateField('user', {
      name: user.email,
      color: user.color,
      userId: user.userId,
    });

    // IndexedDB persistence for offline support
    const idb = new IndexeddbPersistence(`legalcode-${templateId}`, ydoc);
    idbRef.current = idb;

    // Track connected users from awareness
    awareness.on('change', () => {
      const users: CollaborationUser[] = [];
      awareness.getStates().forEach((state) => {
        const u = state['user'] as CollaborationUser | undefined;
        if (u) {
          users.push(u);
        }
      });
      setConnectedUsers(users);
    });

    function connect() {
      setStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/collaborate/${templateId}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptRef.current = 0;

        // Broadcast awareness
        const encoderAwareness = encoding.createEncoder();
        encoding.writeVarUint(encoderAwareness, MSG_AWARENESS);
        encoding.writeVarUint8Array(
          encoderAwareness,
          awarenessProtocol.encodeAwarenessUpdate(awareness, [ydoc.clientID]),
        );
        ws.send(encoding.toUint8Array(encoderAwareness));
      };

      ws.onmessage = (event: MessageEvent) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MSG_SYNC: {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MSG_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, ydoc, ws);
            if (encoding.length(encoder) > 1) {
              ws.send(encoding.toUint8Array(encoder));
            }
            break;
          }
          case MSG_AWARENESS: {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              ws,
            );
            break;
          }
        }
      };

      // Send local updates to server
      ydoc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin === ws) return; // Don't echo back server updates
        if (ws.readyState !== WebSocket.OPEN) return;

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.writeSyncStep2(encoder, ydoc);
        ws.send(encoding.toUint8Array(encoder));
      });

      ws.onclose = () => {
        setStatus('reconnecting');
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function scheduleReconnect() {
      const attempt = reconnectAttemptRef.current;
      const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)] ?? 16000;
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (idbRef.current) {
        idbRef.current.destroy();
      }
      awareness.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      awarenessRef.current = null;
    };
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveVersion = useCallback(
    async (changeSummary: string) => {
      if (!templateId) return;

      const response = await fetch(`/collaborate/${templateId}/save-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ changeSummary }),
      });

      if (!response.ok) {
        throw new Error('Failed to save version');
      }
    },
    [templateId],
  );

  return {
    ydoc: ydocRef.current,
    awareness: awarenessRef.current,
    status,
    connectedUsers,
    saveVersion,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/hooks/__tests__/useCollaboration.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/hooks/useCollaboration.ts packages/web/src/hooks/__tests__/useCollaboration.test.ts
git commit -m "feat: add useCollaboration hook for Yjs WebSocket sync"
```

---

### Task 7: Frontend — PresenceAvatars Component

Shows colored avatar chips for connected editors in the template editor top bar.

**Files:**

- Create: `packages/web/src/components/PresenceAvatars.tsx`
- Create: `packages/web/src/components/__tests__/PresenceAvatars.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/src/components/__tests__/PresenceAvatars.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceAvatars } from '../PresenceAvatars.js';

describe('PresenceAvatars', () => {
  it('renders avatar for each connected user', () => {
    const users = [
      { userId: 'u1', email: 'alice@example.com', color: '#ff0000' },
      { userId: 'u2', email: 'bob@example.com', color: '#00ff00' },
    ];

    render(<PresenceAvatars users={users} />);

    expect(screen.getByText('A')).toBeInTheDocument(); // Alice initial
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob initial
  });

  it('renders nothing when no users', () => {
    const { container } = render(<PresenceAvatars users={[]} />);
    // AvatarGroup should still render but be empty
    expect(container.querySelector('.MuiAvatarGroup-root')).toBeInTheDocument();
  });

  it('shows tooltip with user email', () => {
    const users = [{ userId: 'u1', email: 'alice@example.com', color: '#ff0000' }];

    render(<PresenceAvatars users={users} />);

    // Avatar should have title/tooltip
    const avatar = screen.getByText('A');
    expect(avatar.closest('[title]')).toHaveAttribute('title', 'alice@example.com');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/PresenceAvatars.test.tsx
```

Expected: FAIL — module not found.

**Step 3: Write the component**

Create `packages/web/src/components/PresenceAvatars.tsx`:

```tsx
import { Avatar, AvatarGroup, Tooltip } from '@mui/material';
import type { CollaborationUser } from '../hooks/useCollaboration.js';

interface PresenceAvatarsProps {
  users: CollaborationUser[];
}

function getInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users }) => {
  return (
    <AvatarGroup max={5} sx={{ ml: 2 }}>
      {users.map((user) => (
        <Tooltip key={user.userId} title={user.email}>
          <Avatar
            sx={{
              bgcolor: user.color,
              width: 32,
              height: 32,
              fontSize: '0.875rem',
            }}
          >
            {getInitial(user.email)}
          </Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/PresenceAvatars.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/PresenceAvatars.tsx packages/web/src/components/__tests__/PresenceAvatars.test.tsx
git commit -m "feat: add PresenceAvatars component for connected editors"
```

---

### Task 8: Frontend — ConnectionStatus Component

Small indicator showing WebSocket sync state.

**Files:**

- Create: `packages/web/src/components/ConnectionStatus.tsx`
- Create: `packages/web/src/components/__tests__/ConnectionStatus.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/src/components/__tests__/ConnectionStatus.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus.js';

describe('ConnectionStatus', () => {
  it('shows connected state with green indicator', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows connecting state', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows disconnected state with red indicator', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows reconnecting state', () => {
    render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/ConnectionStatus.test.tsx
```

Expected: FAIL — module not found.

**Step 3: Write the component**

Create `packages/web/src/components/ConnectionStatus.tsx`:

```tsx
import { Chip } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';
import type { ConnectionStatus as ConnectionStatusType } from '../hooks/useCollaboration.js';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

const statusConfig: Record<
  ConnectionStatusType,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  connected: { label: 'Connected', color: 'success' },
  connecting: { label: 'Connecting...', color: 'default' },
  disconnected: { label: 'Offline', color: 'error' },
  reconnecting: { label: 'Reconnecting...', color: 'warning' },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <Chip
      icon={<CircleIcon sx={{ fontSize: 10 }} />}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ ml: 1 }}
    />
  );
};
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/ConnectionStatus.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/ConnectionStatus.tsx packages/web/src/components/__tests__/ConnectionStatus.test.tsx
git commit -m "feat: add ConnectionStatus indicator component"
```

---

### Task 9: Frontend — SaveVersionDialog Component

Dialog that prompts for a version name/summary when the user clicks "Save Version".

**Files:**

- Create: `packages/web/src/components/SaveVersionDialog.tsx`
- Create: `packages/web/src/components/__tests__/SaveVersionDialog.test.tsx`

**Step 1: Write the failing test**

Create `packages/web/src/components/__tests__/SaveVersionDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveVersionDialog } from '../SaveVersionDialog.js';

describe('SaveVersionDialog', () => {
  it('renders dialog when open', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);

    expect(screen.getByText('Save Version')).toBeInTheDocument();
    expect(screen.getByLabelText('Change Summary')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SaveVersionDialog open={false} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);

    expect(screen.queryByText('Save Version')).not.toBeInTheDocument();
  });

  it('calls onSave with the entered summary', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={onSave} saving={false} />);

    await user.type(screen.getByLabelText('Change Summary'), 'Updated section 3');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Updated section 3');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SaveVersionDialog open={true} onClose={onClose} onSave={vi.fn()} saving={false} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons when saving', () => {
    render(<SaveVersionDialog open={true} onClose={vi.fn()} onSave={vi.fn()} saving={true} />);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/SaveVersionDialog.test.tsx
```

Expected: FAIL — module not found.

**Step 3: Write the component**

Create `packages/web/src/components/SaveVersionDialog.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface SaveVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (changeSummary: string) => void;
  saving: boolean;
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  open,
  onClose,
  onSave,
  saving,
}) => {
  const [summary, setSummary] = useState('');

  const handleSave = () => {
    onSave(summary);
    setSummary('');
  };

  const handleClose = () => {
    setSummary('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Version</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Change Summary"
          fullWidth
          multiline
          rows={3}
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
          }}
          sx={{ mt: 1 }}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/SaveVersionDialog.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/web/src/components/SaveVersionDialog.tsx packages/web/src/components/__tests__/SaveVersionDialog.test.tsx
git commit -m "feat: add SaveVersionDialog component"
```

---

### Task 10: Update MarkdownEditor for Collaboration Mode

Add a `collaboration` prop that, when true, binds the editor to a Yjs Y.Doc via y-prosemirror instead of local state.

**Files:**

- Modify: `packages/web/src/components/MarkdownEditor.tsx`
- Modify: `packages/web/src/components/__tests__/MarkdownEditor.test.tsx`

**Step 1: Write the failing test**

Add to `packages/web/src/components/__tests__/MarkdownEditor.test.tsx`:

```tsx
describe('MarkdownEditor collaboration mode', () => {
  it('accepts ydoc and awareness props for collaboration', () => {
    // When collaboration props are provided, the editor should render
    // without using defaultValue/onChange
    const { container } = render(
      <MarkdownEditor
        collaboration={{
          ydoc: {} as Y.Doc,
          awareness: {} as Awareness,
        }}
        readOnly={false}
      />,
    );

    expect(container.querySelector('.milkdown-editor')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/MarkdownEditor.test.tsx
```

Expected: FAIL — `collaboration` prop not recognized.

**Step 3: Update MarkdownEditor**

Add an optional `collaboration` prop to `MarkdownEditor`:

```typescript
interface CollaborationConfig {
  ydoc: Y.Doc;
  awareness: Awareness;
}

interface MarkdownEditorProps {
  defaultValue?: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
  collaboration?: CollaborationConfig;
}
```

When `collaboration` is provided:

- Import `yCollab` from `y-prosemirror` (the ProseMirror plugin that binds Yjs to ProseMirror)
- Add the `yCollab` plugin to the Milkdown editor config, passing `ydoc.getText('content')` and `awareness`
- Skip the `defaultValue` and `onChange` props (Yjs manages state instead)

When `collaboration` is not provided:

- Keep the existing behavior (local state with `defaultValue`/`onChange`)

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/components/__tests__/MarkdownEditor.test.tsx
```

Expected: PASS.

**Step 5: Run all web tests**

```bash
pnpm --filter @legalcode/web test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add packages/web/src/components/MarkdownEditor.tsx packages/web/src/components/__tests__/MarkdownEditor.test.tsx
git commit -m "feat: add collaboration mode to MarkdownEditor via y-prosemirror"
```

---

### Task 11: Update TemplateEditorPage for Collaboration

Wire up the collaboration hooks and new components into the existing editor page.

**Files:**

- Modify: `packages/web/src/pages/TemplateEditorPage.tsx`
- Modify: `packages/web/src/pages/__tests__/TemplateEditorPage.test.tsx`

**Step 1: Write the failing test**

Add to `packages/web/src/pages/__tests__/TemplateEditorPage.test.tsx`:

```tsx
describe('TemplateEditorPage collaboration mode', () => {
  it('shows PresenceAvatars and ConnectionStatus when editing an existing template', async () => {
    // Mock useCollaboration to return connected state with users
    vi.mock('../../hooks/useCollaboration.js', () => ({
      useCollaboration: vi.fn().mockReturnValue({
        ydoc: {},
        awareness: {},
        status: 'connected',
        connectedUsers: [{ userId: 'u1', email: 'alice@example.com', color: '#ff0000' }],
        saveVersion: vi.fn(),
      }),
    }));

    render(/* TemplateEditorPage with route param id=tmpl-1 */);

    // Should show presence avatars
    expect(screen.getByText('A')).toBeInTheDocument();
    // Should show connection status
    expect(screen.getByText('Connected')).toBeInTheDocument();
    // Should show "Save Version" button instead of "Save Draft"/"Save"
    expect(screen.getByRole('button', { name: /save version/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @legalcode/web test -- src/pages/__tests__/TemplateEditorPage.test.tsx
```

Expected: FAIL.

**Step 3: Update TemplateEditorPage**

Changes to `packages/web/src/pages/TemplateEditorPage.tsx`:

1. Import `useCollaboration` hook, `PresenceAvatars`, `ConnectionStatus`, `SaveVersionDialog`
2. When editing an existing template (has `id` param) and user role is `editor` or `admin`:
   - Call `useCollaboration(id, { userId, email, color })`
   - Pass `ydoc` and `awareness` to `MarkdownEditor` via `collaboration` prop
   - Show `PresenceAvatars` in the top bar next to template title
   - Show `ConnectionStatus` indicator
   - Replace "Save Draft"/"Save" buttons with "Save Version" button
   - "Save Version" opens `SaveVersionDialog`, which calls `saveVersion(changeSummary)` from the hook
3. Keep "Publish" and "Archive" buttons as-is (they use normal HTTP API)
4. In create mode (`/templates/new`), don't use collaboration — keep local state behavior

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @legalcode/web test -- src/pages/__tests__/TemplateEditorPage.test.tsx
```

Expected: PASS.

**Step 5: Run all web tests**

```bash
pnpm --filter @legalcode/web test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add packages/web/src/pages/TemplateEditorPage.tsx packages/web/src/pages/__tests__/TemplateEditorPage.test.tsx
git commit -m "feat: wire collaboration hooks and components into TemplateEditorPage"
```

---

### Task 12: Quality Gates and Deploy

Run all quality gates and deploy to production.

**Step 1: TypeScript check**

```bash
pnpm typecheck
```

Expected: No errors.

**Step 2: Lint**

```bash
pnpm lint
```

Expected: Zero warnings, zero errors.

**Step 3: Test with coverage**

```bash
pnpm test
```

Expected: All tests pass with 95%+ coverage per file.

**Step 4: Security scan**

```bash
pnpm security:scan
```

Expected: No findings.

**Step 5: Verify every component has a test**

Check that all new files in `packages/web/src/components/` and `packages/api/src/durable-objects/` have corresponding test files.

**Step 6: Build**

```bash
pnpm build
```

Expected: Build succeeds.

**Step 7: Deploy**

```bash
npx wrangler deploy
```

Expected: Deployed successfully. DO migration applied.

**Step 8: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: fix quality gate issues for Phase B"
```

**Step 9: Push to GitHub**

```bash
git push origin main
```
