import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export const collaborateRoutes = new Hono<AppEnv>();

collaborateRoutes.use('*', authMiddleware);
collaborateRoutes.use('*', requireRole('editor', 'admin'));

collaborateRoutes.get('/:templateId', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const templateId = c.req.param('templateId');
  const user = c.get('user');

  const doNamespace = c.env.TEMPLATE_SESSION;
  const doId = doNamespace.idFromName(templateId);
  const doStub = doNamespace.get(doId);

  // Forward with user info headers
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-User-Id', user.id);
  headers.set('X-User-Email', user.email);
  headers.set('X-User-Role', user.role);
  headers.set('X-Template-Id', templateId);

  const doRequest = new Request(c.req.url, {
    headers,
    method: c.req.method,
  });

  return doStub.fetch(doRequest);
});

collaborateRoutes.post('/:templateId/save-version', async (c) => {
  const templateId = c.req.param('templateId');
  const user = c.get('user');
  const rawBody: unknown = await c.req.json();
  const body =
    typeof rawBody === 'object' && rawBody !== null ? (rawBody as Record<string, unknown>) : {};

  const doNamespace = c.env.TEMPLATE_SESSION;
  const doId = doNamespace.idFromName(templateId);
  const doStub = doNamespace.get(doId);

  const changeSummary =
    typeof body.changeSummary === 'string' && body.changeSummary !== ''
      ? body.changeSummary
      : 'Manual save';

  const doRequest = new Request(new URL('/save-version', c.req.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      changeSummary,
    }),
  });

  return doStub.fetch(doRequest);
});
