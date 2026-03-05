import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../src/services/auth.js';

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getLoginUrl', () => {
    it('returns the Google OAuth initiation URL', () => {
      expect(authService.getLoginUrl()).toBe('/auth/google');
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
      expect(fetch).toHaveBeenCalledWith('/auth/me', { credentials: 'include' });
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
      expect(fetch).toHaveBeenCalledWith('/auth/logout', {
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
      expect(fetch).toHaveBeenCalledWith('/auth/refresh', {
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
