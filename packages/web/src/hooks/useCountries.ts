import { useQuery, useQueryClient } from '@tanstack/react-query';
import { countryService } from '../services/countries.js';
import { useTrackedMutation } from './useTrackedMutation.js';

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => countryService.list(),
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (data: { name: string; code: string }) => countryService.create(data),
    mutationLabel: 'create-country',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: ({ id, name, code }: { id: string; name: string; code: string }) =>
      countryService.update(id, { name, code }),
    mutationLabel: 'update-country',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
}

export function useDeleteCountry() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => countryService.remove(id),
    mutationLabel: 'delete-country',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
}
