import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
