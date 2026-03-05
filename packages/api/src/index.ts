import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import type { AppEnv } from './types/env.js';
import { errorHandler } from './middleware/error.js';
import { securityHeaders } from './middleware/security.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { templateRoutes } from './routes/templates.js';

const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.use('*', securityHeaders);

app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://legalcode.acasus.workers.dev',
      'https://legalcode.ax1access.com',
    ],
    credentials: true,
  }),
);

app.use(
  '*',
  csrf({
    origin: [
      'http://localhost:5173',
      'https://legalcode.acasus.workers.dev',
      'https://legalcode.ax1access.com',
    ],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);
app.route('/templates', templateRoutes);

export default app;
