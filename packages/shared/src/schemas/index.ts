import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'editor', 'viewer']);

export const templateStatusSchema = z.enum(['draft', 'active', 'archived']);

export const auditActionSchema = z.enum([
  'create',
  'update',
  'publish',
  'archive',
  'unarchive',
  'export',
  'login',
  'client_error',
]);

export function isAutoVersion(changeSummary: string | null): boolean {
  return changeSummary?.startsWith('[auto]') ?? false;
}

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  country: z.string().length(2).nullable().optional(),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
});

export const updateTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  country: z.string().length(2).nullable().optional(),
  content: z.string().min(1).optional(),
  changeSummary: z.string().max(500).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const templateSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  country: z.string().nullable(),
  status: templateStatusSchema,
  currentVersion: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTemplateResponseSchema = z.object({
  template: templateSchema,
  tags: z.array(z.string()),
});

export const templateQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  status: templateStatusSchema.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const autosaveDraftSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
});

export const autosaveDraftResponseSchema = z.object({
  updatedAt: z.string(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type AutosaveDraftInput = z.infer<typeof autosaveDraftSchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;

export * from './auth.js';
export * from './comments.js';
export * from './errors.js';
