import type { ReportErrorInput } from '@legalcode/shared';
import { BUILD_TIMESTAMP, BUILD_HASH } from '../buildInfo.js';

export function collectDiagnostics(): Record<string, unknown> {
  let swControlled = false;
  try {
    const sw = navigator.serviceWorker as ServiceWorkerContainer | undefined;
    swControlled = Boolean(sw?.controller);
  } catch {
    // navigator.serviceWorker may throw in some contexts
  }

  return {
    buildHash: BUILD_HASH,
    buildTimestamp: BUILD_TIMESTAMP,
    bundleUrl: import.meta.url,
    swControlled,
  };
}

function mergeMetadataWithDiagnostics(metadata: string | undefined): string {
  const diagnostics = collectDiagnostics();
  if (metadata) {
    try {
      const parsed: unknown = JSON.parse(metadata);
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify({ ...(parsed as Record<string, unknown>), ...diagnostics });
      }
    } catch {
      // If metadata isn't valid JSON, just use diagnostics
    }
  }
  return JSON.stringify(diagnostics);
}

export async function reportError(report: ReportErrorInput): Promise<void> {
  try {
    const enrichedReport = {
      ...report,
      metadata: mergeMetadataWithDiagnostics(report.metadata ?? undefined),
      buildTimestamp: BUILD_TIMESTAMP,
    };
    const response = await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(enrichedReport),
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
    const diagnostics = collectDiagnostics();
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
        ...diagnostics,
      }),
    });
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    const reason: unknown = event.reason;
    const isError = reason instanceof Error;
    const diagnostics = collectDiagnostics();
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
        ...diagnostics,
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
