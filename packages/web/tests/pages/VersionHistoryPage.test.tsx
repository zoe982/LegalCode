/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TemplateVersion, Template } from '@legalcode/shared';
import { VersionHistoryPage } from '../../src/pages/VersionHistoryPage.js';

// ── Mocks ────────────────────────────────────────────────────────────

const mockUseParams = vi.fn<() => Record<string, string | undefined>>();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => mockUseParams() as ReturnType<typeof actual.useParams>,
    useNavigate: () => mockNavigate,
  };
});

const mockUseTemplate =
  vi.fn<() => UseQueryResult<{ template: Template; content: string; tags: string[] }>>();
const mockUseTemplateVersions = vi.fn<() => UseQueryResult<TemplateVersion[]>>();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplate: (...args: unknown[]) =>
    mockUseTemplate(...(args as Parameters<typeof mockUseTemplate>)),
  useTemplateVersions: (...args: unknown[]) =>
    mockUseTemplateVersions(...(args as Parameters<typeof mockUseTemplateVersions>)),
}));

const mockGetVersion = vi.fn<(id: string, version: number) => Promise<TemplateVersion>>();
const mockUpdate = vi.fn<(id: string, data: unknown) => Promise<Template>>();

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    getVersion: (...args: unknown[]) =>
      mockGetVersion(...(args as Parameters<typeof mockGetVersion>)),
    update: (...args: unknown[]) => mockUpdate(...(args as Parameters<typeof mockUpdate>)),
  },
}));

vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    setConfig: vi.fn(),
    clearConfig: vi.fn(),
  }),
}));

vi.mock('../../src/utils/markdownToHtml.js', () => ({
  markdownToHtml: (md: string) => `<p>${md}</p>`,
}));

// ── Test Data ────────────────────────────────────────────────────────

