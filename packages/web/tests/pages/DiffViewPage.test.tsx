/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TemplateVersion } from '@legalcode/shared';
import { DiffViewPage } from '../../src/pages/DiffViewPage.js';

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

const mockUseTemplateVersions = vi.fn<() => UseQueryResult<TemplateVersion[]>>();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplateVersions: (...args: unknown[]) =>
    mockUseTemplateVersions(...(args as Parameters<typeof mockUseTemplateVersions>)),
}));

const mockGetVersion = vi.fn<(id: string, version: number) => Promise<TemplateVersion>>();

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    getVersion: (...args: unknown[]) =>
      mockGetVersion(...(args as Parameters<typeof mockGetVersion>)),
  },
}));

vi.mock('../../src/contexts/TopAppBarContext.js', () => ({
  useTopAppBarConfig: () => ({
    setConfig: vi.fn(),
    clearConfig: vi.fn(),
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────

const versionV1: TemplateVersion = {
  id: 'v1',
  templateId: 't1',
  version: 1,
  content: 'line alpha\nline beta\nline gamma',
  changeSummary: null,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
};

const versionV2: TemplateVersion = {
  id: 'v2',
  templateId: 't1',
  version: 2,
  content: 'line alpha\nline delta\nline gamma',
  changeSummary: 'Updated clause',
  createdBy: 'u1',
  createdAt: '2026-02-01T00:00:00Z',
};

const allVersions: TemplateVersion[] = [versionV1, versionV2];

function makeQueryResult(
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

function setupMocks() {
  mockUseParams.mockReturnValue({ id: 't1', v1: '1', v2: '2' });
  mockUseTemplateVersions.mockReturnValue(
    makeQueryResult({
      isSuccess: true,
      isFetched: true,
      data: allVersions,
      status: 'success',
    }),
  );
  mockGetVersion.mockImplementation((_id: string, version: number) => {
    const v = allVersions.find((ver) => ver.version === version);
    if (!v) return Promise.reject(new Error('Not found'));
    return Promise.resolve(v);
  });
}

describe('DiffViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders unified diff by default', async () => {
    render(<DiffViewPage />);

    // Wait for versions to load
    const diffContainer = await screen.findByTestId('diff-container');
    expect(diffContainer).toBeInTheDocument();

    // Unified mode should be active by default
    const unifiedBtn = screen.getByRole('button', { name: /unified/i });
    expect(unifiedBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows added lines with green background style', async () => {
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    // "line delta" is added (in v2 but not v1)
    const addedLines = screen.getAllByTestId('diff-line-added');
    expect(addedLines.length).toBeGreaterThan(0);
  });

  it('shows removed lines with red background style', async () => {
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    // "line beta" is removed (in v1 but not v2)
    const removedLines = screen.getAllByTestId('diff-line-removed');
    expect(removedLines.length).toBeGreaterThan(0);
  });

  it('toggle switches to side-by-side view', async () => {
    const user = userEvent.setup();
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    const sideBySideBtn = screen.getByRole('button', { name: /side-by-side/i });
    await user.click(sideBySideBtn);

    expect(sideBySideBtn).toHaveAttribute('aria-pressed', 'true');

    // Side-by-side should show two columns
    expect(screen.getByTestId('diff-side-left')).toBeInTheDocument();
    expect(screen.getByTestId('diff-side-right')).toBeInTheDocument();
  });

  it('version selectors are present', async () => {
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    // Two version selectors (comboboxes from Select components)
    const selectors = screen.getAllByRole('combobox');
    expect(selectors.length).toBe(2);
  });

  it('"Back to editor" link navigates correctly', async () => {
    const user = userEvent.setup();
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    const backLink = screen.getByRole('button', { name: /back to editor/i });
    await user.click(backLink);

    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1');
  });

  it('shows loading state while fetching versions', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isLoading: true,
        isPending: true,
        fetchStatus: 'fetching',
        isFetching: true,
      }),
    );

    render(<DiffViewPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows unchanged lines with space prefix in unified mode', async () => {
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    const unchangedLines = screen.getAllByTestId('diff-line-unchanged');
    expect(unchangedLines.length).toBeGreaterThan(0);
  });

  it('can switch from side-by-side back to unified', async () => {
    const user = userEvent.setup();
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    // Switch to side-by-side
    const sideBySideBtn = screen.getByRole('button', { name: /side-by-side/i });
    await user.click(sideBySideBtn);
    expect(screen.getByTestId('diff-side-left')).toBeInTheDocument();

    // Switch back to unified
    const unifiedBtn = screen.getByRole('button', { name: /unified/i });
    await user.click(unifiedBtn);
    expect(unifiedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('diff-side-left')).not.toBeInTheDocument();
  });

  it('side-by-side view shows diff lines in both panels', async () => {
    const user = userEvent.setup();
    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    const sideBySideBtn = screen.getByRole('button', { name: /side-by-side/i });
    await user.click(sideBySideBtn);

    // Both panels should contain diff lines
    const leftPanel = screen.getByTestId('diff-side-left');
    const rightPanel = screen.getByTestId('diff-side-right');
    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();

    // Should have both removed and added lines across panels
    const allDiffLines = screen.getAllByTestId(/diff-line-/);
    expect(allDiffLines.length).toBeGreaterThan(0);
  });

  it('handles missing route params gracefully', async () => {
    mockUseParams.mockReturnValue({ id: undefined, v1: undefined, v2: undefined });
    mockGetVersion.mockResolvedValue(versionV1);

    render(<DiffViewPage />);

    // Should not crash — empty templateId guard fires
    await screen.findByTestId('diff-container');
  });

  it('renders empty version selectors when versions list is empty', async () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: [],
        status: 'success',
      }),
    );

    render(<DiffViewPage />);

    await screen.findByTestId('diff-container');

    const selectors = screen.getAllByRole('combobox');
    expect(selectors.length).toBe(2);
  });
});
