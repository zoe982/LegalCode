import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock yjs
vi.mock('yjs', () => {
  const mockText = {
    toString: vi.fn().mockReturnValue(''),
    insert: vi.fn(),
    observe: vi.fn(),
  };
  const Doc = vi.fn().mockImplementation(() => ({
    getText: vi.fn().mockReturnValue(mockText),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    clientID: 1,
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
    off: vi.fn(),
    destroy: vi.fn(),
    setLocalState: vi.fn(),
    setLocalStateField: vi.fn(),
    getStates: vi.fn().mockReturnValue(new Map()),
  }));
  return { Awareness };
});

// Mock WebSocket
const wsInstances: MockWebSocket[] = [];

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
  binaryType = 'blob';

  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    wsInstances.push(this);
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }
}

function wsRef(): MockWebSocket {
  const instance = wsInstances[wsInstances.length - 1];
  if (!instance) throw new Error('No WebSocket instance created');
  return instance;
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock location
vi.stubGlobal('location', { protocol: 'https:', host: 'example.com', href: 'https://example.com' });

const mockReportError = vi.fn();
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args) as unknown,
}));

// Import after mocks
const { useCollaboration } = await import('../../src/hooks/useCollaboration.js');

describe('useCollaboration', () => {
  const testUser = { userId: 'u1', email: 'test@example.com', color: '#ff0000' };

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    wsInstances.length = 0;
  });

  it('returns null ydoc when templateId is null', () => {
    const { result } = renderHook(() => useCollaboration(null, testUser));
    expect(result.current.ydoc).toBeNull();
    expect(result.current.awareness).toBeNull();
    expect(result.current.status).toBe('disconnected');
  });

  it('returns null ydoc when user is null', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', null));
    expect(result.current.ydoc).toBeNull();
  });

  it('creates a Y.Doc when templateId and user are provided', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    expect(result.current.ydoc).toBeDefined();
  });

  it('starts in connecting status', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    expect(result.current.status).toBe('connecting');
  });

  it('transitions to connected when WebSocket opens', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.status).toBe('connected');
  });

  it('cleans up on unmount', () => {
    const { unmount, result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    const ydoc = result.current.ydoc as unknown as { destroy: ReturnType<typeof vi.fn> };
    unmount();
    expect(ydoc.destroy).toHaveBeenCalled();
  });

  it('initializes with empty connected users', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    expect(result.current.connectedUsers).toEqual([]);
  });

  it('provides a saveVersion function', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    expect(typeof result.current.saveVersion).toBe('function');
  });

  it('saveVersion calls fetch with correct params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await result.current.saveVersion('My changes');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/collaborate/tmpl-1/save-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ changeSummary: 'My changes' }),
    });
  });

  it('saveVersion throws on failed response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await expect(
      act(async () => {
        await result.current.saveVersion('My changes');
      }),
    ).rejects.toThrow('Failed to save version');
  });

  it('saveVersion does nothing when templateId is null', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useCollaboration(null, testUser));

    await act(async () => {
      await result.current.saveVersion('My changes');
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('transitions to reconnecting on WebSocket close', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open the WebSocket first
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Trigger close — onclose is deferred via queueMicrotask
    act(() => {
      const ws = wsRef();
      ws.readyState = MockWebSocket.CLOSED;
      ws.onclose?.();
    });
    // Flush microtask queue so deferred onclose handler runs
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('reconnecting');
  });

  it('schedules reconnect with exponential backoff on close', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Close triggers reconnect schedule — onclose is deferred via queueMicrotask
    act(() => {
      const ws = wsRef();
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Advance past first reconnect delay (1000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    // Should be connecting again
    expect(result.current.status).toBe('connecting');
  });

  it('closes WebSocket on error', async () => {
    vi.useFakeTimers();
    renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const ws = wsRef();
    act(() => {
      ws.onerror?.();
    });

    expect(ws.close).toHaveBeenCalled();
  });

  it('clears reconnect timer on unmount', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger close so a reconnect timer is set
    act(() => {
      const ws = wsRef();
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Unmount before reconnect fires — should clear the timer
    unmount();
    // Advancing time should NOT trigger a new connect (no errors = success)
    await vi.advanceTimersByTimeAsync(20000);
  });

  it('uses ws: protocol when location is http:', async () => {
    vi.stubGlobal('location', {
      protocol: 'http:',
      host: 'localhost:3000',
      href: 'http://localhost:3000',
    });
    vi.useFakeTimers();
    renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(wsRef().url).toBe('ws://localhost:3000/api/collaborate/tmpl-1');
    // Restore https for other tests
    vi.stubGlobal('location', {
      protocol: 'https:',
      host: 'example.com',
      href: 'https://example.com',
    });
  });

  it('transitions to disconnected after exhausting all reconnect attempts', async () => {
    vi.useFakeTimers();

    // Replace WebSocket with one that does NOT auto-open (simulates server down)
    let shouldAutoOpen = true;
    const OriginalMockWebSocket = MockWebSocket;

    vi.stubGlobal(
      'WebSocket',
      class NoAutoOpenWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        close = vi.fn();
        url: string;

        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          if (shouldAutoOpen) {
            setTimeout(() => {
              this.readyState = 1;
              this.onopen?.();
            }, 0);
          }
          // When shouldAutoOpen is false, onopen never fires (server unreachable)
        }
      },
    );

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open the WebSocket first (auto-open enabled)
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Disable auto-open to simulate server being unreachable
    shouldAutoOpen = false;

    // Close the WebSocket — triggers scheduleReconnect with attempt 0
    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Simulate 5 failed reconnect attempts
    const delays = [1000, 2000, 4000, 8000, 16000];
    for (const delay of delays) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
      // connect() was called, new WS created but onopen never fires.
      // Simulate connection error -> close.
      act(() => {
        const ws = wsRef();
        ws.readyState = 3; // CLOSED
        ws.onclose?.();
      });
      await act(async () => {
        await Promise.resolve();
      });
    }

    // After 5 failed reconnect attempts, status should be 'disconnected'
    expect(result.current.status).toBe('disconnected');

    // Restore original MockWebSocket
    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('isSynced is true when status is connected', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isSynced).toBe(true);
  });

  it('isSynced is false when status is not connected', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    // Initially connecting
    expect(result.current.status).toBe('connecting');
    expect(result.current.isSynced).toBe(false);
  });

  it('isSynced is false when disconnected (null templateId)', () => {
    const { result } = renderHook(() => useCollaboration(null, testUser));
    expect(result.current.isSynced).toBe(false);
  });

  it('provides a reconnect function', () => {
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));
    expect(typeof result.current.reconnect).toBe('function');
  });

  it('reconnect triggers a new connection attempt', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open the WebSocket first
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Trigger close
    act(() => {
      const ws = wsRef();
      ws.readyState = MockWebSocket.CLOSED;
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Call reconnect manually — should start connecting immediately
    act(() => {
      result.current.reconnect();
    });
    expect(result.current.status).toBe('connecting');
  });

  it('updates connectedUsers from awareness change callback', async () => {
    // Need to capture the awareness change callback
    const { Awareness: AwarenessMock } = await import('y-protocols/awareness');
    const mockAwareness = {
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      setLocalState: vi.fn(),
      setLocalStateField: vi.fn(),
      getStates: vi
        .fn()
        .mockReturnValue(
          new Map([[1, { user: { userId: 'u2', email: 'other@example.com', color: '#00ff00' } }]]),
        ),
    };
    (AwarenessMock as ReturnType<typeof vi.fn>).mockImplementation(() => mockAwareness);

    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Find and invoke the awareness 'change' callback
    const changeCall = mockAwareness.on.mock.calls.find((call: unknown[]) => call[0] === 'change');
    if (!changeCall) throw new Error('awareness change callback not registered');
    const onAwarenessChange = changeCall[1] as () => void;

    act(() => {
      onAwarenessChange();
    });

    expect(result.current.connectedUsers).toEqual([
      { userId: 'u2', email: 'other@example.com', color: '#00ff00' },
    ]);
  });

  it('detects email change for same userId in awareness update', async () => {
    const { Awareness: AwarenessMock } = await import('y-protocols/awareness');

    let currentUsers = new Map([
      [1, { user: { userId: 'u2', email: 'old@example.com', color: '#00ff00' } }],
    ]);

    const mockAwareness = {
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      setLocalState: vi.fn(),
      setLocalStateField: vi.fn(),
      getStates: vi.fn().mockImplementation(() => currentUsers),
    };
    (AwarenessMock as ReturnType<typeof vi.fn>).mockImplementation(() => mockAwareness);

    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const changeCall = mockAwareness.on.mock.calls.find((call: unknown[]) => call[0] === 'change');
    if (!changeCall) throw new Error('awareness change callback not registered');
    const onAwarenessChange = changeCall[1] as () => void;

    // Initial awareness update
    act(() => {
      onAwarenessChange();
    });
    expect(result.current.connectedUsers).toEqual([
      { userId: 'u2', email: 'old@example.com', color: '#00ff00' },
    ]);

    // Same userId, different email — should trigger update via email comparison branch
    currentUsers = new Map([
      [1, { user: { userId: 'u2', email: 'new@example.com', color: '#00ff00' } }],
    ]);

    act(() => {
      onAwarenessChange();
    });
    expect(result.current.connectedUsers).toEqual([
      { userId: 'u2', email: 'new@example.com', color: '#00ff00' },
    ]);
  });

  it('calls onCommentEvent when MSG_COMMENT (type 2) message is received', async () => {
    vi.useFakeTimers();
    const onCommentEvent = vi.fn();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser, { onCommentEvent }));

    // Open the WebSocket
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Simulate MSG_COMMENT message (type byte = 2)
    const ws = wsRef();
    const commentMsg = new Uint8Array([2]).buffer;
    act(() => {
      ws.onmessage?.({ data: commentMsg });
    });

    expect(onCommentEvent).toHaveBeenCalledTimes(1);
  });

  it('does not call onCommentEvent for non-comment messages', async () => {
    vi.useFakeTimers();
    const onCommentEvent = vi.fn();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser, { onCommentEvent }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    const ws = wsRef();

    // MSG_SYNC = 0
    act(() => {
      ws.onmessage?.({ data: new Uint8Array([0]).buffer });
    });
    // MSG_AWARENESS = 1
    act(() => {
      ws.onmessage?.({ data: new Uint8Array([1]).buffer });
    });

    expect(onCommentEvent).not.toHaveBeenCalled();
  });

  it('ignores non-ArrayBuffer messages', async () => {
    vi.useFakeTimers();
    const onCommentEvent = vi.fn();
    renderHook(() => useCollaboration('tmpl-1', testUser, { onCommentEvent }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const ws = wsRef();
    act(() => {
      ws.onmessage?.({ data: 'string message' });
    });

    expect(onCommentEvent).not.toHaveBeenCalled();
  });

  it('ignores empty ArrayBuffer messages', async () => {
    vi.useFakeTimers();
    const onCommentEvent = vi.fn();
    renderHook(() => useCollaboration('tmpl-1', testUser, { onCommentEvent }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const ws = wsRef();
    act(() => {
      ws.onmessage?.({ data: new ArrayBuffer(0) });
    });

    expect(onCommentEvent).not.toHaveBeenCalled();
  });

  it('calls onSuggestionEvent when MSG_SUGGESTION (type 3) message is received', async () => {
    vi.useFakeTimers();
    const onSuggestionEvent = vi.fn();
    const { result } = renderHook(() =>
      useCollaboration('tmpl-1', testUser, { onSuggestionEvent }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Simulate MSG_SUGGESTION message (type byte = 3)
    const ws = wsRef();
    const suggestionMsg = new Uint8Array([3]).buffer;
    act(() => {
      ws.onmessage?.({ data: suggestionMsg });
    });

    expect(onSuggestionEvent).toHaveBeenCalledTimes(1);
  });

  it('does not call onSuggestionEvent when no handler provided', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Simulate MSG_SUGGESTION message — should not throw
    const ws = wsRef();
    act(() => {
      ws.onmessage?.({ data: new Uint8Array([3]).buffer });
    });

    // No assertion needed — just verifying no error thrown
    expect(result.current.status).toBe('connected');
  });

  it('reports error when reconnection exhausts all attempts', async () => {
    vi.useFakeTimers();

    let shouldAutoOpen = true;
    const OriginalMockWebSocket = MockWebSocket;

    vi.stubGlobal(
      'WebSocket',
      class NoAutoOpenWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        close = vi.fn();
        url: string;
        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          if (shouldAutoOpen) {
            setTimeout(() => {
              this.readyState = 1;
              this.onopen?.();
            }, 0);
          }
        }
      },
    );

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    shouldAutoOpen = false;

    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });

    const delays = [1000, 2000, 4000, 8000, 16000];
    for (const delay of delays) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
      act(() => {
        const ws = wsRef();
        ws.readyState = 3;
        ws.onclose?.();
      });
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(result.current.status).toBe('disconnected');
    expect(mockReportError).toHaveBeenCalledWith({
      source: 'websocket',
      severity: 'warning',
      message: 'WebSocket disconnected permanently',
      metadata: JSON.stringify({ templateId: 'tmpl-1' }),
      url: 'https://example.com',
    });

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('does not report error on normal close/reconnect cycle', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Close and reconnect successfully
    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Advance past first reconnect delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // New WS opens
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    expect(mockReportError).not.toHaveBeenCalled();
  });

  it('resets reconnection attempts when effect re-runs', async () => {
    vi.useFakeTimers();

    let shouldAutoOpen = true;
    const OriginalMockWebSocket = MockWebSocket;

    // WebSocket where close() triggers onclose synchronously (realistic browser behavior)
    // and auto-open is controllable
    vi.stubGlobal(
      'WebSocket',
      class RealisticWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        url: string;
        close() {
          this.readyState = 3;
          this.onclose?.();
        }
        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          if (shouldAutoOpen) {
            setTimeout(() => {
              this.readyState = 1;
              this.onopen?.();
            }, 0);
          }
        }
      },
    );

    // Start with a connection that opens successfully
    let currentUser = { ...testUser };
    const { result, rerender } = renderHook(({ user }) => useCollaboration('tmpl-1', user), {
      initialProps: { user: currentUser },
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Disable auto-open and exhaust all 5 retry attempts
    shouldAutoOpen = false;

    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });

    const delays = [1000, 2000, 4000, 8000, 16000];
    for (const delay of delays) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
      act(() => {
        const ws = wsRef();
        ws.readyState = 3;
        ws.onclose?.();
      });
      await act(async () => {
        await Promise.resolve();
      });
    }

    // Verify we're permanently disconnected and reportError was called
    expect(result.current.status).toBe('disconnected');
    expect(mockReportError).toHaveBeenCalled();
    mockReportError.mockClear();

    // Re-enable auto-open for the fresh connection
    shouldAutoOpen = true;

    // Re-render with a new user object reference (same data, different object)
    // This simulates what TemplateEditorPage does on every render.
    // Effect cleanup calls ws.close() → onclose fires → scheduleReconnect() runs
    // with the stale reconnectAttemptRef (still at 5), immediately calling reportError.
    currentUser = { ...testUser };
    rerender({ user: currentUser });

    // Let the new WS open
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Bug: the cleanup-triggered onclose called scheduleReconnect with stale counter,
    // which called reportError again even though this is just an effect re-run
    expect(mockReportError).not.toHaveBeenCalled();

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('cleanup does not leak reconnect timer', async () => {
    vi.useFakeTimers();

    // Track WebSocket instances created AFTER unmount
    const { result, unmount } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open the WebSocket
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Override this specific WS instance's close() to trigger onclose synchronously
    // (this is realistic browser behavior)
    const ws = wsRef();
    ws.close = vi.fn().mockImplementation(() => {
      ws.readyState = MockWebSocket.CLOSED;
      ws.onclose?.();
    });

    const instanceCountBeforeUnmount = wsInstances.length;

    // Unmount triggers cleanup:
    // 1. clearTimeout(reconnectTimerRef.current) — clears any existing timer
    // 2. ws.close() — fires onclose synchronously
    // 3. onclose calls scheduleReconnect() — sets a NEW timer (leaked!)
    unmount();

    // Advance timers well past the longest reconnect delay
    // If a timer leaked, it will fire and create a new WebSocket
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    // No new WebSocket instances should have been created after unmount
    // Bug: the leaked timer from scheduleReconnect creates a new connection
    expect(wsInstances.length).toBe(instanceCountBeforeUnmount);
  });

  it('stale async onclose from old WebSocket does not set status to reconnecting (React #185)', async () => {
    vi.useFakeTimers();
    const OriginalMockWebSocket = MockWebSocket;

    // Track onclose callbacks captured BEFORE cleanup nullifies them.
    // This simulates a browser delivering the close event asynchronously
    // after the handler was already set (before React cleanup runs).
    const capturedOnCloseHandlers: (() => void)[] = [];

    // CaptureWebSocket: captures onclose handler in onopen so we can fire it
    // later as a "stale" event from the old effect generation.
    vi.stubGlobal(
      'WebSocket',
      class CaptureWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        close = vi.fn();
        url: string;
        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          setTimeout(() => {
            this.readyState = 1;
            // Capture the onclose handler while it's still attached
            if (this.onclose) {
              capturedOnCloseHandlers.push(this.onclose);
            }
            this.onopen?.();
          }, 0);
        }
      },
    );

    let currentUser = { ...testUser };
    const { result, rerender } = renderHook(({ user }) => useCollaboration('tmpl-1', user), {
      initialProps: { user: currentUser },
    });

    // Step 1: Open the initial WebSocket connection
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');
    // The first WS's onclose handler was captured during onopen
    expect(capturedOnCloseHandlers).toHaveLength(1);

    // Step 2: Re-render with a changed user value (different color).
    // Cleanup nullifies handlers and closes the old WS. New effect starts.
    currentUser = { ...testUser, color: '#00ff00' };
    rerender({ user: currentUser });

    // Step 3: Let the NEW WebSocket open successfully
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');
    // Second WS's onclose also captured
    expect(capturedOnCloseHandlers).toHaveLength(2);

    // Step 4: Fire the stale onclose from the OLD WebSocket (captured before cleanup).
    // The generation counter ensures this is ignored since generationRef.current
    // was incremented by the new effect run.
    act(() => {
      const staleOnclose = capturedOnCloseHandlers[0];
      if (!staleOnclose) throw new Error('Expected captured onclose callback');
      staleOnclose();
    });
    // Flush microtask queue (onclose is deferred via queueMicrotask)
    await act(async () => {
      await Promise.resolve();
    });

    // The status should still be 'connected' — the stale onclose should be ignored
    // because its captured generation no longer matches generationRef.current.
    expect(result.current.status).toBe('connected');

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('rapid user reference changes do not cause error spam', async () => {
    vi.useFakeTimers();
    const OriginalMockWebSocket = MockWebSocket;

    // WebSocket where close() triggers onclose synchronously (realistic browser behavior)
    vi.stubGlobal(
      'WebSocket',
      class RealisticWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        url: string;
        close() {
          this.readyState = 3;
          this.onclose?.();
        }
        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          // Always auto-open
          setTimeout(() => {
            this.readyState = 1;
            this.onopen?.();
          }, 0);
        }
      },
    );

    let currentUser = { ...testUser };
    const { result, rerender } = renderHook(({ user }) => useCollaboration('tmpl-1', user), {
      initialProps: { user: currentUser },
    });

    // Open the initial WebSocket
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Simulate 10 rapid re-renders with new user object references WITHOUT
    // advancing timers between them. Each re-render triggers:
    // effect cleanup → ws.close() → onclose (sync) → scheduleReconnect()
    // Since onopen never fires (timers not advanced), reconnectAttemptRef accumulates.
    // After 5 re-renders, the counter hits max and scheduleReconnect calls reportError.
    for (let i = 0; i < 10; i++) {
      currentUser = { ...testUser };
      rerender({ user: currentUser });
    }

    // reportError should NEVER be called — these are intentional teardowns from
    // React effect cleanup, not real connection failures.
    expect(mockReportError).not.toHaveBeenCalled();

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('stale onclose from reconnect-replaced WebSocket does not double-schedule reconnect', async () => {
    vi.useFakeTimers();
    const OriginalMockWebSocket = MockWebSocket;

    // Track all WebSocket instances and their handlers for fine-grained control
    const wsTracker: {
      instance: MockWebSocket;
      oncloseHandler: (() => void) | null;
    }[] = [];

    vi.stubGlobal(
      'WebSocket',
      class TrackedWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        url: string;
        private trackerEntry: (typeof wsTracker)[number];
        close = vi.fn().mockImplementation(() => {
          this.readyState = 3;
          // Store the onclose handler for deferred firing — do NOT call it now
          this.trackerEntry.oncloseHandler = this.onclose;
        });
        constructor(url: string) {
          this.url = url;
          this.trackerEntry = { instance: this as unknown as MockWebSocket, oncloseHandler: null };
          wsTracker.push(this.trackerEntry);
          wsInstances.push(this as unknown as MockWebSocket);
          // Auto-open after microtask
          setTimeout(() => {
            this.readyState = 1;
            this.onopen?.();
          }, 0);
        }
      },
    );

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Step 1: WS1 opens successfully
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');
    expect(wsTracker).toHaveLength(1);

    // Step 2: WS1 disconnects — trigger onclose directly (server drop)
    act(() => {
      const ws1 = wsTracker[0]?.instance;
      if (ws1) {
        ws1.readyState = 3;
        ws1.onclose?.();
      }
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Step 3: Reconnect timer fires → connect() creates WS2
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('connecting');
    expect(wsTracker).toHaveLength(2);

    // WS2 opens successfully
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Step 4: Now simulate WS1's DEFERRED onclose firing (stale event)
    // In the buggy code, WS1's onclose handler is still attached and `cancelled === false`
    // (same effect), so it would call setStatus('reconnecting') + scheduleReconnect()
    const ws1Entry = wsTracker[0];
    const staleOnclose = ws1Entry?.oncloseHandler ?? ws1Entry?.instance.onclose;

    if (staleOnclose) {
      act(() => {
        staleOnclose();
      });
      await act(async () => {
        await Promise.resolve();
      });
    }

    // Status should still be 'connected' — stale onclose must be a no-op
    expect(result.current.status).toBe('connected');

    // No extra WebSocket instances should be created from double-scheduling
    expect(wsTracker).toHaveLength(2);

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('rapid WebSocket failures do not create more than one pending WebSocket', async () => {
    vi.useFakeTimers();
    const OriginalMockWebSocket = MockWebSocket;

    // WebSocket that immediately errors on creation
    let wsCreateCount = 0;
    vi.stubGlobal(
      'WebSocket',
      class FailingWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        close = vi.fn().mockImplementation(function (this: {
          readyState: number;
          onclose: (() => void) | null;
        }) {
          this.readyState = 3;
          // onclose fires asynchronously after close()
          setTimeout(() => {
            this.onclose?.();
          }, 0);
        });
        url: string;
        constructor(url: string) {
          this.url = url;
          wsCreateCount++;
          wsInstances.push(this as unknown as MockWebSocket);
          // Immediately error
          setTimeout(() => {
            this.onerror?.();
          }, 0);
        }
      },
    );

    renderHook(() => useCollaboration('tmpl-1', testUser));

    // Initial connect creates WS1, which immediately errors → close() → deferred onclose
    // After each reconnect delay, a new WS is created
    // With the bug, stale onclose handlers can fire and create EXTRA WebSockets

    // Process through 3 reconnect cycles
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.runAllTimersAsync();
      });
    }

    // Count should be at most 6 (initial + 5 reconnect attempts before giving up)
    // vi.runAllTimersAsync() exhausts the full reconnect chain in one call, so
    // the relevant property is that the chain terminates (not exponential growth).
    // With the bug, stale onclose handlers fire after close() without bounds.
    // Change 2 (timer-clearing in scheduleReconnect) prevents unbounded double-scheduling.
    expect(wsCreateCount).toBeLessThanOrEqual(6);

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('reconnect counter is only reset after connection is stable for 5 seconds', async () => {
    vi.useFakeTimers();
    const OriginalMockWebSocket = MockWebSocket;

    // WebSocket where we control open/close manually
    vi.stubGlobal(
      'WebSocket',
      class ManualWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onclose: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        binaryType = 'blob';
        send = vi.fn();
        close = vi.fn();
        url: string;
        constructor(url: string) {
          this.url = url;
          wsInstances.push(this as unknown as MockWebSocket);
          // Auto-open after microtask
          setTimeout(() => {
            this.readyState = 1;
            this.onopen?.();
          }, 0);
        }
      },
    );

    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Step 1: Open initial connection (advance only enough to fire setTimeout(0))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.status).toBe('connected');

    // Step 2: Close the WebSocket (server drop) before 5s stability timer fires
    act(() => {
      const ws = wsRef();
      ws.readyState = 3;
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Step 3: Advance past first reconnect delay (1000ms) — reconnect attempt 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    // New WebSocket's setTimeout(onopen, 0) needs to fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.status).toBe('connected');

    // Step 4: Immediately close again (before 5s stability timer fires)
    // The reconnect counter should NOT have been reset to 0 yet
    act(() => {
      const ws = wsRef();
      ws.readyState = 3;
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Step 5: Next reconnect should use delay index 1 (2000ms), not 0 (1000ms),
    // proving the counter was not reset prematurely
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    // After only 1000ms, should still be reconnecting (not connecting)
    // because the next delay is 2000ms
    expect(result.current.status).toBe('reconnecting');

    // Advance another 1000ms to reach 2000ms total
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('connecting');

    // Step 6: Let this connection open (setTimeout(onopen, 0))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.status).toBe('connected');

    // Advance 5 seconds for stability timer to fire and reset counter
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Step 7: Close again — should use delay index 0 (1000ms) since counter was reset
    act(() => {
      const ws = wsRef();
      ws.readyState = 3;
      ws.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // After 1000ms, should be connecting (delay index 0 = 1000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('connecting');

    vi.stubGlobal('WebSocket', OriginalMockWebSocket);
  });

  it('handles normal reconnect cycle without errors', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open connection
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // Trigger a close — this starts the reconnect cycle
    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Advance through reconnect delay and let new connection open
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.status).toBe('connected');
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it('skips redundant status update when onclose fires while already reconnecting', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCollaboration('tmpl-1', testUser));

    // Open initial connection
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.status).toBe('connected');

    // First close: status transitions to 'reconnecting'
    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    // Capture render count proxy: track status value before second close
    const statusAfterFirstClose = result.current.status;

    // Second close fires while already in 'reconnecting' state.
    // The statusRef guard should prevent a redundant state update and re-render.
    act(() => {
      wsRef().onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Status must remain 'reconnecting' — no state change, no redundant transition
    expect(result.current.status).toBe('reconnecting');
    // The value did not flip or reset
    expect(result.current.status).toBe(statusAfterFirstClose);
  });
});
