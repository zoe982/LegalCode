import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePKCE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  issueJWT,
  verifyJWT,
  isEmailAllowed,
  isEmailAllowedWithKV,
  getAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
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

describe('fetchGoogleUserInfo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls Google userinfo endpoint with access token', async () => {
    const mockUserInfo = {
      email: 'alice@acasus.com',
      name: 'Alice',
      picture: 'http://example.com/pic.jpg',
    };
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(mockUserInfo), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchGoogleUserInfo('test-access-token');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
    expect(options.headers).toEqual({ Authorization: 'Bearer test-access-token' });
    expect(result.email).toBe('alice@acasus.com');
    expect(result.name).toBe('Alice');

    vi.unstubAllGlobals();
  });

  it('throws on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })),
    );

    await expect(fetchGoogleUserInfo('bad-token')).rejects.toThrow('Google userinfo failed: 401');

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

function createMockKv(store = new Map<string, string>()) {
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
}

describe('isEmailAllowedWithKV', () => {
  it('checks KV first when allowed_emails key exists', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['kv-user@acasus.com']));
    const kv = createMockKv(store);

    expect(await isEmailAllowedWithKV('kv-user@acasus.com', kv, 'env-user@acasus.com')).toBe(true);
    expect(await isEmailAllowedWithKV('env-user@acasus.com', kv, 'env-user@acasus.com')).toBe(
      false,
    );
  });

  it('falls back to env ALLOWED_EMAILS when KV key does not exist', async () => {
    const kv = createMockKv();

    expect(await isEmailAllowedWithKV('env-user@acasus.com', kv, 'env-user@acasus.com')).toBe(true);
    expect(await isEmailAllowedWithKV('unknown@acasus.com', kv, 'env-user@acasus.com')).toBe(false);
  });

  it('is case-insensitive', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['Alice@Acasus.com']));
    const kv = createMockKv(store);

    expect(await isEmailAllowedWithKV('alice@acasus.com', kv, '')).toBe(true);
  });
});

describe('getAllowedEmails', () => {
  it('returns KV emails when they exist', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['a@acasus.com', 'b@acasus.com']));
    const kv = createMockKv(store);

    const result = await getAllowedEmails(kv, 'fallback@acasus.com');
    expect(result).toEqual(['a@acasus.com', 'b@acasus.com']);
  });

  it('falls back to env when KV is empty', async () => {
    const kv = createMockKv();

    const result = await getAllowedEmails(kv, 'a@acasus.com, b@acasus.com');
    expect(result).toEqual(['a@acasus.com', 'b@acasus.com']);
  });

  it('filters empty strings from env fallback', async () => {
    const kv = createMockKv();

    const result = await getAllowedEmails(kv, 'a@acasus.com,,');
    expect(result).toEqual(['a@acasus.com']);
  });
});

describe('addAllowedEmail', () => {
  it('adds an email to the KV list', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['existing@acasus.com']));
    const kv = createMockKv(store);

    const result = await addAllowedEmail(kv, '', 'new@acasus.com');
    expect(result).toEqual(['existing@acasus.com', 'new@acasus.com']);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(kv.put).toHaveBeenCalledWith(
      'allowed_emails',
      JSON.stringify(['existing@acasus.com', 'new@acasus.com']),
    );
  });

  it('does not duplicate an existing email (case-insensitive)', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['existing@acasus.com']));
    const kv = createMockKv(store);

    const result = await addAllowedEmail(kv, '', 'Existing@acasus.com');
    expect(result).toEqual(['existing@acasus.com']);
  });

  it('seeds from env fallback if KV is empty', async () => {
    const kv = createMockKv();

    const result = await addAllowedEmail(kv, 'env@acasus.com', 'new@acasus.com');
    expect(result).toEqual(['env@acasus.com', 'new@acasus.com']);
  });
});

describe('removeAllowedEmail', () => {
  it('removes an email from the KV list', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['a@acasus.com', 'b@acasus.com']));
    const kv = createMockKv(store);

    const result = await removeAllowedEmail(kv, '', 'a@acasus.com');
    expect(result).toEqual(['b@acasus.com']);
  });

  it('is case-insensitive when removing', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['Alice@acasus.com']));
    const kv = createMockKv(store);

    const result = await removeAllowedEmail(kv, '', 'alice@acasus.com');
    expect(result).toEqual([]);
  });

  it('returns unchanged list if email not found', async () => {
    const store = new Map<string, string>();
    store.set('allowed_emails', JSON.stringify(['a@acasus.com']));
    const kv = createMockKv(store);

    const result = await removeAllowedEmail(kv, '', 'nonexistent@acasus.com');
    expect(result).toEqual(['a@acasus.com']);
  });
});
