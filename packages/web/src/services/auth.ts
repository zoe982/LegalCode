import type { AuthUser } from '@legalcode/shared';

interface MeResponse {
  user: AuthUser;
}

export const authService = {
  getLoginUrl(): string {
    return '/auth/google';
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const response = await fetch('/auth/me', { credentials: 'include' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as MeResponse;
    return data.user;
  },

  async logout(): Promise<void> {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  async refresh(): Promise<boolean> {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  },
};
