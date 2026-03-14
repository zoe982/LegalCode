import { useQuery, useQueryClient } from '@tanstack/react-query';
import { suggestionService } from '../services/suggestions.js';
import { useTrackedMutation } from './useTrackedMutation.js';
import type { Suggestion, CreateSuggestionInput } from '../types/suggestions.js';

export function useSuggestions(templateId: string | undefined) {
  const queryClient = useQueryClient();
  const id = templateId ?? '';

  const query = useQuery({
    queryKey: ['suggestions', templateId],
    queryFn: () => suggestionService.getSuggestions(id),
    enabled: id !== '',
  });

  const createMutation = useTrackedMutation<Suggestion, CreateSuggestionInput>({
    mutationFn: (input: CreateSuggestionInput) => suggestionService.createSuggestion(input),
    mutationLabel: 'suggestion.create',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suggestions', templateId] });
    },
  });

  const acceptMutation = // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    useTrackedMutation<void, { templateId: string; suggestionId: string }>({
      mutationFn: ({
        templateId: tId,
        suggestionId,
      }: {
        templateId: string;
        suggestionId: string;
      }) => suggestionService.acceptSuggestion(tId, suggestionId),
      mutationLabel: 'suggestion.accept',
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['suggestions', templateId] });
      },
    });

  const rejectMutation = // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    useTrackedMutation<void, { templateId: string; suggestionId: string }>({
      mutationFn: ({
        templateId: tId,
        suggestionId,
      }: {
        templateId: string;
        suggestionId: string;
      }) => suggestionService.rejectSuggestion(tId, suggestionId),
      mutationLabel: 'suggestion.reject',
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['suggestions', templateId] });
      },
    });

  const deleteMutation = // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    useTrackedMutation<void, { templateId: string; suggestionId: string }>({
      mutationFn: ({
        templateId: tId,
        suggestionId,
      }: {
        templateId: string;
        suggestionId: string;
      }) => suggestionService.deleteSuggestion(tId, suggestionId),
      mutationLabel: 'suggestion.delete',
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['suggestions', templateId] });
      },
    });

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSuggestion: createMutation.mutate,
    acceptSuggestion: acceptMutation.mutate,
    rejectSuggestion: rejectMutation.mutate,
    deleteSuggestion: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