const mockTemplate: Template = {
  id: 't1',
  title: 'Service Agreement',
  slug: 'service-agreement',
  category: 'contracts',
  description: null,
  country: 'US',
  status: 'active',
  currentVersion: 3,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockVersions: TemplateVersion[] = [
  {
    id: 'ver1',
    templateId: 't1',
    version: 1,
    content: '# Initial content',
    changeSummary: null,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ver2',
    templateId: 't1',
    version: 2,
    content: '# Updated content\n\nNew paragraph added.',
    changeSummary: 'Added new paragraph',
    createdBy: 'u2',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'ver3',
    templateId: 't1',
    version: 3,
    content: '# Final content\n\nNew paragraph added.\n\nAnother section.',
    changeSummary: 'Added another section',
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

type TemplateDetailResult = UseQueryResult<{ template: Template; content: string; tags: string[] }>;

function makeTemplateQueryResult(overrides: Partial<TemplateDetailResult>): TemplateDetailResult {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: false,
    promise: Promise.resolve({ template: mockTemplate, content: '', tags: [] }),
    refetch: vi.fn(),
    fetchStatus: 'idle',
    status: 'pending',
    ...overrides,
  } as TemplateDetailResult;
}

function makeVersionsQueryResult(
  overrides: Partial<UseQueryResult<TemplateVersion[]>>,
): UseQueryResult<TemplateVersion[]> {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: false,
    promise: Promise.resolve([] as TemplateVersion[]),
    refetch: vi.fn(),
    fetchStatus: 'idle',
    status: 'pending',
    ...overrides,
  } as UseQueryResult<TemplateVersion[]>;
}

function setupLoadedMocks() {
  mockUseParams.mockReturnValue({ id: 't1' });
  mockUseTemplate.mockReturnValue(
    makeTemplateQueryResult({
      isSuccess: true,
      isFetched: true,
      data: { template: mockTemplate, content: mockVersions[2]?.content ?? '', tags: [] },
      status: 'success',
    }),
  );
  mockUseTemplateVersions.mockReturnValue(
    makeVersionsQueryResult({
      isSuccess: true,
      isFetched: true,
      data: mockVersions,
      status: 'success',
    }),
  );
  mockGetVersion.mockImplementation((_id: string, version: number) => {
    const v = mockVersions.find((ver) => ver.version === version);
    if (!v) return Promise.reject(new Error('Not found'));
    return Promise.resolve(v);
  });
}

describe('VersionHistoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    mockUseParams.mockReturnValue({ id: 't1' });
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isLoading: true,
        isPending: true,
        fetchStatus: 'fetching',
        isFetching: true,
      }),
    );
    mockUseTemplateVersions.mockReturnValue(
      makeVersionsQueryResult({
        isLoading: true,
        isPending: true,
        fetchStatus: 'fetching',
        isFetching: true,
      }),
    );

    render(<VersionHistoryPage />);

    expect(screen.getByTestId('version-history-skeleton')).toBeInTheDocument();
  });

  it('renders version timeline with versions after loading', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('back button navigates to /templates/:id', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    const backButton = screen.getByRole('button', { name: /back to editor/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
  });

  it('clicking a version loads its content in preview', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Click version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);

    await waitFor(() => {
      const preview = screen.getByRole('region', { name: /document preview/i });
      expect(preview).toHaveTextContent('Initial content');
    });
  });

  it('current version has "(current)" label', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('(current)')).toBeInTheDocument();
  });

  it('restore button appears for non-current versions', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Select version 1 (non-current)
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });
  });

  it('restore button does not appear for current version', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Current version (v3) is selected by default
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
  });

  it('restore button opens confirmation dialog', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Select version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));

    expect(screen.getByText(/restore to v1\?/i)).toBeInTheDocument();
    expect(screen.getByText(/this will create a new version/i)).toBeInTheDocument();
  });

  it('restore confirmation calls API and navigates back', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();
    mockUpdate.mockResolvedValue(mockTemplate);

    render(<VersionHistoryPage />);

    // Select version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));

    // Confirm restore
    const restoreConfirmBtn = screen.getByRole('button', { name: /^restore$/i });
    await user.click(restoreConfirmBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('t1', {
        content: '# Initial content',
        changeSummary: 'Restored from version 1',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
    });
  });

  it('page title shows template title', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('Service Agreement')).toBeInTheDocument();
  });

  it('diff toggle shows changes when enabled', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Select version 1 first (so diff makes sense)
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      const preview = screen.getByRole('region', { name: /document preview/i });
      expect(preview).toHaveTextContent('Initial content');
    });

    // Enable diff toggle
    const diffToggle = screen.getByRole('checkbox', { name: /show changes/i });
    await user.click(diffToggle);

    // Diff highlights should be visible
    await waitFor(() => {
      expect(screen.getByTestId('diff-view')).toBeInTheDocument();
    });
  });

  it('diff toggle hides changes when disabled', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Select version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      const preview = screen.getByRole('region', { name: /document preview/i });
      expect(preview).toHaveTextContent('Initial content');
    });

    // Enable then disable diff toggle
    const diffToggle = screen.getByRole('checkbox', { name: /show changes/i });
    await user.click(diffToggle);

    await waitFor(() => {
      expect(screen.getByTestId('diff-view')).toBeInTheDocument();
    });

    await user.click(diffToggle);

    await waitFor(() => {
      expect(screen.queryByTestId('diff-view')).not.toBeInTheDocument();
    });
  });

  it('shows loading state for version content switch', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    // Make getVersion slow using a deferred promise pattern
    const resolveRef: { current: ((v: TemplateVersion) => void) | null } = { current: null };
    mockGetVersion.mockImplementation(
      () =>
        new Promise<TemplateVersion>((resolve) => {
          resolveRef.current = resolve;
        }),
    );

    render(<VersionHistoryPage />);

    // Click version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    // Preview should show loading opacity
    const preview = screen.getByRole('region', { name: /document preview/i });
    expect(preview).toHaveAttribute('data-loading', 'true');

    // Resolve the version load
    const ver1 = mockVersions[0];
    if (resolveRef.current && ver1) {
      resolveRef.current(ver1);
    }

    await waitFor(() => {
      expect(preview).toHaveAttribute('data-loading', 'false');
    });
  });

  it('displays version count in timeline header', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('(3 versions)')).toBeInTheDocument();
  });

  it('shows "Versions" header in the timeline', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('Versions')).toBeInTheDocument();
  });

  it('cancel button in restore dialog closes it', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Select version 1
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));
    expect(screen.getByText(/restore to v1\?/i)).toBeInTheDocument();

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/restore to v1\?/i)).not.toBeInTheDocument();
    });
  });

  it('change summary displays correctly for each version', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('Added new paragraph')).toBeInTheDocument();
    expect(screen.getByText('Added another section')).toBeInTheDocument();
    expect(screen.getByText('Initial version')).toBeInTheDocument();
  });

  it('selected version card has selected visual state', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Click version 2
    const v2Option = screen.getByRole('option', { name: /v2/i });
    await user.click(v2Option);

    expect(v2Option).toHaveAttribute('aria-selected', 'true');
  });

  it('version timeline has correct accessibility roles', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByRole('listbox', { name: /version list/i })).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('document preview has correct accessibility role', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByRole('region', { name: /document preview/i })).toBeInTheDocument();
  });

  it('keyboard Enter on version card selects that version', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    const v1Option = screen.getByRole('option', { name: /v1/i });
    v1Option.focus();
    await user.keyboard('{Enter}');

    expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);
  });

  it('keyboard Space on version card selects that version', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    const v1Option = screen.getByRole('option', { name: /v1/i });
    v1Option.focus();
    await user.keyboard(' ');

    expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);
  });

  it('clicking already-selected version does not re-fetch', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // v3 is selected by default (current). Click it again.
    const v3Option = screen.getByRole('option', { name: /v3 \(current\)/i });
    await user.click(v3Option);

    // getVersion should not be called since it's already selected
    expect(mockGetVersion).not.toHaveBeenCalled();
  });

  it('diff toggle does not show diff view when current version is selected', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Current version is selected by default
    const diffToggle = screen.getByRole('checkbox', { name: /show changes/i });
    await user.click(diffToggle);

    // Should not show diff view for current version (comparing to itself)
    expect(screen.queryByTestId('diff-view')).not.toBeInTheDocument();
  });
});
