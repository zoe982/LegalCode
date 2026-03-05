import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from '../types/env.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  generatePKCE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  issueJWT,
  isEmailAllowed,
  generateRefreshToken,
} from '../services/auth.js';
import { UserService } from '../services/user.js';

const ACCESS_TOKEN_TTL = 900;
const REFRESH_TOKEN_TTL = 604800;
const PKCE_STATE_TTL = 300;

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/google', async (c) => {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = crypto.randomUUID();

  await c.env.AUTH_KV.put(`pkce:${state}`, JSON.stringify({ codeVerifier }), {
    expirationTtl: PKCE_STATE_TTL,
  });

  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const url = buildGoogleAuthUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    codeChallenge,
  });

  return c.redirect(url);
});

authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error || !code || !state) {
    return c.json({ error: 'OAuth authorization failed' }, 400);
  }

  const pkceData = await c.env.AUTH_KV.get(`pkce:${state}`);
  if (!pkceData) {
    return c.json({ error: 'Invalid or expired state' }, 400);
  }
  await c.env.AUTH_KV.delete(`pkce:${state}`);

  const { codeVerifier } = JSON.parse(pkceData) as { codeVerifier: string };

  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const tokens = await exchangeCodeForTokens({
    code: code,
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
    codeVerifier,
  });

  const googleUser = await fetchGoogleUserInfo(tokens.access_token);

  if (!isEmailAllowed(googleUser.email, c.env.ALLOWED_EMAILS)) {
    return c.json({ error: 'Email not authorized' }, 403);
  }

  const userService = new UserService(c.env.DB);
  const user = await userService.findByEmail(googleUser.email);
  if (!user) {
    return c.json({ error: 'User not provisioned. Contact an admin.' }, 403);
  }

  const accessToken = await issueJWT(
    { sub: user.id, email: user.email, role: user.role },
    c.env.JWT_SECRET,
    ACCESS_TOKEN_TTL,
  );

  const refreshToken = generateRefreshToken();
  await c.env.AUTH_KV.put(
    `refresh:${refreshToken}`,
    JSON.stringify({ userId: user.id, email: user.email, role: user.role }),
    { expirationTtl: REFRESH_TOKEN_TTL },
  );

  setCookie(c, '__Host-auth', accessToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_TTL,
  });

  setCookie(c, '__Host-refresh', refreshToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: REFRESH_TOKEN_TTL,
  });

  return c.redirect('http://localhost:5173');
});

authRoutes.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, '__Host-refresh');
  if (!refreshToken) {
    return c.json({ error: 'No refresh token' }, 401);
  }

  const data = await c.env.AUTH_KV.get(`refresh:${refreshToken}`);
  if (!data) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  await c.env.AUTH_KV.delete(`refresh:${refreshToken}`);

  const { userId, email, role } = JSON.parse(data) as {
    userId: string;
    email: string;
    role: string;
  };

  const newAccessToken = await issueJWT(
    { sub: userId, email, role: role as 'admin' | 'editor' | 'viewer' },
    c.env.JWT_SECRET,
    ACCESS_TOKEN_TTL,
  );

  const newRefreshToken = generateRefreshToken();
  await c.env.AUTH_KV.put(`refresh:${newRefreshToken}`, JSON.stringify({ userId, email, role }), {
    expirationTtl: REFRESH_TOKEN_TTL,
  });

  setCookie(c, '__Host-auth', newAccessToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_TTL,
  });

  setCookie(c, '__Host-refresh', newRefreshToken, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: REFRESH_TOKEN_TTL,
  });

  return c.json({ ok: true });
});

authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ user });
});

authRoutes.post('/logout', authMiddleware, async (c) => {
  const refreshToken = getCookie(c, '__Host-refresh');
  if (refreshToken) {
    await c.env.AUTH_KV.delete(`refresh:${refreshToken}`);
  }

  deleteCookie(c, '__Host-auth', { path: '/', secure: true });
  deleteCookie(c, '__Host-refresh', { path: '/', secure: true });

  return c.json({ ok: true });
});
