import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('/api/auth/me', () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({ ok: true });
  }),
];
