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

const { reportError, installGlobalErrorHandlers, collectDiagnostics } =
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

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
      );

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.source).toBe('frontend');
      expect(body.message).toBe('Test error');
      expect(body.buildTimestamp).toBe(EXPECTED_BUILD_TIMESTAMP);
      // metadata should contain diagnostics even when none was provided
      expect(body.metadata).toBeDefined();
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
          method: 'POST',
        }),
      );

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      expect(body.source).toBe('functional');
      expect(body.severity).toBe('critical');
      expect(body.message).toBe('Bad thing');
      expect(body.stack).toBe('Error\n  at foo');
      expect(body.url).toBe('https://example.com');
      expect(body.buildTimestamp).toBe(EXPECTED_BUILD_TIMESTAMP);
      // metadata now includes diagnostics merged with original
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('key', 'val');
      expect(metadata).toHaveProperty('buildHash');
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

    it('includes diagnostics in error event metadata', () => {
      removeHandlers = installGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: 'Diag test',
        error: new Error('Diag test'),
      });
      window.dispatchEvent(errorEvent);

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
      expect(metadata).toHaveProperty('bundleUrl');
      expect(metadata).toHaveProperty('swControlled');
    });

    it('includes diagnostics in unhandledrejection event metadata', () => {
      removeHandlers = installGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Diag rejection'),
      });
      window.dispatchEvent(rejectionEvent);

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
      expect(metadata).toHaveProperty('bundleUrl');
      expect(metadata).toHaveProperty('swControlled');
    });
  });

  describe('collectDiagnostics', () => {
    it('returns expected diagnostic fields', () => {
      const diagnostics = collectDiagnostics();
      expect(diagnostics).toHaveProperty('buildHash');
      expect(diagnostics).toHaveProperty('buildTimestamp');
      expect(diagnostics).toHaveProperty('bundleUrl');
      expect(diagnostics).toHaveProperty('swControlled');
      expect(typeof diagnostics.swControlled).toBe('boolean');
    });

    it('returns buildHash as string', () => {
      const diagnostics = collectDiagnostics();
      expect(typeof diagnostics.buildHash).toBe('string');
    });

    it('returns bundleUrl as string', () => {
      const diagnostics = collectDiagnostics();
      expect(typeof diagnostics.bundleUrl).toBe('string');
    });

    it('returns swControlled false when no service worker controller', () => {
      const originalSW = navigator.serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        writable: true,
        configurable: true,
      });

      const diagnostics = collectDiagnostics();
      expect(diagnostics.swControlled).toBe(false);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalSW,
        writable: true,
        configurable: true,
      });
    });

    it('returns swControlled true when service worker controller exists', () => {
      const originalSW = navigator.serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: {} },
        writable: true,
        configurable: true,
      });

      const diagnostics = collectDiagnostics();
      expect(diagnostics.swControlled).toBe(true);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalSW,
        writable: true,
        configurable: true,
      });
    });

    it('handles missing navigator.serviceWorker gracefully', () => {
      const originalSW = navigator.serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const diagnostics = collectDiagnostics();
      expect(diagnostics.swControlled).toBe(false);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalSW,
        writable: true,
        configurable: true,
      });
    });

    it('catches when navigator.serviceWorker getter throws', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
      Object.defineProperty(navigator, 'serviceWorker', {
        get() {
          throw new Error('SW access denied');
        },
        configurable: true,
      });

      const diagnostics = collectDiagnostics();
      expect(diagnostics.swControlled).toBe(false);

      if (originalDescriptor) {
        Object.defineProperty(navigator, 'serviceWorker', originalDescriptor);
      } else {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('reportError with diagnostics', () => {
    it('includes diagnostics in metadata when metadata is provided', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test with metadata',
        metadata: JSON.stringify({ custom: 'value' }),
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('custom', 'value');
      expect(metadata).toHaveProperty('buildHash');
      expect(metadata).toHaveProperty('buildTimestamp');
      expect(metadata).toHaveProperty('bundleUrl');
      expect(metadata).toHaveProperty('swControlled');
    });

    it('handles invalid JSON metadata gracefully', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test with bad metadata',
        metadata: 'not valid json{{{',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      // Should fall through to diagnostics-only since JSON.parse fails
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
      expect(metadata).toHaveProperty('buildTimestamp');
      expect(metadata).not.toHaveProperty('not valid json');
    });

    it('handles non-object JSON metadata (e.g. array)', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test with array metadata',
        metadata: '[1, 2, 3]',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      // Array is an object but we check typeof === 'object' && not null, arrays pass that.
      // Actually arrays would pass the check so the spread would work. Let me check...
      // `typeof [1,2,3]` is 'object' and it's not null, so it'll spread the array indices.
      // That's fine - the diagnostics will be included.
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
    });

    it('handles null JSON metadata', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test with null metadata',
        metadata: 'null',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      // JSON.parse('null') returns null, which fails the !== null check
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
    });

    it('includes diagnostics in metadata when no metadata is provided', async () => {
      await reportError({
        source: 'frontend',
        message: 'Test without metadata',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string) as Record<
        string,
        unknown
      >;
      const metadata = JSON.parse(body.metadata as string) as Record<string, unknown>;
      expect(metadata).toHaveProperty('buildHash');
      expect(metadata).toHaveProperty('buildTimestamp');
      expect(metadata).toHaveProperty('bundleUrl');
      expect(metadata).toHaveProperty('swControlled');
    });
  });
});
