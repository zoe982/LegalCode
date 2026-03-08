import type { Context } from 'hono';
import { Hono } from 'hono';
import type { AppEnv } from '../types/env.js';
import { getDb } from '../db/index.js';
import { getComments, createComment, resolveComment, deleteComment } from '../services/comment.js';
import { logAudit } from '../services/audit-log.js';

// Parent route mounts at /:id/comments — param is always present
function getTemplateId(c: Context<AppEnv>): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by parent route /:id/comments
  return c.req.param('id')!;
}

export const commentRoutes = new Hono<AppEnv>();

commentRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const result = await getComments(db, templateId);
  return c.json(result);
});

commentRoutes.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const user = c.get('user');
  const body: unknown = await c.req.json();

  try {
    const result = await createComment(db, templateId, body, {
      id: user.id,
      email: user.email,
      name: user.email, // Use email as name since AuthUser doesn't have name
    });

    // Fire-and-forget: notify DO for real-time broadcast
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (c.env.TEMPLATE_SESSION) {
      const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
      const stub = c.env.TEMPLATE_SESSION.get(doId);
      c.executionCtx.waitUntil(
        stub.fetch(
          new Request('https://internal/comment-event', {
            method: 'POST',
            body: JSON.stringify({ type: 'comment_changed' }),
          }),
        ),
      );
    }

    c.executionCtx.waitUntil(
      logAudit(db, {
        action: 'comment.create',
        resourceType: 'comment',
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

commentRoutes.patch('/:commentId/resolve', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const commentId = c.req.param('commentId');
  const user = c.get('user');

  const result = await resolveComment(db, templateId, commentId, {
    id: user.id,
    role: user.role,
  });

  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Comment not found' }, 404);
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Fire-and-forget: notify DO
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env.TEMPLATE_SESSION) {
    const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
    const stub = c.env.TEMPLATE_SESSION.get(doId);
    c.executionCtx.waitUntil(
      stub.fetch(
        new Request('https://internal/comment-event', {
          method: 'POST',
          body: JSON.stringify({ type: 'comment_changed' }),
        }),
      ),
    );
  }

  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'comment.resolve',
      resourceType: 'comment',
      resourceId: commentId,
      userId: user.id,
      userEmail: user.email,
      metadata: { templateId },
    }),
  );

  return c.body(null, 204);
});

commentRoutes.delete('/:commentId', async (c) => {
  const db = getDb(c.env.DB);
  const templateId = getTemplateId(c);
  const commentId = c.req.param('commentId');
  const user = c.get('user');

  const result = await deleteComment(db, templateId, commentId, {
    id: user.id,
    role: user.role,
  });

  if ('error' in result) {
    if (result.error === 'not_found') return c.json({ error: 'Comment not found' }, 404);
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Fire-and-forget: notify DO
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (c.env.TEMPLATE_SESSION) {
    const doId = c.env.TEMPLATE_SESSION.idFromName(templateId);
    const stub = c.env.TEMPLATE_SESSION.get(doId);
    c.executionCtx.waitUntil(
      stub.fetch(
        new Request('https://internal/comment-event', {
          method: 'POST',
          body: JSON.stringify({ type: 'comment_changed' }),
        }),
      ),
    );
  }

  c.executionCtx.waitUntil(
    logAudit(db, {
      action: 'comment.delete',
      resourceType: 'comment',
      resourceId: commentId,
      userId: user.id,
      userEmail: user.email,
      metadata: { templateId },
    }),
  );

  return c.body(null, 204);
});
