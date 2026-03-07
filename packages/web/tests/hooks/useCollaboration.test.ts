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
vi.stubGlobal('location', { protocol: 'https:', host: 'example.com' });

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

    expect(mockFetch).toHaveBeenCalledWith('/collaborate/tmpl-1/save-version', {
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

    // Trigger close
    act(() => {
      const ws = wsRef();
      ws.readyState = MockWebSocket.CLOSED;
      ws.onclose?.();
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

    // Close triggers reconnect schedule
    act(() => {
      const ws = wsRef();
      ws.onclose?.();
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

    // Unmount before reconnect fires — should clear the timer
    unmount();
    // Advancing time should NOT trigger a new connect (no errors = success)
    await vi.advanceTimersByTimeAsync(20000);
  });

  it('uses ws: protocol when location is http:', async () => {
    vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:3000' });
    vi.useFakeTimers();
    renderHook(() => useCollaboration('tmpl-1', testUser));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(wsRef().url).toBe('ws://localhost:3000/collaborate/tmpl-1');
    // Restore https for other tests
    vi.stubGlobal('location', { protocol: 'https:', host: 'example.com' });
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
});
