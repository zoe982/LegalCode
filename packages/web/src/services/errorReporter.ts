import type { ReportErrorInput } from '@legalcode/shared';
import { BUILD_TIMESTAMP } from '../buildInfo.js';

export async function reportError(report: ReportErrorInput): Promise<void> {
  try {
    const response = await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...report, buildTimestamp: BUILD_TIMESTAMP }),
    });
    if (!response.ok) {
      console.warn('Error reporting failed:', response.status);
    }
  } catch {
    // Silently ignore network failures
  }
}

export function installGlobalErrorHandlers(): () => void {
  function handleError(event: ErrorEvent): void {
    void reportError({
      source: 'frontend',
      severity: 'error',
      message: event.message || 'Unknown error',
      stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
      url: window.location.href,
      metadata: JSON.stringify({
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        buildTimestamp: BUILD_TIMESTAMP,
      }),
    });
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    const reason: unknown = event.reason;
    const isError = reason instanceof Error;
    void reportError({
      source: 'frontend',
      severity: 'error',
      message: isError ? reason.message : String(reason),
      stack: isError ? (reason.stack ?? null) : null,
      url: window.location.href,
      metadata: JSON.stringify({
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        buildTimestamp: BUILD_TIMESTAMP,
      }),
    });
  }

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
