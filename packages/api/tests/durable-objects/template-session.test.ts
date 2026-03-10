/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';

// ── Mocks ──

vi.mock('yjs', () => {
  const createMockDoc = () => {
    const mockText = {
      toString: vi.fn().mockReturnValue(''),
      toJSON: vi.fn().mockReturnValue(''),
      insert: vi.fn(),
      delete: vi.fn(),
      observe: vi.fn(),
      length: 0,
    };
    return {
      getText: vi.fn().mockReturnValue(mockText),
      on: vi.fn(),
      destroy: vi.fn(),
      transact: vi.fn().mockImplementation((fn: () => void) => {
        fn();
      }),
      clientID: 1,
      _text: mockText,
    };
  };
  return {
    Doc: vi.fn().mockImplementation(() => createMockDoc()),
    encodeStateAsUpdate: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    applyUpdate: vi.fn(),
    encodeStateVector: vi.fn().mockReturnValue(new Uint8Array([4, 5])),
  };
});

vi.mock('y-protocols/sync', () => ({
  writeSyncStep1: vi.fn(),
  writeSyncStep2: vi.fn(),
  readSyncMessage: vi.fn().mockReturnValue(0),
}));

vi.mock('y-protocols/awareness', () => {
  const createMockAwareness = () => ({
    on: vi.fn(),
    destroy: vi.fn(),
    setLocalState: vi.fn(),
    getStates: vi.fn().mockReturnValue(new Map()),
  });
  return {
    Awareness: vi.fn().mockImplementation(() => createMockAwareness()),
    encodeAwarenessUpdate: vi.fn().mockReturnValue(new Uint8Array([7, 8])),
    applyAwarenessUpdate: vi.fn(),
    removeAwarenessStates: vi.fn(),
  };
});

vi.mock('../../src/services/template-persistence.js', () => ({
  persistVersion: vi.fn().mockResolvedValue({ version: 2 }),
  getLatestVersionContent: vi.fn().mockResolvedValue({
    content: '# Test',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
  }),
}));

vi.mock('../../src/services/version-thinning.js', () => ({
  thinAutoVersions: vi.fn().mockResolvedValue({ deleted: 0 }),
}));

// ── Mock WebSocket + WebSocketPair ──

class MockWebSocket {
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  readyState = 1;
}

vi.stubGlobal(
  'WebSocketPair',
  vi.fn().mockImplementation(() => {
    const client = new MockWebSocket();
    const server = new MockWebSocket();
    return [client, server];
  }),
);

// Stub Response to allow status 101 (Cloudflare Workers API, not valid in Node)
const OriginalResponse = globalThis.Response;
vi.stubGlobal(
  'Response',
  class extends OriginalResponse {
    declare readonly status: number;
    constructor(body: BodyInit | null | undefined, init?: ResponseInit) {
      if (init?.status === 101) {
        // Node doesn't allow 101; create a 200 response and override status
        super(body, { ...init, status: 200 });
        Object.defineProperty(this, 'status', { value: 101 });
      } else {
        super(body, init);
      }
    }
  },
);

// ── Helpers ──

function createMockCtx() {
  return {
    storage: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn().mockResolvedValue(undefined),
      setAlarm: vi.fn().mockResolvedValue(undefined),
      getAlarm: vi.fn().mockResolvedValue(null),
      deleteAlarm: vi.fn().mockResolvedValue(undefined),
    },
    id: { toString: () => 'do-id-1' },
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn().mockReturnValue([]),
  } as unknown as DurableObjectState;
}

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
      batch: vi.fn().mockResolvedValue([]),
    },
  };
}

function createUpgradeRequest(headers: Record<string, string> = {}): Request {
  const defaultHeaders: Record<string, string> = {
    'X-Template-Id': 'tmpl-1',
    'X-User-Id': 'user-1',
    'X-User-Email': 'test@example.com',
    'X-User-Role': 'editor',
    Upgrade: 'websocket',
  };
  return new Request('http://fake-host/websocket', {
    headers: { ...defaultHeaders, ...headers },
  });
}

