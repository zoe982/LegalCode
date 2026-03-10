import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';
import { reportError } from '../services/errorReporter.js';

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
  isSynced: boolean;
  reconnect: () => void;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export interface CollaborationOptions {
  onCommentEvent?: (() => void) | undefined;
}

export function useCollaboration(
  templateId: string | null,
  user: CollaborationUser | null,
  options?: CollaborationOptions,
): UseCollaborationReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const closingRef = useRef(false);
  const connectFnRef = useRef<(() => void) | null>(null);
  const onCommentEventRef = useRef(options ? options.onCommentEvent : undefined);
  onCommentEventRef.current = options ? options.onCommentEvent : undefined;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!templateId || !userRef.current) return undefined;

    reconnectAttemptRef.current = 0;
    closingRef.current = false;
    let cancelled = false;

    // Safety net: track status update timestamps to detect render loops.
    // If more than 10 status updates happen within a 5-second window, force disconnect.
    const statusUpdateTimestamps: number[] = [];

    function safeSetStatus(newStatus: ConnectionStatus) {
      const now = Date.now();
      // Remove timestamps older than 5 seconds
      while (statusUpdateTimestamps.length > 0 && (statusUpdateTimestamps[0] ?? 0) < now - 5000) {
        statusUpdateTimestamps.shift();
      }
      statusUpdateTimestamps.push(now);

      if (statusUpdateTimestamps.length > 10) {
        // Render loop detected — force disconnect
        /* v8 ignore next 2 -- defensive guard; cancelled is always false on first trigger */
        if (!cancelled) {
          const loopCount = statusUpdateTimestamps.length;
          cancelled = true;
          closingRef.current = true;
          wsRef.current?.close();
          setStatus('disconnected');
          statusUpdateTimestamps.length = 0;
          void reportError({
            source: 'websocket',
            severity: 'error',
            message: 'Render loop detected: too many status updates in 5s',
            metadata: JSON.stringify({
              templateId,
              statusUpdateCount: loopCount,
              reconnectAttempt: reconnectAttemptRef.current,
            }),
            url: window.location.href,
          });
        }
        return;
      }

      setStatus(newStatus);
    }

    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    ydocRef.current = ydoc;
    awarenessRef.current = awareness;

    // Set local awareness state
    awareness.setLocalStateField('user', {
      name: userRef.current.email,
      color: userRef.current.color,
      userId: userRef.current.userId,
    });

    // IndexedDB persistence for offline support
    const idb = new IndexeddbPersistence(`legalcode-${templateId}`, ydoc);
    idbRef.current = idb;

    // Track connected users from awareness
    const onAwarenessChange = () => {
      const users: CollaborationUser[] = [];
      awareness.getStates().forEach((state: Record<string, unknown>) => {
        const u = state.user as CollaborationUser | undefined;
        if (u) {
          users.push(u);
        }
      });
      setConnectedUsers((prev) => {
        if (prev.length !== users.length) return users;
        const changed = users.some(
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- prev[i] may be undefined if noUncheckedIndexedAccess is off
          (u, i) => u.userId !== prev[i]?.userId || u.email !== prev[i]?.email,
        );
        return changed ? users : prev;
      });
    };
    awareness.on('change', onAwarenessChange);

    function connect() {
      /* v8 ignore next -- defensive guard; cancelled checked first in scheduleReconnect */
      if (cancelled) return;

      // Close previous WebSocket from prior reconnect attempt within this effect.
      // Nullify handlers first to prevent stale onclose/onopen from firing.
      if (wsRef.current) {
        const prev = wsRef.current;
        prev.onopen = null;
        prev.onclose = null;
        prev.onerror = null;
        prev.onmessage = null;
        prev.close();
        wsRef.current = null;
      }

      safeSetStatus('connecting');

      const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${globalThis.location.host}/api/collaborate/${String(templateId)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        safeSetStatus('connected');
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const data = new Uint8Array(event.data);
        if (data.length < 1) return;
        // MSG_COMMENT = 2
        if (data[0] === 2) {
          if (onCommentEventRef.current) onCommentEventRef.current();
        }
      };

      ws.onclose = () => {
        if (!cancelled && !closingRef.current) {
          safeSetStatus('reconnecting');
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function scheduleReconnect() {
      /* v8 ignore next -- defensive guard; cleanup sets cancelled before close triggers this */
      if (cancelled) return;

      // Clear any existing reconnect timer to prevent double-scheduling
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const attempt = reconnectAttemptRef.current;
      if (attempt >= RECONNECT_DELAYS.length) {
        safeSetStatus('disconnected');
        void reportError({
          source: 'websocket',
          severity: 'warning',
          message: 'WebSocket disconnected permanently',
          metadata: JSON.stringify({ templateId }),
          url: window.location.href,
        });
        return;
      }
      /* v8 ignore next -- fallback unreachable; attempt is always a valid index */
      const delay = RECONNECT_DELAYS[attempt] ?? 16000;
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connectFnRef.current = connect;
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      cancelled = true;
      closingRef.current = true;
      connectFnRef.current = null;
      wsRef.current?.close();
      void idbRef.current?.destroy();
      awareness.off('change', onAwarenessChange);
      awareness.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      awarenessRef.current = null;
    };
  }, [templateId, user?.userId, user?.email, user?.color]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    connectFnRef.current?.();
  }, []);

  const saveVersion = useCallback(
    async (changeSummary: string) => {
      if (!templateId) return;

      const response = await fetch(`/api/collaborate/${templateId}/save-version`, {
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
    isSynced: status === 'connected',
    reconnect,
  };
}
