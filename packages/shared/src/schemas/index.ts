import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'editor', 'viewer']);

export const auditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'restore',
  'hard_delete',
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
  country: z.string().min(2).max(3).nullable().optional(),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
});

export const updateTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  country: z.string().min(2).max(3).nullable().optional(),
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
  currentVersion: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
});

export const createTemplateResponseSchema = z.object({
  template: templateSchema,
  tags: z.array(z.string()),
});

export const templateQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const autosaveSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
});

export const autosaveResponseSchema = z.object({
  updatedAt: z.string(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type AutosaveInput = z.infer<typeof autosaveSchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  createdAt: z.string(),
});

export const createCountrySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(3),
});

export const updateCountrySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(2).max(3).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;

export * from './auth.js';
export * from './comments.js';
export * from './errors.js';
