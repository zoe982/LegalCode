import { z } from 'zod';

export const variableTypeSchema = z.enum([
  'text',
  'date',
  'signature',
  'address',
  'number',
  'currency',
  'custom',
]);

export const variableDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: variableTypeSchema,
  customType: z.string().optional(),
});

export const variablesArraySchema = z.array(variableDefinitionSchema);
