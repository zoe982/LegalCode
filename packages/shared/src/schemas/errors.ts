import { z } from 'zod';

export const errorSourceSchema = z.enum(['frontend', 'backend', 'websocket', 'functional']);

export const errorSeveritySchema = z.enum(['error', 'warning', 'critical']);

export const errorStatusSchema = z.enum(['open', 'resolved']);

export const reportErrorSchema = z.object({
  source: errorSourceSchema,
  severity: errorSeveritySchema.optional(),
  message: z.string().min(1).max(5000),
  stack: z.string().max(50000).nullable().optional(),
  metadata: z.string().max(50000).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
});

export const errorQuerySchema = z.object({
  source: errorSourceSchema.optional(),
  status: errorStatusSchema.optional(),
  severity: errorSeveritySchema.optional(),
});

export const errorLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  source: errorSourceSchema,
  severity: errorSeveritySchema,
  message: z.string(),
  stack: z.string().nullable(),
  metadata: z.string().nullable(),
  url: z.string().nullable(),
  userId: z.string().nullable(),
  status: errorStatusSchema,
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  fingerprint: z.string().min(1),
  occurrenceCount: z.number().int().min(1),
  lastSeenAt: z.string().min(1),
});

export type ReportErrorInput = z.infer<typeof reportErrorSchema>;
