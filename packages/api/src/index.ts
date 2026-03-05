import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import type { AppEnv } from './types/env.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.use(
  '*',
  csrf({
    origin: ['http://localhost:5173'],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);

export default app;
