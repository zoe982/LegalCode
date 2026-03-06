# Phase B: Real-time Collaborative Editing — Design

## Overview

Add Google Docs-style real-time collaborative editing to the template editor using Yjs CRDT, Cloudflare Durable Objects, and y-prosemirror binding to Milkdown's ProseMirror layer. Supports 2-5 concurrent editors per template.

## Architecture

A Durable Object per template acts as the single source of truth while editors are connected. Yjs CRDT syncs document state via WebSocket. y-prosemirror binds Yjs to Milkdown's ProseMirror layer for real-time cursor and content sync.

```
Browser A ──WebSocket──┐
                       ├── Worker (JWT auth) ──→ Durable Object (Yjs doc host)
Browser B ──WebSocket──┘                              │
                                                      ├── DO Storage (periodic checkpoints)
                                                      ├── D1 (version saves on close/explicit)
                                                      └── Awareness (cursors, presence)
```

## Durable Object Lifecycle

### Spin-up

1. First WebSocket connection to a template triggers DO creation
2. Recovery sequence: check DO built-in storage for checkpoint → compare timestamp with D1 latest version → use whichever is newer
3. Initialize Yjs `Y.Doc` from the recovered content

### Active

- Maintains Yjs doc in memory
- Syncs deltas to all connected clients via WebSocket
- Runs awareness protocol (cursors, user presence)
- Checkpoints to DO built-in storage every 5 minutes

### Grace Period (Last Editor Disconnects)

- Set `alarm()` for 30 seconds
- If editor reconnects within grace period: cancel alarm, resume sync
- If grace period expires: persist final Yjs state to D1 as a new version, clear DO storage checkpoint, allow DO to shut down

### Connection Limits

- Max 5 concurrent WebSocket connections per DO
- On connection attempt when full: reject with `{ error: 'Template is at maximum editor capacity', code: 'MAX_EDITORS' }` and HTTP 429
- Viewers connecting in read-only mode don't count toward the limit (future consideration)

## Persistence Strategy

### Checkpoints (DO Storage)

- Every 5 minutes during active editing
- Stored as Yjs binary state vector in DO's built-in `storage.put()`
- Includes timestamp for recovery comparison
- Not a version row — purely crash recovery

### Version Creation (D1)

Versions are only created on meaningful events:

- **Explicit "Save Version"** — any connected editor/admin can trigger this. Uses the triggering user's ID for the version row and audit log.
- **Grace period expiry** (last editor left) — uses the last connected user's ID for the version row. Audit log metadata includes `{ trigger: 'auto-save', lastEditor: userId }`.
- **Never** on periodic checkpoints — checkpoints are for crash recovery, not version history.

### Auth on Version Rows

- Explicit save: `createdBy` = the user who clicked "Save Version"
- Auto-save on disconnect: `createdBy` = the last user who was connected
- Change summary: explicit saves prompt for summary; auto-saves use "Auto-saved on session close"

## Authentication

### WebSocket Upgrade Flow

1. Client sends WebSocket upgrade request to `/collaborate/:id`
2. Worker's Hono route validates `__Host-auth` JWT via existing `authMiddleware`
3. Worker checks user role is `admin` or `editor` (viewers cannot join collab sessions)
4. Only after auth passes does Worker call `durableObjectStub.fetch()` with user info in headers (`X-User-Id`, `X-User-Email`, `X-User-Role`)
5. DO trusts Worker's auth — does not re-validate tokens

### Expired Token During Offline Edit

- If session token expires while editing offline, WebSocket reconnection will fail auth
- Frontend detects auth failure on reconnect → shows "Re-authenticate to sync changes" prompt
- Local Yjs changes preserved in IndexedDB provider until user re-authenticates
- After re-auth, WebSocket reconnects and Yjs syncs buffered changes automatically
- User's work is never lost

## Frontend Changes

### MarkdownEditor Collaboration Mode

- New `collaboration` prop: when true, connects via WebSocket + Yjs instead of local state
- y-prosemirror plugin binds Yjs doc to ProseMirror editor state
- Remove manual save in collab mode — replace with "Save Version" button
- Auto-save indicator shows sync status

### New Hooks

- `useCollaboration(templateId)` — manages WebSocket connection, Yjs doc, y-prosemirror binding, awareness. Returns `{ ydoc, provider, awareness }`
- `useCollaborationStatus()` — tracks transport health: `connecting | connected | disconnected | reconnecting`. Separate from awareness (which tracks who's editing, not connection health)

### New Components

- `PresenceAvatars` — colored avatar chips showing connected editors
- `CollaborativeCursors` — colored cursor decorations in editor via y-prosemirror awareness
- `ConnectionStatus` — small indicator showing sync state (connected/syncing/offline)
- `SaveVersionDialog` — prompt for version name/summary on explicit save

### Editor Page Changes

- When template is opened and user is editor/admin: auto-connect to collab session
- Show presence avatars in the top bar next to template title
- Show connection status indicator
- Replace "Save Draft"/"Save" with "Save Version" button
- Keep "Publish" and "Archive" buttons (these operate via normal HTTP API)

## Backend Changes

### New Files

- `packages/api/src/durable-objects/template-session.ts` — Durable Object class (Yjs host, WebSocket hub, checkpoint/persist logic)
- `packages/api/src/routes/collaborate.ts` — WebSocket upgrade route with auth
- `packages/api/src/services/template-persistence.ts` — shared D1 write functions extracted from template.ts (pure functions taking `db` + input params, no imports from route or DO layer)

### Modified Files

- `packages/api/src/services/template.ts` — refactor to use shared persistence functions
- `packages/api/src/types/env.ts` — add `TEMPLATE_SESSION: DurableObjectNamespace` binding
- `packages/api/src/index.ts` — mount collaborate routes
- `wrangler.jsonc` — add Durable Objects config + migration

### Dependency Architecture (No Circular Imports)

```
routes/collaborate.ts ──→ services/template-persistence.ts ←── durable-objects/template-session.ts
routes/templates.ts   ──→ services/template.ts ──→ services/template-persistence.ts
```

Shared persistence functions are pure: take `db: D1Database` and input params, return results. No imports from route or DO layer.

### Wrangler Config

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

## New Dependencies

- `yjs` — CRDT library
- `y-prosemirror` — ProseMirror binding for Yjs
- `y-protocols` — Yjs sync and awareness protocols
- `y-indexeddb` — IndexedDB persistence for offline support
- `lib0` — Yjs utility library (encoding/decoding)

## Testing Strategy

### Backend

- DO unit tests: mock WebSocket, verify Yjs sync, checkpoint, persistence
- Collaborate route tests: verify auth gate, WebSocket upgrade, connection limit
- Template persistence service tests: verify shared functions work correctly

### Frontend

- useCollaboration hook tests: mock WebSocket, verify Yjs doc creation
- useCollaborationStatus tests: verify state transitions
- PresenceAvatars tests: verify user display
- Integration: mock WebSocket server, verify end-to-end collab flow

### Manual E2E

- Open same template in two browser tabs
- Type in one → see changes in other in real-time
- See colored cursors and presence avatars
- Disconnect one → reconnect → verify sync
- Close all tabs → verify version saved to D1
