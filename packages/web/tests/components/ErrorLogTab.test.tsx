/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { ErrorLogEntry } from '@legalcode/shared';

const mockUseErrorLog = vi.fn();
const mockResolveError = vi.fn();
let mockResolveIsSuccess = false;

vi.mock('../../src/hooks/useErrorLog.js', () => ({
  useErrorLog: (...args: unknown[]) => mockUseErrorLog(...args) as unknown,
  useResolveError: () => ({
    mutate: mockResolveError,
    isSuccess: mockResolveIsSuccess,
  }),
}));

const mockGenerateFixPrompt = vi.fn().mockReturnValue('# Fix Prompt');
vi.mock('../../src/utils/generateFixPrompt.js', () => ({
  generateFixPrompt: (...args: unknown[]) => mockGenerateFixPrompt(...args) as unknown,
}));

const { ErrorLogTab } = await import('../../src/components/ErrorLogTab.js');

const mockError: ErrorLogEntry = {
  id: 'err-1',
  timestamp: new Date(Date.now() - 3600_000).toISOString(),
  source: 'frontend',
  severity: 'error',
  message: 'Cannot read properties of undefined',
  stack: 'TypeError: Cannot read properties of undefined\n    at Foo.tsx:10',
  metadata: null,
  url: 'https://legalcode.ax1access.com/templates',
  userId: 'user-1',
  status: 'open',
  resolvedAt: null,
  resolvedBy: null,
  fingerprint: 'fp-1',
  occurrenceCount: 3,
  lastSeenAt: new Date(Date.now() - 1800_000).toISOString(),
};

const mockResolvedError: ErrorLogEntry = {
  ...mockError,
  id: 'err-2',
  status: 'resolved',
  resolvedAt: '2026-03-07T10:00:00Z',
  resolvedBy: 'admin',
  occurrenceCount: 1,
};

const backendError: ErrorLogEntry = {
  ...mockError,
  id: 'err-3',
  source: 'backend',
  severity: 'critical',
  message: 'Database connection timeout',
  occurrenceCount: 5,
};

const wsError: ErrorLogEntry = {
  ...mockError,
  id: 'err-4',
  source: 'websocket',
  message: 'WebSocket disconnected',
  occurrenceCount: 1,
};

const funcError: ErrorLogEntry = {
  ...mockError,
  id: 'err-5',
  source: 'functional',
  message: 'Template save failed',
  occurrenceCount: 2,
};

function renderTab() {
  return render(
    <ThemeProvider theme={theme}>
      <ErrorLogTab />
    </ThemeProvider>,
  );
}

