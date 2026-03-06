import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { persistVersion, getLatestVersionContent } from '../services/template-persistence.js';

const MAX_EDITORS = 5;
const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;
const GRACE_PERIOD_MS = 30 * 1000;

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

interface ConnectedUser {
  userId: string;
  email: string;
  role: string;
}

export class TemplateSession implements DurableObject {
  private readonly ctx: DurableObjectState;
  private readonly env: Record<string, unknown>;
  private ydoc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private connections = new Map<WebSocket, ConnectedUser>();
  private templateId: string | null = null;
  private initialized = false;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private lastUserId: string | null = null;

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle save-version POST
    if (request.method === 'POST' && url.pathname === '/save-version') {
      return this.handleSaveVersion(request);
    }

    // Handle WebSocket upgrade
    const templateId = request.headers.get('X-Template-Id') ?? '';
    const userId = request.headers.get('X-User-Id') ?? '';
    const email = request.headers.get('X-User-Email') ?? '';
    const role = request.headers.get('X-User-Role') ?? '';

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing user info' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.connections.size >= MAX_EDITORS) {
      return new Response(
        JSON.stringify({
          error: 'Template is at maximum editor capacity',
          code: 'MAX_EDITORS',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await this.initialize(templateId);

    // Cancel grace period alarm if someone reconnects
    const existingAlarm = await this.ctx.storage.getAlarm();
    if (existingAlarm !== null) {
      await this.ctx.storage.deleteAlarm();
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);
    this.connections.set(server, { userId, email, role });
    this.lastUserId = userId;

    // Send initial sync step 1
    this.sendSyncStep1(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- Cloudflare DO Hibernation API requires async
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
        // Broadcast awareness to all OTHER clients
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.awareness.getStates().keys()),
        );
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_AWARENESS);
        encoding.writeVarUint8Array(encoder, awarenessUpdate);
        const msg = encoding.toUint8Array(encoder);
        for (const [connWs] of this.connections) {
          if (connWs !== ws) {
            try {
              connWs.send(msg);
            } catch {
              /* closed */
            }
          }
        }
        break;
      }
    }

    // Track last active user
    const user = this.connections.get(ws);
    if (user) {
      this.lastUserId = user.userId;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- Cloudflare DO Hibernation API requires async
  async webSocketClose(ws: WebSocket): Promise<void> {
    this.handleDisconnect(ws);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- Cloudflare DO Hibernation API requires async
  async webSocketError(ws: WebSocket): Promise<void> {
    this.handleDisconnect(ws);
  }

  async alarm(): Promise<void> {
    // Grace period expired
    if (this.connections.size > 0) return;

    if (this.ydoc && this.templateId && this.lastUserId) {
      const content = this.ydoc.getText('content').toJSON();
      const db = this.env.DB as D1Database;
      try {
        await persistVersion(db, {
          templateId: this.templateId,
          content,
          createdBy: this.lastUserId,
          changeSummary: 'Auto-saved on session close',
        });
      } catch (err: unknown) {
        console.error('Failed to persist version on session close', err);
      }

      await this.ctx.storage.delete('checkpoint');
      await this.ctx.storage.delete('checkpointTimestamp');
    }

    this.cleanup();
  }

  // ── Private methods ──

  private async initialize(templateId: string): Promise<void> {
    if (this.initialized) return;
    this.templateId = templateId;
    this.ydoc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);

    // Recovery: checkpoint vs D1
    const checkpoint = await this.ctx.storage.get<ArrayBuffer>('checkpoint');
    const checkpointTimestamp = await this.ctx.storage.get<number>('checkpointTimestamp');
    const db = this.env.DB as D1Database;
    const latestVersion = await getLatestVersionContent(db, templateId);

    if (checkpoint && checkpointTimestamp) {
      const d1Timestamp = latestVersion ? new Date(latestVersion.createdAt).getTime() : 0;
      if (checkpointTimestamp > d1Timestamp) {
        Y.applyUpdate(this.ydoc, new Uint8Array(checkpoint));
      } else if (latestVersion) {
        this.ydoc.getText('content').insert(0, latestVersion.content);
      }
    } else if (latestVersion) {
      this.ydoc.getText('content').insert(0, latestVersion.content);
    }

    // Listen for doc updates to broadcast
    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      this.broadcastDocUpdate(update, origin as WebSocket | null);
    });

    // Periodic checkpointing
    this.checkpointTimer = setInterval(() => {
      void this.checkpoint();
    }, CHECKPOINT_INTERVAL_MS);

    this.initialized = true;
  }

  private handleDisconnect(ws: WebSocket): void {
    const user = this.connections.get(ws);
    if (user) {
      this.lastUserId = user.userId;
    }
    this.connections.delete(ws);

    if (this.connections.size === 0) {
      void this.ctx.storage.setAlarm(Date.now() + GRACE_PERIOD_MS);
    }
  }

  private sendSyncStep1(ws: WebSocket): void {
    if (!this.ydoc) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.ydoc);
    ws.send(encoding.toUint8Array(encoder));
  }

  private broadcastDocUpdate(update: Uint8Array, origin: WebSocket | null): void {
    if (!this.ydoc) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    encoding.writeVarUint(encoder, 2); // syncStep2 message type
    encoding.writeVarUint8Array(encoder, update);
    const msg = encoding.toUint8Array(encoder);

    for (const [ws] of this.connections) {
      if (ws !== origin) {
        try {
          ws.send(msg);
        } catch {
          /* closed */
        }
      }
    }
  }

  private async checkpoint(): Promise<void> {
    if (!this.ydoc) return;
    const update = Y.encodeStateAsUpdate(this.ydoc);
    await this.ctx.storage.put('checkpoint', update.buffer);
    await this.ctx.storage.put('checkpointTimestamp', Date.now());
  }

  private async handleSaveVersion(request: Request): Promise<Response> {
    if (!this.ydoc || !this.templateId) {
      return new Response(JSON.stringify({ error: 'Session not initialized' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = request.headers.get('X-User-Id') ?? '';
    const rawBody: unknown = await request.json();
    const body =
      typeof rawBody === 'object' && rawBody !== null ? (rawBody as Record<string, unknown>) : {};
    const content = this.ydoc.getText('content').toJSON();
    const db = this.env.DB as D1Database;

    const changeSummary =
      typeof body.changeSummary === 'string' ? body.changeSummary : 'Manual save';

    const result = await persistVersion(db, {
      templateId: this.templateId,
      content,
      createdBy: userId,
      changeSummary,
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
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
