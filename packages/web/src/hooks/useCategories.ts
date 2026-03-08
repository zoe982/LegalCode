import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categories.js';
import { useTrackedMutation } from './useTrackedMutation.js';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.list(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (data: { name: string }) => categoryService.create(data),
    mutationLabel: 'create-category',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoryService.update(id, { name }),
    mutationLabel: 'update-category',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    mutationLabel: 'delete-category',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
