import type { AuthUser } from '@legalcode/shared';

interface MeResponse {
  user: AuthUser;
}

export const authService = {
  async startLogin(): Promise<void> {
    const response = await fetch('/auth/google');
    const data = (await response.json()) as { url: string };
    window.location.href = data.url;
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
