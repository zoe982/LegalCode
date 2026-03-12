import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companies.js';
import { useTrackedMutation } from './useTrackedMutation.js';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.list(),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (data: { name: string }) => companyService.create(data),
    mutationLabel: 'create-company',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => companyService.update(id, { name }),
    mutationLabel: 'update-company',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => companyService.remove(id),
    mutationLabel: 'delete-company',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
