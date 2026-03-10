import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Polyfill PromiseRejectionEvent for jsdom
if (typeof PromiseRejectionEvent === 'undefined') {
  (globalThis as Record<string, unknown>).PromiseRejectionEvent =
    class PromiseRejectionEvent extends Event {
      reason: unknown;
      promise: Promise<unknown>;
      constructor(type: string, init: { reason: unknown; promise: Promise<unknown> }) {
        super(type);
        this.reason = init.reason;
        this.promise = init.promise;
      }
    };
}

const { reportError, installGlobalErrorHandlers } =
  await import('../../src/services/errorReporter.js');

// BUILD_TIMESTAMP resolves to 'dev' in the test environment (no Vite define)
const EXPECTED_BUILD_TIMESTAMP = 'dev';

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

function spyOnAddEventListener() {
  return vi.spyOn(window, 'addEventListener');
}

describe('errorReporter', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch().mockResolvedValue(new Response('{"ok":true}'));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('reportError', () => {
    it('POSTs to /errors/report with credentials include', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test error',
      });

      expect(fetchSpy).toHaveBeenCalledWith('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'frontend',
          message: 'Test error',
          buildTimestamp: EXPECTED_BUILD_TIMESTAMP,
        }),
      });
    });

    it('includes buildTimestamp in all error payloads', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test error',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.buildTimestamp).toBe(EXPECTED_BUILD_TIMESTAMP);
    });

    it('includes optional fields when provided', async () => {
      await reportError({
        source: 'functional',
        severity: 'critical',
        message: 'Bad thing',
        stack: 'Error\n  at foo',
        metadata: '{"key":"val"}',
        url: 'https://example.com',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          body: JSON.stringify({
            source: 'functional',
            severity: 'critical',
            message: 'Bad thing',
            stack: 'Error\n  at foo',
            metadata: '{"key":"val"}',
            url: 'https://example.com',
            buildTimestamp: EXPECTED_BUILD_TIMESTAMP,
          }),
        }),
      );
    });

    it('warns on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Forbidden', { status: 403 }));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await reportError({ source: 'frontend', message: 'Test' });

      expect(warnSpy).toHaveBeenCalledWith('Error reporting failed:', 403);
      warnSpy.mockRestore();
    });

    it('silently catches fetch failures', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(reportError({ source: 'frontend', message: 'Test' })).resolves.toBeUndefined();
    });
  });

  describe('installGlobalErrorHandlers', () => {
    let addEventListenerSpy: ReturnType<typeof spyOnAddEventListener>;
    let removeHandlers: (() => void) | undefined;

    beforeEach(() => {
      addEventListenerSpy = spyOnAddEventListener();
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      if (removeHandlers) {
        removeHandlers();
        removeHandlers = undefined;
      }
    });

    it('attaches error and unhandledrejection listeners', () => {
      removeHandlers = installGlobalErrorHandlers();

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('reports window error events', () => {
      removeHandlers = installGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: 'Uncaught TypeError',
        error: new Error('Uncaught TypeError'),
        filename: 'app.js',
        lineno: 42,
      });
      window.dispatchEvent(errorEvent);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.source).toBe('frontend');
      expect(body.severity).toBe('error');
      expect(body.message).toBe('Uncaught TypeError');
    });

    it('includes viewport and userAgent metadata in error events', () => {
      removeHandlers = installGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        error: new Error('Test error'),
      });
      window.dispatchEvent(errorEvent);

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('userAgent');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('buildTimestamp');
    });

    it('reports unhandledrejection events', () => {
      removeHandlers = installGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Rejected!'),
      });
      window.dispatchEvent(rejectionEvent);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.source).toBe('frontend');
      expect(body.severity).toBe('error');
      expect(body.message).toBe('Rejected!');
    });

    it('includes viewport and userAgent metadata in unhandledrejection events', () => {
      removeHandlers = installGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Rejected!'),
      });
      window.dispatchEvent(rejectionEvent);

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('userAgent');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('buildTimestamp');
    });

    it('handles non-Error rejection reasons', () => {
      removeHandlers = installGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: 'string rejection',
      });
      window.dispatchEvent(rejectionEvent);

      expect(fetchSpy).toHaveBeenCalled();
      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.message).toBe('string rejection');
    });

    it('handles error events without error object', () => {
      removeHandlers = installGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: 'Script error.',
      });
      window.dispatchEvent(errorEvent);

      expect(fetchSpy).toHaveBeenCalled();
      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.message).toBe('Script error.');
      expect(body.stack).toBeNull();
    });

    it('uses "Unknown error" when error event message is empty', () => {
      removeHandlers = installGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: '',
      });
      window.dispatchEvent(errorEvent);

      expect(fetchSpy).toHaveBeenCalled();
      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.message).toBe('Unknown error');
    });

    it('handles error with Error object that has no stack', () => {
      removeHandlers = installGlobalErrorHandlers();

      const error = new Error('Stack-less error');
      Object.defineProperty(error, 'stack', { value: undefined });
      const errorEvent = new ErrorEvent('error', {
        message: 'Stack-less error',
        error,
      });
      window.dispatchEvent(errorEvent);

      expect(fetchSpy).toHaveBeenCalled();
      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.stack).toBeNull();
    });

    it('handles rejection with Error that has no stack', () => {
      removeHandlers = installGlobalErrorHandlers();

      const error = new Error('No stack');
      Object.defineProperty(error, 'stack', { value: undefined });
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: error,
      });
      window.dispatchEvent(rejectionEvent);

      expect(fetchSpy).toHaveBeenCalled();
      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.message).toBe('No stack');
      expect(body.stack).toBeNull();
    });

    it('returns a cleanup function that removes listeners', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      removeHandlers = installGlobalErrorHandlers();
      removeHandlers();

      expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      removeSpy.mockRestore();
      removeHandlers = undefined;
    });
  });
});
