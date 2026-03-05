import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@legalcode/shared';
import { authService } from '../services/auth.js';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: user != null,
    login: () => authService.startLogin(),
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
