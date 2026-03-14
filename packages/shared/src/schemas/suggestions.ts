import { z } from 'zod';

export const suggestionTypeSchema = z.enum(['insert', 'delete']);

export const suggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

export const suggestionSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  type: suggestionTypeSchema,
  anchorFrom: z.string(),
  anchorTo: z.string(),
  originalText: z.string(),
  replacementText: z.string().nullable(),
  status: suggestionStatusSchema,
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createSuggestionSchema = z.object({
  type: suggestionTypeSchema,
  anchorFrom: z.string().min(1),
  anchorTo: z.string().min(1),
  originalText: z.string().max(10000),
  replacementText: z.string().max(10000).optional(),
});

export const suggestionsResponseSchema = z.array(suggestionSchema);

export type SuggestionResponse = z.infer<typeof suggestionSchema>;
export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;
export type SuggestionType = z.infer<typeof suggestionTypeSchema>;
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;
