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
  onSuggestionEvent?: (() => void) | undefined;
}

export function useCollaboration(
  templateId: string | null,
  user: CollaborationUser | null,
  options?: CollaborationOptions,
): UseCollaborationReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const generationRef = useRef(0);
  const reconnectResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);
  const onCommentEventRef = useRef(options ? options.onCommentEvent : undefined);
  onCommentEventRef.current = options ? options.onCommentEvent : undefined;
  const onSuggestionEventRef = useRef(options ? options.onSuggestionEvent : undefined);
  onSuggestionEventRef.current = options ? options.onSuggestionEvent : undefined;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!templateId || !userRef.current) return undefined;

    reconnectAttemptRef.current = 0;
    generationRef.current += 1;
    const generation = generationRef.current;
    let cancelled = false;

    function safeSetStatus(newStatus: ConnectionStatus) {
      /* v8 ignore next -- defensive guard; generation check prevents stale closures from cross-effect runs */
      if (cancelled || generation !== generationRef.current) return;
      if (newStatus === statusRef.current) return;
      statusRef.current = newStatus;
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
        /* v8 ignore next -- perf optimization; prev returned when awareness fires but users unchanged */
        return changed ? users : prev;
      });
    };
    awareness.on('change', onAwarenessChange);

    function connect() {
      /* v8 ignore next -- defensive guard; cancelled checked first in scheduleReconnect */
      if (cancelled || generation !== generationRef.current) return;

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
        /* v8 ignore next -- defensive guard; generation check prevents stale onopen from cross-effect runs */
        if (cancelled || generation !== generationRef.current) return;
        safeSetStatus('connected');
        // Only reset reconnect counter after connection is stable for 5 seconds
        const resetTimer = setTimeout(() => {
          if (!cancelled && generation === generationRef.current) {
            reconnectAttemptRef.current = 0;
          }
        }, 5000);
        reconnectResetTimerRef.current = resetTimer;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const data = new Uint8Array(event.data);
        if (data.length < 1) return;
        // MSG_COMMENT = 2
        if (data[0] === 2) {
          if (onCommentEventRef.current) onCommentEventRef.current();
        }
        // MSG_SUGGESTION = 3
        if (data[0] === 3) {
          if (onSuggestionEventRef.current) onSuggestionEventRef.current();
        }
      };

      ws.onclose = () => {
        queueMicrotask(() => {
          if (!cancelled && generation === generationRef.current) {
            if (reconnectResetTimerRef.current) {
              clearTimeout(reconnectResetTimerRef.current);
              reconnectResetTimerRef.current = null;
            }
            safeSetStatus('reconnecting');
            scheduleReconnect();
          }
        });
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function scheduleReconnect() {
      /* v8 ignore next -- defensive guard; cleanup sets cancelled before close triggers this */
      if (cancelled || generation !== generationRef.current) return;

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
        reconnectTimerRef.current = null;
      }
      if (reconnectResetTimerRef.current) {
        clearTimeout(reconnectResetTimerRef.current);
        reconnectResetTimerRef.current = null;
      }
      cancelled = true;
      connectFnRef.current = null;
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
        wsRef.current = null;
      }
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
