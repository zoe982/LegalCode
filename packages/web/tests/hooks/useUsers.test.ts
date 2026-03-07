import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { User } from '@legalcode/shared';

const {
  listFn,
  createFn,
  updateRoleFn,
  removeFn,
  listAllowedEmailsFn,
  addAllowedEmailFn,
  removeAllowedEmailFn,
} = vi.hoisted(() => ({
  listFn: vi.fn(),
  createFn: vi.fn(),
  updateRoleFn: vi.fn(),
  removeFn: vi.fn(),
  listAllowedEmailsFn: vi.fn(),
  addAllowedEmailFn: vi.fn(),
  removeAllowedEmailFn: vi.fn(),
}));

vi.mock('../../src/services/users.js', () => ({
  userService: {
    list: listFn,
    create: createFn,
    updateRole: updateRoleFn,
    remove: removeFn,
    listAllowedEmails: listAllowedEmailsFn,
    addAllowedEmail: addAllowedEmailFn,
    removeAllowedEmail: removeAllowedEmailFn,
  },
}));

// Mock errorReporter for useTrackedMutation
vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn(),
}));

const {
  useUsers,
  useCreateUser,
  useUpdateUserRole,
  useRemoveUser,
  useAllowedEmails,
  useAddAllowedEmail,
  useRemoveAllowedEmail,
} = await import('../../src/hooks/useUsers.js');

const mockUser: User = {
  id: 'u1',
  email: 'joseph.marsico@acasus.com',
  name: 'Joseph Marsico',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useUsers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches users list', async () => {
    listFn.mockResolvedValue({ users: [mockUser] });

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listFn).toHaveBeenCalled();
    expect(result.current.data?.users).toEqual([mockUser]);
  });

  it('returns loading state initially', () => {
    listFn.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCreateUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user and invalidates list', async () => {
    createFn.mockResolvedValue({ user: mockUser });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    act(() => {
      result.current.mutate({
        email: 'joseph.marsico@acasus.com',
        name: 'Joseph Marsico',
        role: 'admin',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createFn).toHaveBeenCalledWith({
      email: 'joseph.marsico@acasus.com',
      name: 'Joseph Marsico',
      role: 'admin',
    });
  });

  it('reports errors via useTrackedMutation', async () => {
    createFn.mockRejectedValue(new Error('Create user failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    act(() => {
      result.current.mutate({
        email: 'test@acasus.com',
        name: 'Test',
        role: 'editor',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const { reportError } = await import('../../src/services/errorReporter.js');
    expect(reportError).toHaveBeenCalled();
  });
});

describe('useUpdateUserRole', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates a user role', async () => {
    updateRoleFn.mockResolvedValue({ ok: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateUserRole(), { wrapper });

    act(() => {
      result.current.mutate({ id: 'u1', role: 'editor' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateRoleFn).toHaveBeenCalledWith('u1', 'editor');
  });
});

describe('useRemoveUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes a user', async () => {
    removeFn.mockResolvedValue({ ok: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRemoveUser(), { wrapper });

    act(() => {
      result.current.mutate('u1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeFn).toHaveBeenCalledWith('u1');
  });
});

describe('useAllowedEmails', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches allowed emails', async () => {
    listAllowedEmailsFn.mockResolvedValue({ emails: ['a@b.com'] });

    const { result } = renderHook(() => useAllowedEmails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listAllowedEmailsFn).toHaveBeenCalled();
    expect(result.current.data?.emails).toEqual(['a@b.com']);
  });

  it('returns loading state initially', () => {
    listAllowedEmailsFn.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useAllowedEmails(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useAddAllowedEmail', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('adds an allowed email', async () => {
    addAllowedEmailFn.mockResolvedValue({ ok: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAllowedEmail(), { wrapper });

    act(() => {
      result.current.mutate('new@acasus.com');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(addAllowedEmailFn).toHaveBeenCalledWith('new@acasus.com');
  });
});

describe('useRemoveAllowedEmail', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes an allowed email', async () => {
    removeAllowedEmailFn.mockResolvedValue({ ok: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRemoveAllowedEmail(), { wrapper });

    act(() => {
      result.current.mutate('old@acasus.com');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(removeAllowedEmailFn).toHaveBeenCalledWith('old@acasus.com');
  });
});
