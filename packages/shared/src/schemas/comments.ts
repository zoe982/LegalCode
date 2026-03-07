import { z } from 'zod';

export const commentSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  parentId: z.string().nullable(),
  authorId: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  content: z.string(),
  anchorText: z.string().nullable(),
  anchorFrom: z.string().nullable(),
  anchorTo: z.string().nullable(),
  resolved: z.boolean(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  anchorText: z.string().max(500).optional(),
  anchorFrom: z.string().optional(),
  anchorTo: z.string().optional(),
});

export const commentsResponseSchema = z.array(commentSchema);

export type CommentResponse = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
