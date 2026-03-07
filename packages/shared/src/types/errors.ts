export type ErrorSource = 'frontend' | 'backend' | 'websocket' | 'functional';

export type ErrorSeverity = 'error' | 'warning' | 'critical';

export type ErrorStatus = 'open' | 'resolved';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  source: ErrorSource;
  severity: ErrorSeverity;
  message: string;
  stack: string | null;
  metadata: string | null;
  url: string | null;
  userId: string | null;
  status: ErrorStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  fingerprint: string;
  occurrenceCount: number;
  lastSeenAt: string;
}
