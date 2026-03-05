import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types/env.js';

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
