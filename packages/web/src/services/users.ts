import type { User, Role } from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface UserListResponse {
  users: User[];
}

export interface UserCreateResponse {
  user: User;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
}

export interface AllowedEmailsResponse {
  emails: string[];
}

export const userService = {
  async list(): Promise<UserListResponse> {
    const response = await fetch('/api/admin/users', { credentials: 'include' });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch users');
    }
    return (await response.json()) as UserListResponse;
  },

  async create(input: CreateUserInput): Promise<UserCreateResponse> {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create user');
    }
    return (await response.json()) as UserCreateResponse;
  },

  async updateRole(id: string, role: Role): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to update user role');
    }
    return (await response.json()) as { ok: boolean };
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to remove user');
    }
    return (await response.json()) as { ok: boolean };
  },

  async listAllowedEmails(): Promise<AllowedEmailsResponse> {
    const response = await fetch('/api/admin/allowed-emails', {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch allowed emails');
    }
    return (await response.json()) as AllowedEmailsResponse;
  },

  async addAllowedEmail(email: string): Promise<{ ok: boolean }> {
    const response = await fetch('/api/admin/allowed-emails', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to add allowed email');
    }
    return (await response.json()) as { ok: boolean };
  },

  async removeAllowedEmail(email: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/admin/allowed-emails/${email}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to remove allowed email');
    }
    return (await response.json()) as { ok: boolean };
  },
};
