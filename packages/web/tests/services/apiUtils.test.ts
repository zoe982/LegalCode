import { describe, it, expect } from 'vitest';
import { extractApiError } from '../../src/services/apiUtils.js';

describe('extractApiError', () => {
  it('throws with API error message from JSON body', async () => {
    const response = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
    });
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow('Rate limit exceeded');
  });

  it('throws with fallback when JSON body has no error field', async () => {
    const response = new Response(JSON.stringify({ ok: false }), { status: 400 });
    await expect(extractApiError(response, 'Fallback message')).rejects.toThrow(
      'Fallback message (HTTP 400: {"ok":false})',
    );
  });

  it('throws with fallback when body is not JSON', async () => {
    const response = new Response('Server Error', { status: 500 });
    await expect(extractApiError(response, 'Fallback message')).rejects.toThrow(
      'Fallback message (HTTP 500: Server Error)',
    );
  });

  it('includes details in error message when present', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Invalid input', details: { fieldErrors: { title: ['Required'] } } }),
      { status: 400 },
    );
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow('Invalid input');
  });

  it('does not include detail suffix when details is absent', async () => {
    const response = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow('Not found');
  });

  it('truncates long response body at 200 chars with ellipsis', async () => {
    const longBody = 'x'.repeat(300);
    const response = new Response(longBody, { status: 500 });
    const expected = `Fallback (HTTP 500: ${'x'.repeat(200)}...)`;
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow(expected);
  });

  it('omits preview when response body is empty', async () => {
    const response = new Response('', { status: 500 });
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow('Fallback (HTTP 500)');
  });

  it('falls through to fallback when JSON error field is empty string', async () => {
    const response = new Response(JSON.stringify({ error: '' }), { status: 403 });
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow(
      'Fallback (HTTP 403: {"error":""})',
    );
  });

  it('falls through to fallback when error field is non-string', async () => {
    const response = new Response(JSON.stringify({ error: 123 }), { status: 400 });
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow(
      'Fallback (HTTP 400: {"error":123})',
    );
  });

  it('falls back gracefully when response body is unreadable', async () => {
    const response = new Response('body', { status: 502 });
    // Consume body so .text() will reject
    await response.text();
    await expect(extractApiError(response, 'Fallback')).rejects.toThrow('Fallback (HTTP 502)');
  });
});
