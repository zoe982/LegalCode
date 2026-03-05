/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TemplateVersion } from '@legalcode/shared';
import { VersionHistory } from '../../src/components/VersionHistory.js';

const mockUseTemplateVersions = vi.fn<() => UseQueryResult<TemplateVersion[]>>();
const mockGetVersion = vi.fn<(id: string, version: number) => Promise<TemplateVersion>>();

vi.mock('../../src/hooks/useTemplates.js', () => ({
  useTemplateVersions: (...args: unknown[]) =>
    mockUseTemplateVersions(...(args as Parameters<typeof mockUseTemplateVersions>)),
}));

vi.mock('../../src/services/templates.js', () => ({
  templateService: {
    getVersion: (...args: unknown[]) =>
      mockGetVersion(...(args as Parameters<typeof mockGetVersion>)),
  },
}));

vi.mock('../../src/components/MarkdownEditor.js', () => ({
  MarkdownEditor: ({ defaultValue, readOnly }: { defaultValue?: string; readOnly?: boolean }) => (
    <div data-testid="markdown-editor" data-readonly={readOnly}>
      {defaultValue}
    </div>
  ),
}));

const mockVersions: TemplateVersion[] = [
  {
    id: 'v1',
    templateId: 't1',
    version: 1,
    content: '# Version 1',
    changeSummary: null,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v2',
    templateId: 't1',
    version: 2,
    content: '# Version 2',
    changeSummary: 'Updated clause 3',
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

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

describe('VersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching versions', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isLoading: true,
        isPending: true,
        fetchStatus: 'fetching',
        isFetching: true,
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders list of versions with version chips and change summaries', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Updated clause 3')).toBeInTheDocument();
  });

  it('current version is highlighted (selected)', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    const listItems = screen.getAllByRole('button');
    // Version 2 should be first (sorted descending), and should be selected
    const v2Item = listItems[0];
    expect(v2Item).toHaveClass('Mui-selected');
  });

  it('shows "Initial version" for null changeSummary', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    expect(screen.getByText('Initial version')).toBeInTheDocument();
  });

  it('clicking a version loads its content in read-only editor', async () => {
    const user = userEvent.setup();

    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const version1 = mockVersions[0];
    if (!version1) throw new Error('Test setup error');
    mockGetVersion.mockResolvedValue(version1);

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    // Click version 1 (second item since sorted descending)
    const v1Chip = screen.getByText('v1');
    const v1ListItem = v1Chip.closest('[role="button"]');
    if (!v1ListItem) throw new Error('List item not found');
    await user.click(v1ListItem);

    expect(mockGetVersion).toHaveBeenCalledWith('t1', 1);

    // Wait for editor to appear with version content
    const editor = await screen.findByTestId('markdown-editor');
    expect(editor).toHaveTextContent('# Version 1');
    expect(editor).toHaveAttribute('data-readonly', 'true');
  });

  it('shows empty state when no versions exist', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: [],
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={1} />);

    expect(screen.getByText('No versions')).toBeInTheDocument();
  });
});
