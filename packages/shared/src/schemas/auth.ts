import { z } from 'zod';
import { roleSchema } from './index.js';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: roleSchema,
});

export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

export const loginResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    role: roleSchema,
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
