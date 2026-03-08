import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { userService } = await import('../../src/services/users.js');

function spyOnFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

describe('userService', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('list', () => {
    it('GETs /admin/users with credentials', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ users: [] }), { status: 200 }));

      const result = await userService.list();

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/users', {
        credentials: 'include',
      });
      expect(result).toEqual({ users: [] });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(userService.list()).rejects.toThrow('Failed to fetch users');
    });
  });

  describe('create', () => {
    it('POSTs /admin/users with body', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@acasus.com',
        name: 'Test User',
        role: 'editor' as const,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ user: mockUser }), { status: 201 }));

      const result = await userService.create({
        email: 'test@acasus.com',
        name: 'Test User',
        role: 'editor',
      });

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@acasus.com',
          name: 'Test User',
          role: 'editor',
        }),
      });
      expect(result).toEqual({ user: mockUser });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(userService.create({ email: 'bad', name: 'X', role: 'editor' })).rejects.toThrow(
        'Failed to create user',
      );
    });
  });

  describe('updateRole', () => {
    it('PATCHes /admin/users/:id with role body', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await userService.updateRole('u1', 'admin');

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/users/u1', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(userService.updateRole('bad-id', 'admin')).rejects.toThrow(
        'Failed to update user role',
      );
    });
  });

  describe('remove', () => {
    it('DELETEs /admin/users/:id', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await userService.remove('u1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/users/u1', {
        method: 'DELETE',
        credentials: 'include',
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(userService.remove('bad-id')).rejects.toThrow('Failed to remove user');
    });
  });

  describe('listAllowedEmails', () => {
    it('GETs /admin/allowed-emails', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ emails: ['a@b.com'] }), { status: 200 }),
      );

      const result = await userService.listAllowedEmails();

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/allowed-emails', {
        credentials: 'include',
      });
      expect(result).toEqual({ emails: ['a@b.com'] });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Error', { status: 500 }));

      await expect(userService.listAllowedEmails()).rejects.toThrow(
        'Failed to fetch allowed emails',
      );
    });
  });

  describe('addAllowedEmail', () => {
    it('POSTs /admin/allowed-emails with email body', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await userService.addAllowedEmail('new@acasus.com');

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/allowed-emails', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@acasus.com' }),
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Conflict', { status: 409 }));

      await expect(userService.addAllowedEmail('dup@acasus.com')).rejects.toThrow(
        'Failed to add allowed email',
      );
    });
  });

  describe('removeAllowedEmail', () => {
    it('DELETEs /admin/allowed-emails/:email', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await userService.removeAllowedEmail('old@acasus.com');

      expect(fetchSpy).toHaveBeenCalledWith('/api/admin/allowed-emails/old@acasus.com', {
        method: 'DELETE',
        credentials: 'include',
      });
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(userService.removeAllowedEmail('missing@acasus.com')).rejects.toThrow(
        'Failed to remove allowed email',
      );
    });
  });
});
