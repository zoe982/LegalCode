import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePKCE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  issueJWT,
  verifyJWT,
  isEmailAllowed,
  generateRefreshToken,
} from '../../src/services/auth.js';

describe('generatePKCE', () => {
  it('returns a code_verifier and code_challenge', async () => {
    const result = await generatePKCE();
    expect(result.codeVerifier).toBeDefined();
    expect(result.codeChallenge).toBeDefined();
    expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(result.codeChallenge.length).toBeGreaterThan(0);
  });

  it('generates different values each time', async () => {
    const a = await generatePKCE();
    const b = await generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe('buildGoogleAuthUrl', () => {
  it('returns a URL with required OAuth parameters', () => {
    const url = buildGoogleAuthUrl({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:8787/auth/callback',
      state: 'random-state',
      codeChallenge: 'test-challenge',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:8787/auth/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toContain('email');
    expect(parsed.searchParams.get('scope')).toContain('profile');
    expect(parsed.searchParams.get('state')).toBe('random-state');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('access_type')).toBe('online');
    expect(parsed.searchParams.get('prompt')).toBe('select_account');
  });
});

describe('issueJWT and verifyJWT', () => {
  const secret = 'test-secret-that-is-long-enough-for-hmac-256';

  it('issues a JWT that can be verified', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      900,
    );
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyJWT(token, secret);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('test@acasus.com');
    expect(payload.role).toBe('editor');
  });

  it('rejects a tampered token', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      900,
    );
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyJWT(tampered, secret)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await issueJWT(
      { sub: 'user-1', email: 'test@acasus.com', role: 'editor' },
      secret,
      -1,
    );
    await expect(verifyJWT(token, secret)).rejects.toThrow();
  });
});

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls Google token endpoint with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          token_type: 'Bearer',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await exchangeCodeForTokens({
      code: 'auth-code',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost:8787/auth/callback',
      codeVerifier: 'verifier',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(options.method).toBe('POST');
    expect(result.access_token).toBe('mock-access-token');

    vi.unstubAllGlobals();
  });

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Request', { status: 400 })));

    await expect(
      exchangeCodeForTokens({
        code: 'bad-code',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'http://localhost:8787/auth/callback',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow();

    vi.unstubAllGlobals();
  });
});

describe('isEmailAllowed', () => {
  it('returns true for allowed email', () => {
    expect(isEmailAllowed('alice@acasus.com', 'alice@acasus.com,bob@acasus.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isEmailAllowed('Alice@Acasus.com', 'alice@acasus.com')).toBe(true);
  });

  it('returns false for non-allowed email', () => {
    expect(isEmailAllowed('eve@evil.com', 'alice@acasus.com')).toBe(false);
  });

  it('handles whitespace in allowlist', () => {
    expect(isEmailAllowed('bob@acasus.com', 'alice@acasus.com, bob@acasus.com')).toBe(true);
  });
});

describe('generateRefreshToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
  });
});
