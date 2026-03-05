import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'editor', 'viewer']);

export const templateStatusSchema = z.enum(['draft', 'active', 'archived']);

export const auditActionSchema = z.enum(['create', 'update', 'archive', 'export', 'login']);

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  country: z.string().length(2).nullable().optional(),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
});

export const updateTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  country: z.string().length(2).nullable().optional(),
  status: templateStatusSchema.optional(),
  content: z.string().min(1).optional(),
  changeSummary: z.string().max(500).optional(),
  tags: z.array(z.string().min(1)).optional(),
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

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;
