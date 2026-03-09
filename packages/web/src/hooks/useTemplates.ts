import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateTemplateInput } from '@legalcode/shared';
import { templateService, type TemplateListParams } from '../services/templates.js';
import { useTrackedMutation } from './useTrackedMutation.js';

export function useTemplates(filters: TemplateListParams) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => templateService.list(filters),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templateService.get(id),
    enabled: id !== '',
  });
}

export function useTemplateVersions(id: string) {
  return useQuery({
    queryKey: ['templates', id, 'versions'],
    queryFn: () => templateService.getVersions(id),
    enabled: id !== '',
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (data: Parameters<typeof templateService.create>[0]) =>
      templateService.create(data),
    mutationLabel: 'create-template',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      templateService.update(id, data),
    mutationLabel: 'update-template',
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({
        queryKey: ['templates', id, 'versions'],
      });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => templateService.delete(id),
    mutationLabel: 'delete-template',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useRestoreTemplate() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => templateService.restore(id),
    mutationLabel: 'restore-template',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
      void queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useHardDeleteTemplate() {
  const queryClient = useQueryClient();

  return useTrackedMutation({
    mutationFn: (id: string) => templateService.hardDelete(id),
    mutationLabel: 'hard-delete-template',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useTrashTemplates() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: () => templateService.listTrash(),
  });
}
