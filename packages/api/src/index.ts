import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import type { AppEnv } from './types/env.js';
import { errorHandler } from './middleware/error.js';
import { securityHeaders } from './middleware/security.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { templateRoutes } from './routes/templates.js';
import { collaborateRoutes } from './routes/collaborate.js';
import { errorRoutes } from './routes/errors.js';

const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.use('*', securityHeaders);

app.use(
  '*',
  cors({
    origin: ['https://legalcode.acasus.workers.dev', 'https://legalcode.ax1access.com'],
    credentials: true,
  }),
);

app.use(
  '*',
  csrf({
    origin: ['https://legalcode.acasus.workers.dev', 'https://legalcode.ax1access.com'],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);
app.route('/errors', errorRoutes);
app.route('/templates', templateRoutes);
app.route('/collaborate', collaborateRoutes);

// Serve static assets, with SPA fallback to index.html
app.all('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    const indexUrl = new URL('/index.html', c.req.url);
    return c.env.ASSETS.fetch(new Request(indexUrl, c.req.raw));
  }
  return res;
});

export { TemplateSession } from './durable-objects/template-session.js';

export default app;
