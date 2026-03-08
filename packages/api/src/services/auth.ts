import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import type { Role } from '@legalcode/shared';

const emailListSchema = z.array(z.string());

// --- PKCE ---

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const codeVerifier = base64urlEncode(randomBytes.buffer);

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
  const codeChallenge = base64urlEncode(digest);

  return { codeVerifier, codeChallenge };
}

// --- Google OAuth URL ---

interface GoogleAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export function buildGoogleAuthUrl(params: GoogleAuthUrlParams): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

// --- Token Exchange ---

interface ExchangeParams {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

export async function exchangeCodeForTokens(params: ExchangeParams): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status.toString()}`);
  }

  return response.json();
}

// --- Google User Info ---

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo failed: ${response.status.toString()}`);
  }

  return response.json();
}

// --- JWT ---

interface JWTClaims {
  sub: string;
  email: string;
  role: Role;
}

export async function issueJWT(
  payload: JWTClaims,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ ...payload, iat: now, exp: now + expiresInSeconds }, secret, 'HS256');
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTClaims & { iat: number; exp: number }> {
  const payload = await verify(token, secret, 'HS256');
  return payload as unknown as JWTClaims & { iat: number; exp: number };
}

// --- Helpers ---

export function isEmailAllowed(email: string, allowedEmails: string): boolean {
  const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

export async function isEmailAllowedWithKV(
  email: string,
  kv: KVNamespace,
  fallbackAllowedEmails: string,
): Promise<boolean> {
  const kvData = await kv.get('allowed_emails');
  if (kvData) {
    const emails = emailListSchema.parse(JSON.parse(kvData));
    return emails.map((e) => e.toLowerCase()).includes(email.toLowerCase());
  }
  return isEmailAllowed(email, fallbackAllowedEmails);
}

export async function getAllowedEmails(
  kv: KVNamespace,
  fallbackAllowedEmails: string,
): Promise<string[]> {
  const kvData = await kv.get('allowed_emails');
  if (kvData) {
    return emailListSchema.parse(JSON.parse(kvData));
  }
  return fallbackAllowedEmails
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export async function addAllowedEmail(
  kv: KVNamespace,
  fallbackAllowedEmails: string,
  email: string,
): Promise<string[]> {
  const current = await getAllowedEmails(kv, fallbackAllowedEmails);
  const lower = email.toLowerCase();
  if (current.map((e) => e.toLowerCase()).includes(lower)) {
    return current;
  }
  const updated = [...current, email];
  await kv.put('allowed_emails', JSON.stringify(updated));
  return updated;
}

export async function removeAllowedEmail(
  kv: KVNamespace,
  fallbackAllowedEmails: string,
  email: string,
): Promise<string[]> {
  const current = await getAllowedEmails(kv, fallbackAllowedEmails);
  const lower = email.toLowerCase();
  const updated = current.filter((e) => e.toLowerCase() !== lower);
  await kv.put('allowed_emails', JSON.stringify(updated));
  return updated;
}

export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
