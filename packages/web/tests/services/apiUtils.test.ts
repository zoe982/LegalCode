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
    await expect(extractApiError(response, 'Fallback message')).rejects.toThrow('Fallback message');
  });

  it('throws with fallback when body is not JSON', async () => {
    const response = new Response('Server Error', { status: 500 });
    await expect(extractApiError(response, 'Fallback message')).rejects.toThrow('Fallback message');
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
});
