/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useSuggestions } from '../../src/hooks/useSuggestions.js';
import type { Suggestion } from '../../src/types/suggestions.js';

// Mock heavy dependencies that aren't relevant to this data-flow test
vi.mock('../../src/components/MarkdownEditor.js', () => ({
  MarkdownEditor: () => <div data-testid="mock-editor" />,
}));

vi.mock('../../src/hooks/useCollaboration.js', () => ({
  useCollaboration: () => ({
    connectionStatus: 'connected',
    presenceUsers: [],
  }),
}));

// ---- MSW setup ----

const TEMPLATE_ID = 'tmpl-001';

const mockSuggestions: Suggestion[] = [
  {
    id: 'sug-1',
    templateId: TEMPLATE_ID,
    authorId: 'user-1',
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    type: 'insert',
    anchorFrom: '10',
    anchorTo: '10',
    originalText: '',
    replacementText: 'hello',
    status: 'pending',
    resolvedBy: null,
    resolvedAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

const server = setupServer(
  http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => {
    return HttpResponse.json(mockSuggestions);
  }),
  http.post(`/api/templates/${TEMPLATE_ID}/suggestions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newSuggestion: Suggestion = {
      id: 'sug-new',
      templateId: TEMPLATE_ID,
      authorId: 'user-1',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      type: (body.type as 'insert' | 'delete') === 'delete' ? 'delete' : 'insert',
      anchorFrom: typeof body.anchorFrom === 'string' ? body.anchorFrom : '0',
      anchorTo: typeof body.anchorTo === 'string' ? body.anchorTo : '0',
      originalText: typeof body.originalText === 'string' ? body.originalText : '',
      replacementText: typeof body.replacementText === 'string' ? body.replacementText : null,
      status: 'pending',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    return HttpResponse.json(newSuggestion, { status: 201 });
  }),
  http.patch(
    `/api/templates/${TEMPLATE_ID}/suggestions/sug-1/accept`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.patch(
    `/api/templates/${TEMPLATE_ID}/suggestions/sug-1/reject`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.delete(
    `/api/templates/${TEMPLATE_ID}/suggestions/sug-1`,
    () => new HttpResponse(null, { status: 204 }),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

// ---- Test helpers ----

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = makeQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// A minimal component that uses useSuggestions and exposes results for testing
function SuggestionsHarness({ templateId }: { templateId: string }) {
  const {
    suggestions,
    isLoading,
    createSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    deleteSuggestion,
  } = useSuggestions(templateId);

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="count">{String(suggestions.length)}</div>
      <div data-testid="first-id">{suggestions[0]?.id ?? 'none'}</div>
      <button
        data-testid="create"
        onClick={() => {
          createSuggestion({
            templateId,
            type: 'insert',
            anchorFrom: '5',
            anchorTo: '5',
            originalText: '',
            replacementText: 'new text',
          });
        }}
      />
      <button
        data-testid="accept"
        onClick={() => {
          acceptSuggestion({ templateId, suggestionId: 'sug-1' });
        }}
      />
      <button
        data-testid="reject"
        onClick={() => {
          rejectSuggestion({ templateId, suggestionId: 'sug-1' });
        }}
      />
      <button
        data-testid="delete"
        onClick={() => {
          deleteSuggestion({ templateId, suggestionId: 'sug-1' });
        }}
      />
    </div>
  );
}

// ---- Tests ----

describe('useSuggestions data flow', () => {
  it('fetches suggestions on mount', async () => {
    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // After fetch completes
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('first-id')).toHaveTextContent('sug-1');
  });

  it('returns empty array when API returns []', async () => {
    server.use(http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => HttpResponse.json([])));

    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('first-id')).toHaveTextContent('none');
  });

  it('create suggestion triggers POST and invalidates cache', async () => {
    const user = userEvent.setup();
    let getCallCount = 0;

    server.use(
      http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => {
        getCallCount++;
        return HttpResponse.json(mockSuggestions);
      }),
    );

    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    const callsBefore = getCallCount;

    await act(async () => {
      await user.click(screen.getByTestId('create'));
    });

    // Wait for the re-fetch after invalidation
    await waitFor(() => {
      expect(getCallCount).toBeGreaterThan(callsBefore);
    });
  });

  it('accept suggestion sends PATCH and invalidates cache', async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    let getRefetchCount = 0;

    server.use(
      http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => {
        getRefetchCount++;
        return HttpResponse.json(mockSuggestions);
      }),
      http.patch(`/api/templates/${TEMPLATE_ID}/suggestions/sug-1/accept`, () => {
        patchCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    const refetchBefore = getRefetchCount;

    await act(async () => {
      await user.click(screen.getByTestId('accept'));
    });

    await waitFor(() => {
      expect(patchCalled).toBe(true);
    });

    await waitFor(() => {
      expect(getRefetchCount).toBeGreaterThan(refetchBefore);
    });
  });

  it('reject suggestion sends PATCH and invalidates cache', async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    let getRefetchCount = 0;

    server.use(
      http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => {
        getRefetchCount++;
        return HttpResponse.json(mockSuggestions);
      }),
      http.patch(`/api/templates/${TEMPLATE_ID}/suggestions/sug-1/reject`, () => {
        patchCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    const refetchBefore = getRefetchCount;

    await act(async () => {
      await user.click(screen.getByTestId('reject'));
    });

    await waitFor(() => {
      expect(patchCalled).toBe(true);
    });

    await waitFor(() => {
      expect(getRefetchCount).toBeGreaterThan(refetchBefore);
    });
  });

  it('delete suggestion sends DELETE and invalidates cache', async () => {
    const user = userEvent.setup();
    let deleteCalled = false;
    let getRefetchCount = 0;

    server.use(
      http.get(`/api/templates/${TEMPLATE_ID}/suggestions`, () => {
        getRefetchCount++;
        return HttpResponse.json(mockSuggestions);
      }),
      http.delete(`/api/templates/${TEMPLATE_ID}/suggestions/sug-1`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(
      <Wrapper>
        <SuggestionsHarness templateId={TEMPLATE_ID} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    const refetchBefore = getRefetchCount;

    await act(async () => {
      await user.click(screen.getByTestId('delete'));
    });

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });

    await waitFor(() => {
      expect(getRefetchCount).toBeGreaterThan(refetchBefore);
    });
  });
});