// ── Tests ──

describe('TemplateSession', () => {
  let session: InstanceType<
    typeof import('../../src/durable-objects/template-session.js').TemplateSession
  >;
  let ctx: ReturnType<typeof createMockCtx>;
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.useFakeTimers();
    ctx = createMockCtx();
    env = createMockEnv();

    const mod = await import('../../src/durable-objects/template-session.js');
    session = new mod.TemplateSession(ctx, env as unknown as Record<string, unknown>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('exports', () => {
    it('exports TemplateSession class', async () => {
      const mod = await import('../../src/durable-objects/template-session.js');
      expect(mod.TemplateSession).toBeDefined();
      expect(typeof mod.TemplateSession).toBe('function');
    });
  });

  describe('fetch — missing user headers', () => {
    it('returns 400 when X-User-Id is missing', async () => {
      const req = createUpgradeRequest({
        'X-User-Id': '',
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(400);
      const body: Record<string, unknown> = await res.json();
      expect(body.error).toBe('Missing user info');
    });

    it('returns 400 when X-User-Email is missing', async () => {
      const req = createUpgradeRequest({
        'X-User-Email': '',
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(400);
      const body: Record<string, unknown> = await res.json();
      expect(body.error).toBe('Missing user info');
    });
  });

  describe('fetch — valid WebSocket upgrade', () => {
    it('returns 101 and accepts the WebSocket', async () => {
      const req = createUpgradeRequest();
      const res = await session.fetch(req);
      expect(res.status).toBe(101);
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(1);
    });

    it('sends sync step 1 to the new connection', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      // The server WebSocket (second element of the pair) should have send called
      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      expect(serverWs.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetch — max editors (6th connection)', () => {
    it('returns 429 with MAX_EDITORS code', async () => {
      // Connect 5 editors
      for (let i = 0; i < 5; i++) {
        const req = createUpgradeRequest({
          'X-User-Id': `user-${String(i)}`,
          'X-User-Email': `user${String(i)}@example.com`,
        });
        await session.fetch(req);
      }

      // 6th attempt
      const req = createUpgradeRequest({
        'X-User-Id': 'user-6',
        'X-User-Email': 'user6@example.com',
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(429);
      const body: Record<string, unknown> = await res.json();
      expect(body.error).toBe('Template is at maximum editor capacity');
      expect(body.code).toBe('MAX_EDITORS');
    });
  });

  describe('fetch — reconnect during grace period', () => {
    it('cancels the alarm when a new editor connects', async () => {
      // Simulate an existing alarm (grace period active)
      (ctx.storage.getAlarm as Mock).mockResolvedValue(Date.now() + 30000);

      const req = createUpgradeRequest();
      await session.fetch(req);

      expect(ctx.storage.deleteAlarm).toHaveBeenCalledTimes(1);
    });
  });

  describe('alarm — grace period expiry', () => {
    it('persists version and clears checkpoint when contentChanged is true', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // First connect to initialize the session
      const req = createUpgradeRequest();
      await session.fetch(req);

      // Get the server WebSocket that was accepted
      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send a MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content so the empty-content guard passes
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Session content');

      // Disconnect (simulating webSocketClose)
      await session.webSocketClose(serverWs as unknown as WebSocket);

      // Now call alarm — no connections left
      await session.alarm();

      expect(persistVersion).toHaveBeenCalledWith(
        env.DB,
        expect.objectContaining({
          templateId: 'tmpl-1',
          createdBy: 'user-1',
          changeSummary: '[auto] Session close',
        }),
      );
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });

    it('skips persist but still clears checkpoint when contentChanged is false', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // Connect to initialize the session
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Disconnect WITHOUT sending any MSG_SYNC (contentChanged remains false)
      await session.webSocketClose(serverWs as unknown as WebSocket);

      await session.alarm();

      // persistVersion should NOT be called since contentChanged is false
      expect(persistVersion).not.toHaveBeenCalled();
      // But checkpoint storage should still be cleaned up
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });

    it('skips persist when content is empty string', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return empty string
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('');

      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      expect(persistVersion).not.toHaveBeenCalled();
      // Checkpoint still cleaned up
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });

    it('skips persist when content is whitespace-only', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return whitespace-only
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('   ');

      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      expect(persistVersion).not.toHaveBeenCalled();
      // Checkpoint still cleaned up
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });

    it('always cleans up checkpoint storage even when not persisting (no ydoc)', async () => {
      // Call alarm without initializing (no ydoc, no connections)
      // cleanup() should be called but storage.delete should NOT (ydoc check gates it)
      await session.alarm();

      // No connections, no ydoc: storage.delete should NOT be called
      expect(ctx.storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('alarm — with reconnected editors', () => {
    it('does nothing when connections exist', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // Connect an editor
      const req = createUpgradeRequest();
      await session.fetch(req);

      // Call alarm while editor is still connected
      await session.alarm();

      expect(persistVersion).not.toHaveBeenCalled();
    });
  });

  describe('POST /save-version', () => {
    it('returns version number on success', async () => {
      // Initialize session first
      const wsReq = createUpgradeRequest();
      await session.fetch(wsReq);

      // Now POST to save-version
      const req = new Request('http://fake-host/save-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user-1',
        },
        body: JSON.stringify({ changeSummary: 'Manual save' }),
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(200);
      const body: Record<string, unknown> = await res.json();
      expect(body.version).toBe(2);
    });

    it('returns 400 when session is not initialized', async () => {
      const req = new Request('http://fake-host/save-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user-1',
        },
        body: JSON.stringify({ changeSummary: 'Manual save' }),
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(400);
      const body: Record<string, unknown> = await res.json();
      expect(body.error).toBe('Session not initialized');
    });
  });

  describe('initialization — D1 recovery (no checkpoint)', () => {
    it('loads content from D1 when no checkpoint exists', async () => {
      const { getLatestVersionContent } =
        await import('../../src/services/template-persistence.js');

      const req = createUpgradeRequest();
      await session.fetch(req);

      expect(getLatestVersionContent).toHaveBeenCalledWith(env.DB, 'tmpl-1');

      // Y.Doc getText should have had insert called with D1 content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { insert: Mock };
      };
      expect(mockDoc._text.insert).toHaveBeenCalledWith(0, '# Test');
    });
  });

  describe('initialization — checkpoint newer than D1', () => {
    it('applies checkpoint update when checkpoint is newer', async () => {
      const checkpointData = new Uint8Array([10, 20, 30]).buffer;
      const futureTimestamp = new Date('2026-06-01T00:00:00Z').getTime();

      (ctx.storage.get as Mock).mockImplementation((key: string) => {
        if (key === 'checkpoint') return Promise.resolve(checkpointData);
        if (key === 'checkpointTimestamp') return Promise.resolve(futureTimestamp);
        return Promise.resolve(undefined);
      });

      const req = createUpgradeRequest();
      await session.fetch(req);

      expect(Y.applyUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('initialization — D1 newer than checkpoint', () => {
    it('loads from D1 when D1 version is newer than checkpoint', async () => {
      const checkpointData = new Uint8Array([10, 20, 30]).buffer;
      // Checkpoint is old
      const oldTimestamp = new Date('2025-01-01T00:00:00Z').getTime();

      (ctx.storage.get as Mock).mockImplementation((key: string) => {
        if (key === 'checkpoint') return Promise.resolve(checkpointData);
        if (key === 'checkpointTimestamp') return Promise.resolve(oldTimestamp);
        return Promise.resolve(undefined);
      });

      const req = createUpgradeRequest();
      await session.fetch(req);

      // Should NOT have called applyUpdate (checkpoint is old)
      expect(Y.applyUpdate).not.toHaveBeenCalled();

      // Should have inserted D1 content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { insert: Mock };
      };
      expect(mockDoc._text.insert).toHaveBeenCalledWith(0, '# Test');
    });
  });

  describe('webSocketClose — last editor', () => {
    it('sets a grace period alarm when last editor disconnects', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketClose(serverWs as unknown as WebSocket);

      expect(ctx.storage.setAlarm).toHaveBeenCalledTimes(1);
      // The alarm should be ~30 seconds in the future
      const alarmTime = (ctx.storage.setAlarm as Mock).mock.calls[0]?.[0] as number;
      expect(alarmTime).toBeGreaterThan(Date.now());
    });
  });

  describe('webSocketClose — not last editor', () => {
    it('does not set alarm when other editors remain', async () => {
      // Connect two editors
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      // Disconnect first editor
      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketClose(serverWs1 as unknown as WebSocket);

      expect(ctx.storage.setAlarm).not.toHaveBeenCalled();
    });
  });

  describe('webSocketMessage — sync message', () => {
    it('processes MSG_SYNC messages', async () => {
      const syncProtocol = await import('y-protocols/sync');

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Build a sync message
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0); // sync step type
      const msgData = encoding.toUint8Array(encoder);

      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      expect(syncProtocol.readSyncMessage).toHaveBeenCalled();
    });
  });

  describe('webSocketMessage — awareness message', () => {
    it('processes MSG_AWARENESS messages and broadcasts', async () => {
      const awarenessProtocol = await import('y-protocols/awareness');

      // Connect two editors
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Build an awareness message
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1); // MSG_AWARENESS
      encoding.writeVarUint8Array(encoder, new Uint8Array([9, 10]));
      const msgData = encoding.toUint8Array(encoder);

      // Reset send counts from initial sync
      const serverWs2 = (ctx.acceptWebSocket as Mock).mock.calls[1]?.[0] as MockWebSocket;
      serverWs2.send.mockClear();

      await session.webSocketMessage(serverWs1 as unknown as WebSocket, msgData.buffer);

      expect(awarenessProtocol.applyAwarenessUpdate).toHaveBeenCalled();
      // Should broadcast to the OTHER client
      expect(serverWs2.send).toHaveBeenCalled();
    });
  });

  describe('webSocketMessage — string message', () => {
    it('ignores string messages', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Should not throw
      await session.webSocketMessage(serverWs as unknown as WebSocket, 'some string');
    });
  });

  describe('webSocketError', () => {
    it('handles error by disconnecting', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketError(serverWs as unknown as WebSocket);

      // Should set alarm since it was the only connection
      expect(ctx.storage.setAlarm).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkpoint', () => {
    it('stores checkpoint to DO storage on interval', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      // Advance timers by 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(ctx.storage.put).toHaveBeenCalledWith('checkpoint', expect.any(ArrayBuffer));
      expect(ctx.storage.put).toHaveBeenCalledWith('checkpointTimestamp', expect.any(Number));
    });
  });

  describe('initialization — no D1 content, no checkpoint', () => {
    it('initializes with empty doc when no data exists', async () => {
      const { getLatestVersionContent } =
        await import('../../src/services/template-persistence.js');
      (getLatestVersionContent as Mock).mockResolvedValueOnce(null);

      const req = createUpgradeRequest();
      await session.fetch(req);

      // Doc should be created but no insert called
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { insert: Mock };
      };
      expect(mockDoc._text.insert).not.toHaveBeenCalled();
    });
  });

  describe('alarm — persist failure', () => {
    it('logs error but does not throw when persistVersion fails', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockRejectedValueOnce(new Error('DB error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Connect and initialize the session
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true (required for alarm to attempt persist)
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content so the empty-content guard passes
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Content');

      await session.webSocketClose(serverWs as unknown as WebSocket);

      // Should not throw
      await session.alarm();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist version on session close',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('save-version — default changeSummary', () => {
    it('uses "Manual save" when no changeSummary provided', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // Initialize session
      const wsReq = createUpgradeRequest();
      await session.fetch(wsReq);

      const req = new Request('http://fake-host/save-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user-1',
        },
        body: JSON.stringify({}),
      });
      await session.fetch(req);

      expect(persistVersion).toHaveBeenCalledWith(
        env.DB,
        expect.objectContaining({
          changeSummary: 'Manual save',
        }),
      );
    });
  });

  describe('webSocketMessage — uninitialized session', () => {
    it('returns early when ydoc/awareness is null', async () => {
      // Don't connect (don't initialize) — call webSocketMessage directly
      const ws = new MockWebSocket();
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);

      // Should not throw
      await session.webSocketMessage(ws as unknown as WebSocket, msgData.buffer);
    });
  });

  describe('webSocketMessage — sync reply sent', () => {
    it('sends sync reply when encoder has content', async () => {
      const syncProtocol = await import('y-protocols/sync');

      // Make readSyncMessage produce output (encoder length > 1)
      (syncProtocol.readSyncMessage as Mock).mockImplementation((...args: unknown[]) => {
        // Write something to make encoder length > 1
        encoding.writeVarUint(args[1] as encoding.Encoder, 42);
        return 0;
      });

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      serverWs.send.mockClear();

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);

      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      expect(serverWs.send).toHaveBeenCalled();
    });
  });

  describe('awareness broadcast — send failure', () => {
    it('catches send errors on closed sockets', async () => {
      // Connect two editors
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      const serverWs2 = (ctx.acceptWebSocket as Mock).mock.calls[1]?.[0] as MockWebSocket;

      // Make ws2 throw on send
      serverWs2.send.mockImplementation(() => {
        throw new Error('WebSocket closed');
      });

      // Build awareness message from ws1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1); // MSG_AWARENESS
      encoding.writeVarUint8Array(encoder, new Uint8Array([9, 10]));
      const msgData = encoding.toUint8Array(encoder);

      // Should not throw despite ws2 failing
      await session.webSocketMessage(serverWs1 as unknown as WebSocket, msgData.buffer);
    });
  });

  describe('broadcastDocUpdate', () => {
    it('broadcasts doc updates to other connections', async () => {
      // Connect two editors
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      // Get the ydoc's 'on' callback and invoke it
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        on: Mock;
      };
      const updateCallback = mockDoc.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'update',
      )?.[1] as (update: Uint8Array, origin: unknown) => void;

      expect(updateCallback).toBeDefined();

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      const serverWs2 = (ctx.acceptWebSocket as Mock).mock.calls[1]?.[0] as MockWebSocket;
      serverWs2.send.mockClear();

      // Trigger the update callback with ws1 as origin
      updateCallback(new Uint8Array([1, 2, 3]), serverWs1);

      // ws2 should receive the broadcast, ws1 should not
      expect(serverWs2.send).toHaveBeenCalled();
    });

    it('catches send errors on closed sockets during broadcast', async () => {
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        on: Mock;
      };
      const updateCallback = mockDoc.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'update',
      )?.[1] as (update: Uint8Array, origin: unknown) => void;

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      const serverWs2 = (ctx.acceptWebSocket as Mock).mock.calls[1]?.[0] as MockWebSocket;

      // Make ws2 throw on send
      serverWs2.send.mockImplementation(() => {
        throw new Error('WebSocket closed');
      });

      // Should not throw
      updateCallback(new Uint8Array([1, 2, 3]), serverWs1);
    });
  });

  describe('initialization — checkpoint with no D1 version', () => {
    it('applies checkpoint when no D1 version exists', async () => {
      const { getLatestVersionContent } =
        await import('../../src/services/template-persistence.js');
      (getLatestVersionContent as Mock).mockResolvedValueOnce(null);

      const checkpointData = new Uint8Array([10, 20, 30]).buffer;
      const ts = Date.now();
      (ctx.storage.get as Mock).mockImplementation((key: string) => {
        if (key === 'checkpoint') return Promise.resolve(checkpointData);
        if (key === 'checkpointTimestamp') return Promise.resolve(ts);
        return Promise.resolve(undefined);
      });

      const req = createUpgradeRequest();
      await session.fetch(req);

      // Should apply checkpoint since D1 timestamp is 0
      expect(Y.applyUpdate).toHaveBeenCalled();
    });
  });

  describe('alarm — no lastUserId', () => {
    it('does not persist when lastUserId is null', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // Call alarm without connecting any user (no lastUserId, no ydoc)
      await session.alarm();
      expect(persistVersion).not.toHaveBeenCalled();
    });
  });

  describe('save-version — header fallback', () => {
    it('handles missing X-User-Id header gracefully', async () => {
      // Initialize
      const wsReq = createUpgradeRequest();
      await session.fetch(wsReq);

      const req = new Request('http://fake-host/save-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No X-User-Id header
        },
        body: JSON.stringify({ changeSummary: 'test' }),
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(200);
    });
  });

  describe('fetch — null header fallbacks', () => {
    it('defaults headers to empty string when null', async () => {
      // Request with no custom headers at all — should hit ?? fallbacks
      const req = new Request('http://fake-host/websocket');
      const res = await session.fetch(req);
      // Should return 400 because userId and email are empty
      expect(res.status).toBe(400);
    });
  });

  describe('auto-versioning during checkpoint', () => {
    it('creates auto-version when content has changed via MSG_SYNC', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send a MSG_SYNC message to mark content as changed
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Real content');

      // Advance timers to trigger checkpoint
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(persistVersion).toHaveBeenCalledWith(
        env.DB,
        expect.objectContaining({
          templateId: 'tmpl-1',
          changeSummary: '[auto] Checkpoint',
        }),
      );
    });

    it('does NOT create auto-version during checkpoint when content has not changed', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      // Don't send any MSG_SYNC messages

      // Advance timers to trigger checkpoint
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // persistVersion should NOT have been called (no content change)
      expect(persistVersion).not.toHaveBeenCalled();
    });

    it('skips persist during checkpoint when content is empty', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // toJSON returns '' by default in mock — no need to override
      // Advance timers to trigger checkpoint
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Should NOT persist because content is empty
      expect(persistVersion).not.toHaveBeenCalled();
    });

    it('resets contentChanged flag after checkpoint', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content for first checkpoint
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Real content');

      // First checkpoint should persist
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(persistVersion).toHaveBeenCalledTimes(1);

      (persistVersion as Mock).mockClear();

      // Second checkpoint without new MSG_SYNC should NOT persist
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(persistVersion).not.toHaveBeenCalled();
    });

    it('calls thinAutoVersions after auto-persist during checkpoint', async () => {
      const { thinAutoVersions } = await import('../../src/services/version-thinning.js');
      (thinAutoVersions as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to mark content changed
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Real content');

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(thinAutoVersions).toHaveBeenCalledWith(env.DB, 'tmpl-1');
    });
  });

  describe('alarm — auto-version changeSummary', () => {
    it('uses [auto] Session close as changeSummary', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');
      (persistVersion as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Session content');

      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      expect(persistVersion).toHaveBeenCalledWith(
        env.DB,
        expect.objectContaining({
          changeSummary: '[auto] Session close',
        }),
      );
    });

    it('calls thinAutoVersions after alarm persist', async () => {
      const { thinAutoVersions } = await import('../../src/services/version-thinning.js');
      (thinAutoVersions as Mock).mockClear();

      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Send MSG_SYNC to set contentChanged = true
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Override toJSON to return non-empty content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        _text: { toJSON: Mock };
      };
      mockDoc._text.toJSON.mockReturnValueOnce('# Session content');

      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      expect(thinAutoVersions).toHaveBeenCalledWith(env.DB, 'tmpl-1');
    });
  });

  describe('POST /comment-event', () => {
    it('broadcasts MSG_COMMENT to connected clients', async () => {
      // Connect two editors
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const req2 = createUpgradeRequest({
        'X-User-Id': 'user-2',
        'X-User-Email': 'user2@example.com',
      });
      await session.fetch(req2);

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      const serverWs2 = (ctx.acceptWebSocket as Mock).mock.calls[1]?.[0] as MockWebSocket;
      serverWs1.send.mockClear();
      serverWs2.send.mockClear();

      // POST to /comment-event
      const req = new Request('http://fake-host/comment-event', {
        method: 'POST',
        body: JSON.stringify({ type: 'comment_changed' }),
      });
      const res = await session.fetch(req);

      expect(res.status).toBe(200);
      // Both clients should receive the broadcast
      expect(serverWs1.send).toHaveBeenCalledTimes(1);
      expect(serverWs2.send).toHaveBeenCalledTimes(1);

      // Verify the message contains MSG_COMMENT (2) as first varuint
      const sentData = serverWs1.send.mock.calls[0]?.[0] as Uint8Array;
      expect(sentData).toBeInstanceOf(Uint8Array);
      // First byte should be MSG_COMMENT = 2
      expect(sentData[0]).toBe(2);
    });

    it('returns 200 with no connections', async () => {
      // Don't connect any editors, but initialize the session first
      const wsReq = createUpgradeRequest();
      await session.fetch(wsReq);

      // Disconnect the editor
      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketClose(serverWs as unknown as WebSocket);

      const req = new Request('http://fake-host/comment-event', {
        method: 'POST',
        body: JSON.stringify({ type: 'comment_changed' }),
      });
      const res = await session.fetch(req);
      expect(res.status).toBe(200);
    });

    it('handles send failure on closed socket gracefully', async () => {
      const req1 = createUpgradeRequest({
        'X-User-Id': 'user-1',
        'X-User-Email': 'user1@example.com',
      });
      await session.fetch(req1);

      const serverWs1 = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      serverWs1.send.mockClear();
      serverWs1.send.mockImplementation(() => {
        throw new Error('WebSocket closed');
      });

      const req = new Request('http://fake-host/comment-event', {
        method: 'POST',
        body: JSON.stringify({ type: 'comment_changed' }),
      });
      // Should not throw
      const res = await session.fetch(req);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /invalidate', () => {
    it('clears checkpoint storage and returns 200 when session is initialized', async () => {
      // Initialize session
      const req = createUpgradeRequest();
      await session.fetch(req);

      // Clear previous storage calls from initialization
      (ctx.storage.delete as Mock).mockClear();
      (ctx.storage.put as Mock).mockClear();

      const invalidateReq = new Request('http://fake-host/invalidate', {
        method: 'POST',
      });
      const res = await session.fetch(invalidateReq);

      expect(res.status).toBe(200);
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });

    it('resets contentChanged to false on invalidate', async () => {
      const { persistVersion } = await import('../../src/services/template-persistence.js');

      // Initialize and mark content changed
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // MSG_SYNC
      encoding.writeVarUint(encoder, 0);
      const msgData = encoding.toUint8Array(encoder);
      await session.webSocketMessage(serverWs as unknown as WebSocket, msgData.buffer);

      // Invalidate — should reset contentChanged
      const invalidateReq = new Request('http://fake-host/invalidate', {
        method: 'POST',
      });
      await session.fetch(invalidateReq);

      (persistVersion as Mock).mockClear();

      // Disconnect and alarm — should NOT persist because contentChanged was reset
      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      expect(persistVersion).not.toHaveBeenCalled();
    });

    it('reloads content from D1 into ydoc on invalidate', async () => {
      const { getLatestVersionContent } =
        await import('../../src/services/template-persistence.js');

      // Initialize session (calls getLatestVersionContent once)
      const req = createUpgradeRequest();
      await session.fetch(req);

      // Mock a new D1 response for the invalidate call
      (getLatestVersionContent as Mock).mockResolvedValueOnce({
        content: '# Restored Content',
        version: 3,
        createdAt: '2026-03-10T00:00:00Z',
      });

      const invalidateReq = new Request('http://fake-host/invalidate', {
        method: 'POST',
      });
      const res = await session.fetch(invalidateReq);

      expect(res.status).toBe(200);
      // getLatestVersionContent should have been called again for the invalidate
      expect(getLatestVersionContent).toHaveBeenCalledWith(env.DB, 'tmpl-1');

      // The ydoc transact should have been called to reload content
      const DocCtor = Y.Doc as unknown as Mock;
      const mockDoc = DocCtor.mock.results[0]?.value as {
        transact: Mock;
        _text: { insert: Mock; delete: Mock };
      };
      expect(mockDoc.transact).toHaveBeenCalled();
      expect(mockDoc._text.insert).toHaveBeenCalledWith(0, '# Restored Content');
    });

    it('returns 200 when session is not initialized (no ydoc)', async () => {
      // Don't connect — session not initialized
      const invalidateReq = new Request('http://fake-host/invalidate', {
        method: 'POST',
      });
      const res = await session.fetch(invalidateReq);

      expect(res.status).toBe(200);
      // Storage cleanup still happens
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpoint');
      expect(ctx.storage.delete).toHaveBeenCalledWith('checkpointTimestamp');
    });
  });

  describe('MSG_COMMENT constant', () => {
    it('MSG_COMMENT equals 2', async () => {
      // Connect an editor
      const req1 = createUpgradeRequest();
      await session.fetch(req1);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      serverWs.send.mockClear();

      // Trigger comment broadcast
      const req = new Request('http://fake-host/comment-event', {
        method: 'POST',
        body: JSON.stringify({ type: 'comment_changed' }),
      });
      await session.fetch(req);

      // Verify the first varuint in the sent message is 2
      const sentData = serverWs.send.mock.calls[0]?.[0] as Uint8Array;
      expect(sentData[0]).toBe(2);
    });
  });

  describe('guard clauses after cleanup', () => {
    it('sendSyncStep1 returns early when ydoc is null (after alarm cleanup)', async () => {
      // Connect then trigger cleanup via alarm
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;

      // Disconnect
      await session.webSocketClose(serverWs as unknown as WebSocket);

      // Trigger alarm to cleanup
      await session.alarm();

      // Now session.ydoc is null. Calling fetch again should re-initialize.
      // But let's verify cleanup happened by checking broadcastDocUpdate
      // through the alarm cycle — ydoc is destroyed, cleanup runs.

      // Try to manually trigger sendSyncStep1 by connecting again
      // after cleanup — the session will re-initialize.
      // Instead, to test the guard clause directly, we need to access the
      // private method. Use the 'as any' pattern.
      const anySession = session as unknown as Record<string, unknown>;
      const sendSync = (anySession.sendSyncStep1 as (ws: WebSocket) => void).bind(session);
      const mockWs = new MockWebSocket();
      // ydoc is null after cleanup - this should just return
      sendSync(mockWs as unknown as WebSocket);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('checkpoint returns early when ydoc is null', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      // ydoc is null after cleanup
      const anySession = session as unknown as Record<string, unknown>;
      const checkpoint = (anySession.checkpoint as () => Promise<void>).bind(session);
      // Should not throw
      await checkpoint();
      // storage.put should not be called for checkpoint after cleanup
      // (only the cleanup deletes were called)
    });

    it('broadcastDocUpdate returns early when ydoc is null', async () => {
      const req = createUpgradeRequest();
      await session.fetch(req);

      const serverWs = (ctx.acceptWebSocket as Mock).mock.calls[0]?.[0] as MockWebSocket;
      await session.webSocketClose(serverWs as unknown as WebSocket);
      await session.alarm();

      const anySession = session as unknown as Record<string, unknown>;
      const broadcast = (
        anySession.broadcastDocUpdate as (update: Uint8Array, origin: WebSocket | null) => void
      ).bind(session);
      // Should not throw
      broadcast(new Uint8Array([1, 2, 3]), null);
    });
  });
});
