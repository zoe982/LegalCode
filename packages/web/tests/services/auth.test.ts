import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../src/services/auth.js';

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('startLogin', () => {
    it('fetches Google OAuth URL and redirects', async () => {
      const mockUrl = 'https://accounts.google.com/o/oauth2/v2/auth?test=1';
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ url: mockUrl }), { status: 200 }),
      );
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => '',
        configurable: true,
      });

      await authService.startLogin();
      expect(fetch).toHaveBeenCalledWith('/api/auth/google');
      expect(hrefSetter).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe('getCurrentUser', () => {
    it('returns user data on success', async () => {
      const mockUser = {
        user: { id: '1', email: 'alice@acasus.com', name: 'Alice', role: 'editor' },
      };
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockUser), { status: 200 }));
      const result = await authService.getCurrentUser();
      expect(result).toEqual(mockUser.user);
      expect(fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
    });

    it('returns null on 401', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('calls logout endpoint', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      await authService.logout();
      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    });
  });

  describe('refresh', () => {
    it('calls refresh endpoint and returns true on success', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const result = await authService.refresh();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
    });

    it('returns false on failure', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      const result = await authService.refresh();
      expect(result).toBe(false);
    });
  });
});
