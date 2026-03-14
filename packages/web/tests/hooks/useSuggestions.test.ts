import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSuggestions } from '../../src/hooks/useSuggestions.js';
import type { Suggestion } from '../../src/types/suggestions.js';

const {
  getSuggestionsFn,
  createSuggestionFn,
  acceptSuggestionFn,
  rejectSuggestionFn,
  deleteSuggestionFn,
} = vi.hoisted(() => ({
  getSuggestionsFn: vi.fn(),
  createSuggestionFn: vi.fn(),
  acceptSuggestionFn: vi.fn(),
  rejectSuggestionFn: vi.fn(),
  deleteSuggestionFn: vi.fn(),
}));

vi.mock('../../src/services/suggestions.js', () => ({
  suggestionService: {
    getSuggestions: getSuggestionsFn,
    createSuggestion: createSuggestionFn,
    acceptSuggestion: acceptSuggestionFn,
    rejectSuggestion: rejectSuggestionFn,
    deleteSuggestion: deleteSuggestionFn,
  },
}));

vi.mock('../../src/services/errorReporter.js', () => ({
  reportError: vi.fn().mockResolvedValue(undefined),
}));

const mockSuggestion: Suggestion = {
  id: 's1',
  templateId: 'tpl-1',
  authorId: 'u1',
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  type: 'insert',
  anchorFrom: '10',
  anchorTo: '10',
  originalText: '',
  replacementText: 'proposed new text',
  status: 'pending',
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-03-14T10:00:00Z',
  updatedAt: '2026-03-14T10:00:00Z',
};

const deleteSuggestion: Suggestion = {
  id: 's2',
  templateId: 'tpl-1',
  authorId: 'u2',
  authorName: 'Bob',
  authorEmail: 'bob@example.com',
  type: 'delete',
  anchorFrom: '20',
  anchorTo: '30',
  originalText: 'text to delete',
  replacementText: null,
  status: 'pending',
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-03-14T10:01:00Z',
  updatedAt: '2026-03-14T10:01:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSuggestions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns suggestions on mount', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion, deleteSuggestion]);

    const { result } = renderHook(() => useSuggestions('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions[0]?.id).toBe('s1');
    expect(result.current.suggestions[1]?.id).toBe('s2');
  });

  it('returns empty array when no suggestions', async () => {
    getSuggestionsFn.mockResolvedValue([]);

    const { result } = renderHook(() => useSuggestions('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toEqual([]);
  });

  it('does not fetch when templateId is undefined', () => {
    const { result } = renderHook(() => useSuggestions(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(getSuggestionsFn).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });

  it('returns error state on network failure', async () => {
    const fetchError = new Error('Network error');
    getSuggestionsFn.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useSuggestions('tpl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.suggestions).toEqual([]);
  });

  it('createSuggestion mutation calls service and invalidates cache', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion]);
    const newSuggestion: Suggestion = { ...mockSuggestion, id: 's-new' };
    createSuggestionFn.mockResolvedValue(newSuggestion);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSuggestions('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.createSuggestion({
        templateId: 'tpl-1',
        type: 'insert',
        anchorFrom: '10',
        anchorTo: '10',
        originalText: '',
        replacementText: 'new text',
      });
    });

    await waitFor(() => {
      expect(createSuggestionFn).toHaveBeenCalledWith({
        templateId: 'tpl-1',
        type: 'insert',
        anchorFrom: '10',
        anchorTo: '10',
        originalText: '',
        replacementText: 'new text',
      });
    });

    // After success, getSuggestions should be called again (invalidation triggered refetch)
    await waitFor(() => {
      expect(getSuggestionsFn).toHaveBeenCalledTimes(2);
    });
  });

  it('acceptSuggestion mutation calls service and invalidates cache', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion]);
    acceptSuggestionFn.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSuggestions('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.acceptSuggestion({ templateId: 'tpl-1', suggestionId: 's1' });
    });

    await waitFor(() => {
      expect(acceptSuggestionFn).toHaveBeenCalledWith('tpl-1', 's1');
    });

    await waitFor(() => {
      expect(getSuggestionsFn).toHaveBeenCalledTimes(2);
    });
  });

  it('rejectSuggestion mutation calls service and invalidates cache', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion]);
    rejectSuggestionFn.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSuggestions('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.rejectSuggestion({ templateId: 'tpl-1', suggestionId: 's1' });
    });

    await waitFor(() => {
      expect(rejectSuggestionFn).toHaveBeenCalledWith('tpl-1', 's1');
    });

    await waitFor(() => {
      expect(getSuggestionsFn).toHaveBeenCalledTimes(2);
    });
  });

  it('deleteSuggestion mutation calls service and invalidates cache', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion]);
    deleteSuggestionFn.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSuggestions('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.deleteSuggestion({ templateId: 'tpl-1', suggestionId: 's1' });
    });

    await waitFor(() => {
      expect(deleteSuggestionFn).toHaveBeenCalledWith('tpl-1', 's1');
    });

    await waitFor(() => {
      expect(getSuggestionsFn).toHaveBeenCalledTimes(2);
    });
  });

  it('isCreating is true while createSuggestion mutation is pending', async () => {
    getSuggestionsFn.mockResolvedValue([mockSuggestion]);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    createSuggestionFn.mockReturnValue(new Promise(() => {}));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSuggestions('tpl-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCreating).toBe(false);

    act(() => {
      result.current.createSuggestion({
        templateId: 'tpl-1',
        type: 'insert',
        anchorFrom: '10',
        anchorTo: '10',
        originalText: '',
      });
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });
  });
});
