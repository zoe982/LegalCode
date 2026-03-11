/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TemplateVersion, Template } from '@legalcode/shared';
import type { GetTemplateResponse } from '../../src/services/templates.js';
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

const mockUseTemplate = vi.fn<() => UseQueryResult<GetTemplateResponse>>();
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

const mockSetConfig = vi.fn();
const mockClearConfig = vi.fn();

vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    setConfig: mockSetConfig,
    clearConfig: mockClearConfig,
  }),
  useTopAppBarSetters: () => ({
    setConfig: mockSetConfig,
    clearConfig: mockClearConfig,
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
  displayId: 'TEM-AAA-001',
  category: 'contracts',
  description: null,
  country: 'US',
  currentVersion: 3,
  deletedAt: null,
  deletedBy: null,
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

type TemplateDetailResult = UseQueryResult<GetTemplateResponse>;

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
    promise: Promise.resolve({
      template: mockTemplate,
      content: '',
      changeSummary: null,
      tags: [],
    }),
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
      data: {
        template: mockTemplate,
        content: mockVersions[2]?.content ?? '',
        changeSummary: null,
        tags: [],
      },
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
    mockSetConfig.mockClear();
    mockClearConfig.mockClear();
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

  it('current version has "current" badge', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    expect(screen.getByText('current')).toBeInTheDocument();
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

    // Current version (v3) should not have a restore button
    expect(screen.queryByRole('button', { name: /restore to version 3/i })).not.toBeInTheDocument();
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

  it('displays version count badge in timeline header', () => {
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // Count is now a badge, not "(3 versions)"
    expect(screen.getByText('3')).toBeInTheDocument();
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

  it('displays author for each version entry', () => {
    setupLoadedMocks();
    render(<VersionHistoryPage />);
    // mockVersions have createdBy: 'u1' and 'u2'
    const authorElements = screen.getAllByText(/^u[12]$/);
    expect(authorElements.length).toBeGreaterThanOrEqual(2);
  });

  it('sets breadcrumb config with template name', () => {
    setupLoadedMocks();
    render(<VersionHistoryPage />);
    expect(mockSetConfig).toHaveBeenCalledWith({
      breadcrumbTemplateName: 'Service Agreement',
      breadcrumbPageName: 'Version History',
    });
  });

  it('does not infinite loop when templateData reference changes', () => {
    setupLoadedMocks();

    const { rerender } = render(<VersionHistoryPage />);

    // Simulate TanStack Query returning new reference with same data
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: { ...mockTemplate }, // new object reference
          content: mockVersions[2]?.content ?? '',
          changeSummary: null,
          tags: [],
        },
        status: 'success',
      }),
    );

    // Should not throw "Maximum update depth exceeded"
    expect(() => {
      rerender(<VersionHistoryPage />);
    }).not.toThrow();
    expect(() => {
      rerender(<VersionHistoryPage />);
    }).not.toThrow();
    expect(() => {
      rerender(<VersionHistoryPage />);
    }).not.toThrow();
  });

  it('does not duplicate fetch when selecting a non-current version', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    // Should only fetch once, not twice (no duplicate from effect)
    await waitFor(() => {
      expect(mockGetVersion).toHaveBeenCalledTimes(1);
    });
  });

  it('clicking back to current version uses cached content without fetching', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    render(<VersionHistoryPage />);

    // First click v1 to move away from the current version (v3)
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);
    });

    mockGetVersion.mockClear();

    // Now click back to v3 (current). Since currentContent is not null and version === currentVersionNumber,
    // the fast path should trigger and getVersion should NOT be called.
    const v3Option = screen.getByRole('option', { name: /v3 \(current\)/i });
    await user.click(v3Option);

    // getVersion should NOT be called — content was cached
    await waitFor(() => {
      const preview = screen.getByRole('region', { name: /document preview/i });
      expect(preview).toHaveTextContent('Final content');
    });
    expect(mockGetVersion).not.toHaveBeenCalled();
  });

  it('handles missing route id param (id ?? "" fallback)', () => {
    // When useParams returns no id, templateId should default to empty string
    mockUseParams.mockReturnValue({}); // id is undefined
    mockUseTemplate.mockReturnValue(makeTemplateQueryResult({ isLoading: true, isPending: true }));
    mockUseTemplateVersions.mockReturnValue(
      makeVersionsQueryResult({ isLoading: true, isPending: true }),
    );

    render(<VersionHistoryPage />);

    // Should render skeleton without crashing (templateId = '')
    expect(screen.getByTestId('version-history-skeleton')).toBeInTheDocument();
  });

  it('auto-selects current version with null content when currentContent is undefined', () => {
    mockUseParams.mockReturnValue({ id: 't1' });
    // Template loaded with currentVersion=3 but content is undefined
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: mockTemplate,
          content: undefined as unknown as string, // currentContent will be undefined → currentContent ?? null = null
          changeSummary: null,
          tags: [],
        },
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

    render(<VersionHistoryPage />);

    // Should render (currentVersionNumber=3, auto-select fires, setVersionContent(undefined ?? null) = null)
    expect(screen.getByRole('listbox', { name: /version list/i })).toBeInTheDocument();
  });

  it('restore confirm skips update when versionContent is empty', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();

    // Make v1 return empty content so !versionContent is true in handleRestoreConfirm
    mockGetVersion.mockImplementation((_id: string, version: number) => {
      if (version === 1) {
        return Promise.resolve({
          id: 'ver1',
          templateId: 't1',
          version: 1,
          content: '', // empty string — !versionContent === true
          changeSummary: null,
          createdBy: 'u1',
          createdAt: '2026-01-01T00:00:00Z',
        });
      }
      const v = mockVersions.find((ver) => ver.version === version);
      if (!v) return Promise.reject(new Error('Not found'));
      return Promise.resolve(v);
    });

    render(<VersionHistoryPage />);

    // Click v1 to load empty content
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));
    expect(screen.getByText(/restore to v1\?/i)).toBeInTheDocument();

    // Click confirm — versionContent is '' (falsy), so early return fires; update NOT called
    const confirmBtn = screen.getByRole('button', { name: /^restore$/i });
    await user.click(confirmBtn);

    // mockUpdate should NOT have been called since versionContent is empty
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows diff with empty lines (covers text || empty fallback)', async () => {
    const user = userEvent.setup();
    mockUseParams.mockReturnValue({ id: 't1' });

    // Use versions with empty lines so diff produces lines with empty text
    const versionsWithEmptyLines = [
      {
        id: 'ver1',
        templateId: 't1',
        version: 1,
        content: '\n\n', // empty lines only
        changeSummary: null,
        createdBy: 'u1',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ver2',
        templateId: 't1',
        version: 2,
        content: 'something', // non-empty current content
        changeSummary: null,
        createdBy: 'u1',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ];

    const mockTemplateV2 = { ...mockTemplate, currentVersion: 2 };
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: mockTemplateV2,
          content: 'something',
          changeSummary: null,
          tags: [],
        },
        status: 'success',
      }),
    );
    mockUseTemplateVersions.mockReturnValue(
      makeVersionsQueryResult({
        isSuccess: true,
        isFetched: true,
        data: versionsWithEmptyLines,
        status: 'success',
      }),
    );
    mockGetVersion.mockImplementation((_id: string, version: number) => {
      const v = versionsWithEmptyLines.find((ver) => ver.version === version);
      if (!v) return Promise.reject(new Error('Not found'));
      return Promise.resolve(v);
    });

    render(<VersionHistoryPage />);

    // Select v1 to get the empty-lines content
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      const preview = screen.getByRole('region', { name: /document preview/i });
      expect(preview).toBeInTheDocument();
    });

    // Enable diff
    const diffToggle = screen.getByRole('checkbox', { name: /show changes/i });
    await user.click(diffToggle);

    // Diff view should appear (empty lines produce lines with empty text → '&nbsp;' fallback)
    await waitFor(() => {
      expect(screen.getByTestId('diff-view')).toBeInTheDocument();
    });
  });

  it('renders version list and dialog when currentVersionNumber is undefined (covers ?? 0 fallback)', async () => {
    const user = userEvent.setup();
    mockUseParams.mockReturnValue({ id: 't1' });

    // Template loaded but currentVersion is undefined (shouldn't normally happen, but covers fallback)
    const templateWithUndefinedVersion = {
      ...mockTemplate,
      currentVersion: undefined as unknown as number,
    };
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: templateWithUndefinedVersion,
          content: '',
          changeSummary: null,
          tags: [],
        },
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

    render(<VersionHistoryPage />);

    // Should render the version list (line 376: currentVersionNumber ?? 0)
    expect(screen.getByRole('listbox', { name: /version list/i })).toBeInTheDocument();

    // Click v1 to load content and show restore button
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    // Open dialog — renders line 599: currentVersionNumber ?? 0 + 1
    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));
    expect(screen.getByText(/restore to v1\?/i)).toBeInTheDocument();

    // Dialog text should include "v1" (0 + 1 = 1) for currentVersionNumber ?? 0
    expect(screen.getByText(/preserved as v1/i)).toBeInTheDocument();

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));
  });

  it('restore dialog shows correct version count when currentVersionNumber is defined', async () => {
    const user = userEvent.setup();
    setupLoadedMocks();
    const firstVersion = mockVersions[0];
    if (firstVersion) mockGetVersion.mockResolvedValue(firstVersion);

    render(<VersionHistoryPage />);

    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore to version 1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /restore to version 1/i }));

    // The dialog shows "preserved as v{currentVersionNumber + 1}" using ?? 0 fallback
    // With currentVersionNumber=3, it shows "v4"
    await waitFor(() => {
      expect(screen.getByText(/preserved as v4/i)).toBeInTheDocument();
    });
  });

  it('falls through to fetch when clicking current version but currentContent is null', async () => {
    const user = userEvent.setup();
    mockUseParams.mockReturnValue({ id: 't1' });

    // Start with loaded data so auto-select fires (selectedVersion = 3)
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: mockTemplate,
          content: mockVersions[2]?.content ?? '',
          changeSummary: null,
          tags: [],
        },
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

    const { rerender } = render(<VersionHistoryPage />);

    // Click v1 to deselect v3 (selectedVersion becomes 1)
    const v1Option = screen.getByRole('option', { name: /v1/i });
    await user.click(v1Option);
    await waitFor(() => {
      expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);
    });
    mockGetVersion.mockClear();

    // Update mock: currentVersionNumber=3 but currentContent=null
    mockUseTemplate.mockReturnValue(
      makeTemplateQueryResult({
        isSuccess: true,
        isFetched: true,
        data: {
          template: mockTemplate,
          content: null as unknown as string, // null content: fast path skipped, getVersion called
          changeSummary: null,
          tags: [],
        },
        status: 'success',
      }),
    );
    rerender(<VersionHistoryPage />);

    // Click v3 (currentVersionNumber=3, currentContent=null → fast path skipped)
    const v3Option = screen.getByRole('option', { name: /v3 \(current\)/i });
    await user.click(v3Option);

    await waitFor(() => {
      expect(mockGetVersion).toHaveBeenCalledWith('t1', 3);
    });
  });
});