describe('ErrorLogTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveIsSuccess = false;
    mockUseErrorLog.mockReturnValue({
      data: { errors: [] },
      isLoading: false,
    });
  });

  // --- Empty state ---

  it('shows empty state when no errors', () => {
    renderTab();
    expect(screen.getByText('No errors recorded')).toBeInTheDocument();
    expect(screen.getByText('When errors occur, they will appear here.')).toBeInTheDocument();
  });

  // --- Loading state ---

  it('shows loading indicator', () => {
    mockUseErrorLog.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderTab();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // --- Error list ---

  it('renders error entries with message and source badge', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
    // FE appears in both filter chip and source badge
    expect(screen.getAllByText('FE')).toHaveLength(2);
  });

  it('shows occurrence count badge when > 1', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('does not show occurrence count badge when count is 1', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [wsError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.queryByText(/×1/)).not.toBeInTheDocument();
  });

  it('renders stack preview truncated', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText(/TypeError: Cannot read properties/)).toBeInTheDocument();
  });

  it('renders resolved rows with reduced opacity', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockResolvedError] },
      isLoading: false,
    });
    renderTab();
    const listItems = screen.getAllByRole('listitem');
    const resolvedItem = listItems[0];
    expect(resolvedItem).toBeDefined();
    expect(resolvedItem?.style.opacity).toBe('0.5');
  });

  it('shows url and userId in caption', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText(/legalcode.ax1access.com/)).toBeInTheDocument();
    expect(screen.getByText(/user-1/)).toBeInTheDocument();
  });

  it('handles error with null url and userId', () => {
    const noUrlError: ErrorLogEntry = { ...mockError, url: null, userId: null };
    mockUseErrorLog.mockReturnValue({
      data: { errors: [noUrlError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
  });

  it('handles error with null stack', () => {
    const noStackError: ErrorLogEntry = { ...mockError, stack: null };
    mockUseErrorLog.mockReturnValue({
      data: { errors: [noStackError] },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
  });

  // --- Source badges ---

  it('renders BE badge for backend source', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [backendError] },
      isLoading: false,
    });
    renderTab();
    // BE appears in both filter chip and source badge
    expect(screen.getAllByText('BE')).toHaveLength(2);
  });

  it('renders WS badge for websocket source', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [wsError] },
      isLoading: false,
    });
    renderTab();
    // WS appears in both filter chip and source badge
    expect(screen.getAllByText('WS')).toHaveLength(2);
  });

  it('renders FUNC badge for functional source', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [funcError] },
      isLoading: false,
    });
    renderTab();
    // FUNC appears in both filter chip and source badge
    expect(screen.getAllByText('FUNC')).toHaveLength(2);
  });

  // --- Filter chips ---

  it('renders source filter chips', () => {
    renderTab();
    // Two "All" buttons: one for source, one for status
    expect(screen.getAllByRole('button', { name: 'All' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'FE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FUNC' })).toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    renderTab();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved' })).toBeInTheDocument();
  });

  it('clicking source filter chip updates filters', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'FE' }));

    // Verify useErrorLog was called with the source filter
    expect(mockUseErrorLog).toHaveBeenCalledWith(expect.objectContaining({ source: 'frontend' }));
  });

  it('clicking status filter chip updates filters', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Resolved' }));

    expect(mockUseErrorLog).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved' }));
  });

  it('clicking All source filter clears source filter', async () => {
    const user = userEvent.setup();
    renderTab();

    // First select FE
    await user.click(screen.getByRole('button', { name: 'FE' }));
    // Then click the first All (source All)
    const allButtons = screen.getAllByRole('button', { name: 'All' });
    const sourceAllBtn = allButtons[0];
    if (!sourceAllBtn) throw new Error('Expected source All button');
    await user.click(sourceAllBtn);

    // When both filters are "all", useErrorLog is called with undefined
    const lastCall = mockUseErrorLog.mock.calls[mockUseErrorLog.mock.calls.length - 1] as
      | [unknown]
      | undefined;
    const arg = lastCall?.[0] as Record<string, unknown> | undefined;
    expect(arg?.source).toBeUndefined();
  });

  it('clicking "All" status filter clears status filter', async () => {
    const user = userEvent.setup();
    renderTab();

    // Click Open first, then the status "All"
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // There should be a second "All" for status
    const allButtons = screen.getAllByRole('button', { name: 'All' });
    // The second "All" is for status
    const statusAllBtn = allButtons[1];
    if (!statusAllBtn) throw new Error('Expected second All button');
    await user.click(statusAllBtn);

    // When both filters are "all", useErrorLog is called with undefined
    const lastCall = mockUseErrorLog.mock.calls[mockUseErrorLog.mock.calls.length - 1] as
      | [unknown]
      | undefined;
    const arg = lastCall?.[0] as Record<string, unknown> | undefined;
    expect(arg?.status).toBeUndefined();
  });

  // --- Copy Prompt ---

  it('copies fix prompt to clipboard on Copy Prompt click', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    });

    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();

    const copyBtn = screen.getByRole('button', { name: /copy prompt/i });
    await user.click(copyBtn);

    expect(mockGenerateFixPrompt).toHaveBeenCalledWith(mockError);
    expect(writeTextSpy).toHaveBeenCalledWith('# Fix Prompt');
  });

  it('shows "Copied!" feedback after copying', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();

    const copyBtn = screen.getByRole('button', { name: /copy prompt/i });
    await user.click(copyBtn);

    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  // --- Mark Fixed ---

  it('shows Mark Fixed button only for unresolved errors', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError, mockResolvedError] },
      isLoading: false,
    });
    renderTab();

    const markFixedButtons = screen.getAllByRole('button', { name: /mark fixed/i });
    // Only one Mark Fixed button (for the open error)
    expect(markFixedButtons).toHaveLength(1);
  });

  it('calls resolveError on Mark Fixed click', async () => {
    const user = userEvent.setup();
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();

    const markFixedBtn = screen.getByRole('button', { name: /mark fixed/i });
    await user.click(markFixedBtn);

    expect(mockResolveError).toHaveBeenCalledWith('err-1');
  });

  // --- Multiple errors ---

  it('renders multiple errors in list', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError, backendError, wsError] },
      isLoading: false,
    });
    renderTab();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  // --- Relative time ---

  it('displays relative time for errors', () => {
    mockUseErrorLog.mockReturnValue({
      data: { errors: [mockError] },
      isLoading: false,
    });
    renderTab();

    // mockError timestamp is 1 hour ago
    expect(screen.getByText(/1h ago/)).toBeInTheDocument();
  });
});
