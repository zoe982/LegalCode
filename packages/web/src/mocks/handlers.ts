import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('/auth/me', () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  http.post('/auth/logout', () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post('/auth/refresh', () => {
    return HttpResponse.json({ ok: true });
  }),
];
