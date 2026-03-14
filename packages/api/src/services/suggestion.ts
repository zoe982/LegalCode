import { eq, and } from 'drizzle-orm';
import { createSuggestionSchema } from '@legalcode/shared';
import type { AppDb } from '../db/index.js';
import { suggestions } from '../db/schema.js';

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function nowISO(): string {
  return new Date().toISOString();
}

export async function getSuggestions(db: AppDb, templateId: string) {
  return db
    .select()
    .from(suggestions)
    .where(eq(suggestions.templateId, templateId))
    .orderBy(suggestions.createdAt);
}

export async function createSuggestion(
  db: AppDb,
  templateId: string,
  input: unknown,
  user: { id: string; email: string; name?: string },
) {
  const parsed = createSuggestionSchema.parse(input);
  const id = crypto.randomUUID();
  const now = nowISO();

  const row = {
    id,
    templateId,
    authorId: user.id,
    authorName: user.name ?? user.email,
    authorEmail: user.email,
    type: parsed.type,
    anchorFrom: parsed.anchorFrom,
    anchorTo: parsed.anchorTo,
    originalText: stripHtml(parsed.originalText),
    replacementText: parsed.replacementText ? stripHtml(parsed.replacementText) : null,
    status: 'pending' as const,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(suggestions).values(row);
  return row;
}

export async function acceptSuggestion(
  db: AppDb,
  templateId: string,
  suggestionId: string,
  user: { id: string; email: string; role?: string },
) {
  const existing = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.templateId, templateId)));
  const suggestion = existing[0];
  if (!suggestion) return { error: 'not_found' as const };

  if (suggestion.status !== 'pending') return { error: 'invalid_state' as const };

  const now = nowISO();
  await db
    .update(suggestions)
    .set({
      status: 'accepted',
      resolvedBy: user.id,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(suggestions.id, suggestionId));

  // Auto-reject overlapping pending suggestions (fetch in JS, filter for overlap)
  const anchorFrom = parseInt(suggestion.anchorFrom, 10);
  const anchorTo = parseInt(suggestion.anchorTo, 10);

  const otherPending = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.templateId, templateId), eq(suggestions.status, 'pending')));

  for (const other of otherPending) {
    if (other.id === suggestionId) continue;
    const otherFrom = parseInt(other.anchorFrom, 10);
    const otherTo = parseInt(other.anchorTo, 10);
    // Overlap: ranges intersect if otherFrom <= anchorTo AND otherTo >= anchorFrom
    if (otherFrom <= anchorTo && otherTo >= anchorFrom) {
      await db
        .update(suggestions)
        .set({
          status: 'rejected',
          resolvedBy: user.id,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(eq(suggestions.id, other.id));
    }
  }

  return { ok: true };
}

export async function rejectSuggestion(
  db: AppDb,
  templateId: string,
  suggestionId: string,
  user: { id: string; email: string; role?: string },
) {
  const existing = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.templateId, templateId)));
  const suggestion = existing[0];
  if (!suggestion) return { error: 'not_found' as const };

  if (suggestion.status !== 'pending') return { error: 'invalid_state' as const };

  const now = nowISO();
  await db
    .update(suggestions)
    .set({
      status: 'rejected',
      resolvedBy: user.id,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(suggestions.id, suggestionId));

  return { ok: true };
}

export async function deleteSuggestion(
  db: AppDb,
  templateId: string,
  suggestionId: string,
  user: { id: string; email: string; role?: string },
) {
  const existing = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.templateId, templateId)));
  const suggestion = existing[0];
  if (!suggestion) return { error: 'not_found' as const };

  // Only author or admin can delete
  if (suggestion.authorId !== user.id && user.role !== 'admin') {
    return { error: 'forbidden' as const };
  }

  await db
    .delete(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.templateId, templateId)));

  return { ok: true };
}
