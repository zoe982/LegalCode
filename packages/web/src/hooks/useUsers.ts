import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@legalcode/shared';
import { userService } from '../services/users.js';
import { useTrackedMutation } from './useTrackedMutation.js';

export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userService.list(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (data: { email: string; name: string; role: Role }) => userService.create(data),
    mutationLabel: 'create-user',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => userService.updateRole(id, role),
    mutationLabel: 'update-user-role',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => userService.remove(id),
    mutationLabel: 'remove-user',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] });
    },
  });
}

export function useAllowedEmails() {
  return useQuery({
    queryKey: ['admin', 'allowed-emails'],
    queryFn: () => userService.listAllowedEmails(),
  });
}

export function useAddAllowedEmail() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (email: string) => userService.addAllowedEmail(email),
    mutationLabel: 'add-allowed-email',
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'allowed-emails'],
      });
    },
  });
}

export function useRemoveAllowedEmail() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (email: string) => userService.removeAllowedEmail(email),
    mutationLabel: 'remove-allowed-email',
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'allowed-emails'],
      });
    },
  });
}
