import { eq, and, or } from 'drizzle-orm';
import { createCommentSchema } from '@legalcode/shared';
import type { AppDb } from '../db/index.js';
import { comments } from '../db/schema.js';

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function nowISO(): string {
  return new Date().toISOString();
}

export async function getComments(db: AppDb, templateId: string) {
  return db
    .select()
    .from(comments)
    .where(eq(comments.templateId, templateId))
    .orderBy(comments.createdAt);
}

export async function createComment(
  db: AppDb,
  templateId: string,
  input: unknown,
  user: { id: string; email: string; name?: string },
) {
  const parsed = createCommentSchema.parse(input);
  const id = crypto.randomUUID();
  const now = nowISO();

  const row = {
    id,
    templateId,
    parentId: parsed.parentId ?? null,
    authorId: user.id,
    authorName: user.name ?? user.email,
    authorEmail: user.email,
    content: stripHtml(parsed.content),
    anchorText: parsed.anchorText ? stripHtml(parsed.anchorText) : null,
    anchorFrom: parsed.anchorFrom ?? null,
    anchorTo: parsed.anchorTo ?? null,
    resolved: false,
    resolvedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(comments).values(row);
  return row;
}

export async function resolveComment(
  db: AppDb,
  templateId: string,
  commentId: string,
  user: { id: string; role: string },
) {
  const existing = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.templateId, templateId)));
  const comment = existing[0];
  if (!comment) return { error: 'not_found' as const };

  // Only author or admin can resolve
  if (comment.authorId !== user.id && user.role !== 'admin') {
    return { error: 'forbidden' as const };
  }

  await db
    .update(comments)
    .set({
      resolved: true,
      resolvedBy: user.id,
      updatedAt: nowISO(),
    })
    .where(eq(comments.id, commentId));

  return { ok: true };
}

export async function deleteComment(
  db: AppDb,
  templateId: string,
  commentId: string,
  user: { id: string; role: string },
) {
  const existing = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.templateId, templateId)));
  const comment = existing[0];
  if (!comment) return { error: 'not_found' as const };

  // Only author or admin can delete
  if (comment.authorId !== user.id && user.role !== 'admin') {
    return { error: 'forbidden' as const };
  }

  // Delete comment and its replies
  await db
    .delete(comments)
    .where(
      and(
        eq(comments.templateId, templateId),
        or(eq(comments.id, commentId), eq(comments.parentId, commentId)),
      ),
    );

  return { ok: true };
}
