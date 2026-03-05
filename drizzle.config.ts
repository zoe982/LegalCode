import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/api/src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
