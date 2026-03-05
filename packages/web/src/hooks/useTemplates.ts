import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTemplateInput } from '@legalcode/shared';
import { templateService, type TemplateListParams } from '../services/templates.js';

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

  return useMutation({
    mutationFn: (data: Parameters<typeof templateService.create>[0]) =>
      templateService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      templateService.update(id, data),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({
        queryKey: ['templates', id, 'versions'],
      });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function usePublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateService.publish(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useArchiveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateService.archive(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['templates', id] });
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
