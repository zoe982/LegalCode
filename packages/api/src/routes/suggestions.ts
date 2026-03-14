import type { Context } from 'hono';
import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { getDb } from '../db/index.js';
import {
  getSuggestions,
  createSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  deleteSuggestion,
} from '../services/suggestion.js';
import { logAudit } from '../services/audit-log.js';

// Parent route mounts at /:id/suggestions — param is always present
function getTemplateId(c: Context<AppEnv>): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by parent route /:id/suggestions
  return c.req.param('id')!;
}

export const suggestionRoutes = new Hono<AppEnv>();

suggestionRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const result = await getSuggestions(db, templateId);
  return c.json(result);
});

suggestionRoutes.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const user = c.get('user');
  const body: unknown = await c.req.json();

  try {
    const result = await createSuggestion(db, templateId, body, {
      id: user.id,
      email: user.email,
      name: user.email,
    });

    // Fire-and-forget: notify DO for real-time broadcast
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (c.env.TEMPLATE_SESSION) {
      const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
      const stub = c.env.TEMPLATE_SESSION.get(doId);
      c.executionCtx.waitUntil(
        stub.fetch(
          new Request('https://internal/suggestion-event', {
            method: 'POST',
            body: JSON.stringify({ type: 'suggestion_changed' }),
          }),
        ),
      );
    }

    c.executionCtx.waitUntil(
      logAudit(db, {
        action: 'suggestion.create',
        resourceType: 'suggestion',
        resourceId: result.id,
        userId: user.id,
        userEmail: user.email,
        metadata: { templateId },
      }),
    );

    return c.json(result, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('parse')) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    throw e;
  }
});

suggestionRoutes.patch('/:sid/accept', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const sid = c.req.param('sid');
  const user = c.get('user');

  const result = await acceptSuggestion(db, templateId, sid, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Suggestion not found' }, 404);
    return c.json({ error: 'Suggestion is not pending' }, 409);
  }

  // Fire-and-forget: notify DO
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env.TEMPLATE_SESSION) {
    const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
    const stub = c.env.TEMPLATE_SESSION.get(doId);
    c.executionCtx.waitUntil(
      stub.fetch(
        new Request('https://internal/suggestion-event', {
          method: 'POST',
          body: JSON.stringify({ type: 'suggestion_changed' }),
        }),
      ),
    );
  }

  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'suggestion.accept',
      resourceType: 'suggestion',
      resourceId: sid,
      userId: user.id,
      userEmail: user.email,
      metadata: { templateId },
    }),
  );

  return c.body(null, 204);
});

suggestionRoutes.patch('/:sid/reject', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const sid = c.req.param('sid');
  const user = c.get('user');

  const result = await rejectSuggestion(db, templateId, sid, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Suggestion not found' }, 404);
    return c.json({ error: 'Suggestion is not pending' }, 409);
  }

  // Fire-and-forget: notify DO
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env.TEMPLATE_SESSION) {
    const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
    const stub = c.env.TEMPLATE_SESSION.get(doId);
    c.executionCtx.waitUntil(
      stub.fetch(
        new Request('https://internal/suggestion-event', {
          method: 'POST',
          body: JSON.stringify({ type: 'suggestion_changed' }),
        }),
      ),
    );
  }

  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'suggestion.reject',
      resourceType: 'suggestion',
      resourceId: sid,
      userId: user.id,
      userEmail: user.email,
      metadata: { templateId },
    }),
  );

  return c.body(null, 204);
});

suggestionRoutes.delete('/:sid', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const sid = c.req.param('sid');
  const user = c.get('user');

  const result = await deleteSuggestion(db, templateId, sid, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Suggestion not found' }, 404);
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Fire-and-forget: notify DO
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env.TEMPLATE_SESSION) {
    const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
    const stub = c.env.TEMPLATE_SESSION.get(doId);
    c.executionCtx.waitUntil(
      stub.fetch(
        new Request('https://internal/suggestion-event', {
          method: 'POST',
          body: JSON.stringify({ type: 'suggestion_changed' }),
        }),
      ),
    );
  }

  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'suggestion.delete',
      resourceType: 'suggestion',
      resourceId: sid,
      userId: user.id,
      userEmail: user.email,
      metadata: { templateId },
    }),
  );

  return c.body(null, 204);
});
