import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { errorLogService, type ErrorLogFilters } from '../services/errorLog.js';

export function useErrorLog(filters?: ErrorLogFilters) {
  return useQuery({
    queryKey: ['admin', 'errors', filters],
    queryFn: () => errorLogService.list(filters),
    staleTime: 30_000,
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => errorLogService.resolve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'errors'] });
    },
  });
}
