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

    expect(screen.getByText('No versions yet')).toBeInTheDocument();
  });

  it('shows warm empty state message about automatic version history', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: [],
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={1} />);

    expect(
      screen.getByText('Your version history will build automatically as you work.'),
    ).toBeInTheDocument();
  });

  it('shows "View diff" links for non-first versions', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const onNavigateDiff = vi.fn();
    render(<VersionHistory templateId="t1" currentVersion={2} onNavigateDiff={onNavigateDiff} />);

    // Version 2 should have a "View diff" link (comparing against version 1)
    const diffLinks = screen.getAllByRole('button', { name: /view diff/i });
    expect(diffLinks.length).toBeGreaterThan(0);
  });

  it('"View diff" link calls onNavigateDiff with correct versions', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const onNavigateDiff = vi.fn();
    render(<VersionHistory templateId="t1" currentVersion={2} onNavigateDiff={onNavigateDiff} />);

    const diffLinks = screen.getAllByRole('button', { name: /view diff/i });
    const firstDiffLink = diffLinks[0];
    if (!firstDiffLink) throw new Error('No diff link found');
    await user.click(firstDiffLink);

    // Should be called with previous and current version numbers
    expect(onNavigateDiff).toHaveBeenCalledWith(1, 2);
  });

  it('"Compare versions" button calls onNavigateDiff with two most recent versions', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const onNavigateDiff = vi.fn();
    render(<VersionHistory templateId="t1" currentVersion={2} onNavigateDiff={onNavigateDiff} />);

    const compareBtn = screen.getByRole('button', { name: /compare versions/i });
    await user.click(compareBtn);

    expect(onNavigateDiff).toHaveBeenCalledWith(1, 2);
  });

  it('"Restore" button shows confirmation dialog', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const onRestore = vi.fn();
    render(<VersionHistory templateId="t1" currentVersion={2} onRestore={onRestore} />);

    // Version 1 (not current) should have a Restore button
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons.length).toBeGreaterThan(0);

    const restoreBtn = restoreButtons[0];
    if (!restoreBtn) throw new Error('No restore button');
    await user.click(restoreBtn);

    // Confirmation dialog should appear
    expect(screen.getByText(/restore this version/i)).toBeInTheDocument();
  });

  it('confirming restore calls onRestore callback', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const onRestore = vi.fn();
    render(<VersionHistory templateId="t1" currentVersion={2} onRestore={onRestore} />);

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    const restoreBtn = restoreButtons[0];
    if (!restoreBtn) throw new Error('No restore button');
    await user.click(restoreBtn);

    // Click confirm in dialog
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    expect(onRestore).toHaveBeenCalledWith(1);
  });

  it('shows "Create Version" button when onCreateVersion is provided', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} onCreateVersion={vi.fn()} />);

    expect(screen.getByRole('button', { name: /create version/i })).toBeInTheDocument();
  });

  it('does not show "Create Version" button when onCreateVersion is not provided', () => {
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} />);

    expect(screen.queryByRole('button', { name: /create version/i })).not.toBeInTheDocument();
  });

  it('clicking "Create Version" shows inline form with text field and Create/Cancel buttons', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} onCreateVersion={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create version/i }));

    expect(screen.getByLabelText('Version summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCreateVersion with summary when Create is clicked', async () => {
    const user = userEvent.setup();
    const onCreateVersion = vi.fn();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} onCreateVersion={onCreateVersion} />);

    await user.click(screen.getByRole('button', { name: /create version/i }));
    await user.type(screen.getByLabelText('Version summary'), 'Added clause 5');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(onCreateVersion).toHaveBeenCalledWith('Added clause 5');
  });

  it('hides form and resets summary when Cancel is clicked', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={2} onCreateVersion={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create version/i }));
    await user.type(screen.getByLabelText('Version summary'), 'Some text');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Form should be hidden, button should be visible again
    expect(screen.getByRole('button', { name: /create version/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Version summary')).not.toBeInTheDocument();
  });

  it('shows "Creating..." text when isCreatingVersion is true', async () => {
    const user = userEvent.setup();
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: mockVersions,
        status: 'success',
      }),
    );

    const { rerender } = render(
      <VersionHistory
        templateId="t1"
        currentVersion={2}
        onCreateVersion={vi.fn()}
        isCreatingVersion={false}
      />,
    );

    // Open the form first
    await user.click(screen.getByRole('button', { name: /create version/i }));

    // Rerender with isCreatingVersion=true
    rerender(
      <VersionHistory
        templateId="t1"
        currentVersion={2}
        onCreateVersion={vi.fn()}
        isCreatingVersion={true}
      />,
    );

    expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeDisabled();
  });

  it('does not show "Compare versions" button when only one version exists', () => {
    const singleVersion = [mockVersions[0]].filter(Boolean) as TemplateVersion[];
    mockUseTemplateVersions.mockReturnValue(
      makeQueryResult({
        isSuccess: true,
        isFetched: true,
        data: singleVersion,
        status: 'success',
      }),
    );

    render(<VersionHistory templateId="t1" currentVersion={1} />);

    expect(screen.queryByRole('button', { name: /compare versions/i })).not.toBeInTheDocument();
  });
});
