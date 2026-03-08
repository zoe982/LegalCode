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
import { categoryRoutes } from './routes/categories.js';
import { countryRoutes } from './routes/countries.js';
import { requireJsonContentType } from './middleware/content-type.js';

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

app.use('/api/templates/*', requireJsonContentType);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/errors', errorRoutes);
app.route('/api/templates', templateRoutes);
app.route('/api/collaborate', collaborateRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/countries', countryRoutes);

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
