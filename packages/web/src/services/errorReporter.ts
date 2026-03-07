import type { ReportErrorInput } from '@legalcode/shared';

export async function reportError(report: ReportErrorInput): Promise<void> {
  try {
    await fetch('/admin/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(report),
    });
  } catch {
    // Silently ignore reporting failures
  }
}

export function installGlobalErrorHandlers(): () => void {
  function handleError(event: ErrorEvent): void {
    void reportError({
      source: 'frontend',
      message: event.message || 'Unknown error',
      stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
      url: window.location.href,
    });
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    const reason: unknown = event.reason;
    const isError = reason instanceof Error;
    void reportError({
      source: 'frontend',
      message: isError ? reason.message : String(reason),
      stack: isError ? (reason.stack ?? null) : null,
      url: window.location.href,
    });
  }

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
