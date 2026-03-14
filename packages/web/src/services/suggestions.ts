import type { Suggestion, CreateSuggestionInput } from '../types/suggestions.js';
import { extractApiError } from './apiUtils.js';

export const suggestionService = {
  async getSuggestions(templateId: string): Promise<Suggestion[]> {
    const response = await fetch(`/api/templates/${templateId}/suggestions`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch suggestions');
    }
    return (await response.json()) as Suggestion[];
  },

  async createSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
    const { templateId, ...body } = input;
    const response = await fetch(`/api/templates/${templateId}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create suggestion');
    }
    return (await response.json()) as Suggestion;
  },

  async acceptSuggestion(templateId: string, suggestionId: string): Promise<void> {
    const response = await fetch(
      `/api/templates/${templateId}/suggestions/${suggestionId}/accept`,
      {
        method: 'PATCH',
        credentials: 'include',
      },
    );
    if (!response.ok) {
      return extractApiError(response, 'Failed to accept suggestion');
    }
  },

  async rejectSuggestion(templateId: string, suggestionId: string): Promise<void> {
    const response = await fetch(
      `/api/templates/${templateId}/suggestions/${suggestionId}/reject`,
      {
        method: 'PATCH',
        credentials: 'include',
      },
    );
    if (!response.ok) {
      return extractApiError(response, 'Failed to reject suggestion');
    }
  },

  async deleteSuggestion(templateId: string, suggestionId: string): Promise<void> {
    const response = await fetch(`/api/templates/${templateId}/suggestions/${suggestionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to delete suggestion');
    }
  },
};
