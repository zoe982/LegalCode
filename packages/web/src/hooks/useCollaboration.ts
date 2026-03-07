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
  const connectFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!templateId || !user) return undefined;

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
    const onAwarenessChange = () => {
      const users: CollaborationUser[] = [];
      awareness.getStates().forEach((state: Record<string, unknown>) => {
        const u = state.user as CollaborationUser | undefined;
        if (u) {
          users.push(u);
        }
      });
      setConnectedUsers(users);
    };
    awareness.on('change', onAwarenessChange);

    function connect() {
      setStatus('connecting');

      const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${globalThis.location.host}/collaborate/${String(templateId)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const data = new Uint8Array(event.data);
        if (data.length < 1) return;
        // MSG_COMMENT = 2
        if (data[0] === 2) {
          options?.onCommentEvent?.();
        }
      };

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
      if (attempt >= RECONNECT_DELAYS.length) {
        setStatus('disconnected');
        void reportError({
          source: 'websocket',
          severity: 'warning',
          message: 'WebSocket disconnected permanently',
          metadata: JSON.stringify({ templateId }),
          url: window.location.href,
        });
        return;
      }
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
      connectFnRef.current = null;
      wsRef.current?.close();
      void idbRef.current?.destroy();
      awareness.off('change', onAwarenessChange);
      awareness.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      awarenessRef.current = null;
    };
  }, [templateId, user]);

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
    isSynced: status === 'connected',
    reconnect,
  };
}
