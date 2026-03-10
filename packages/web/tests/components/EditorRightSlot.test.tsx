/// <reference types="@testing-library/jest-dom/vitest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseCollaboration = vi.fn();

vi.mock('../../src/hooks/useCollaboration.js', () => ({
  useCollaboration: (...args: unknown[]) => mockUseCollaboration(...args) as unknown,
}));

vi.mock('../../src/components/PresenceAvatars.js', () => ({
  PresenceAvatars: ({ users }: { users: { userId: string; email: string; color: string }[] }) => (
    <div data-testid="presence-avatars">{String(users.length)} users</div>
  ),
}));

vi.mock('../../src/components/ConnectionStatus.js', () => ({
  ConnectionStatus: ({ status }: { status: string }) => (
    <span data-testid="connection-status">{status}</span>
  ),
}));

// Import after mocks
const { EditorRightSlot } = await import('../../src/components/EditorRightSlot.js');

// ── Helpers ───────────────────────────────────────────────────────────

function renderWithClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const defaultCollaborationUser = {
  userId: 'u1',
  email: 'test@example.com',
  color: '#1976d2',
};

const connectedCollaboration = {
  ydoc: null,
  awareness: null,
  status: 'connected',
  connectedUsers: [{ userId: 'u1', email: 'test@example.com', color: '#1976d2' }],
  saveVersion: vi.fn(),
  isSynced: true,
  reconnect: vi.fn(),
};

const disconnectedCollaboration = {
  ydoc: null,
  awareness: null,
  status: 'disconnected',
  connectedUsers: [],
  saveVersion: vi.fn(),
  isSynced: false,
  reconnect: vi.fn(),
};

const reconnectingCollaboration = {
  ydoc: null,
  awareness: null,
  status: 'reconnecting',
  connectedUsers: [],
  saveVersion: vi.fn(),
  isSynced: false,
  reconnect: vi.fn(),
};

describe('EditorRightSlot', () => {
  const mockOnExport = vi.fn();

  beforeEach(() => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);
    mockOnExport.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Non-create mode (id defined) ──────────────────────────────────

  it('renders ConnectionStatus when collaboration is connected (non-create mode)', () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
  });

  it('renders PresenceAvatars when collaboration is not disconnected', () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.getByTestId('presence-avatars')).toBeInTheDocument();
    expect(screen.getByTestId('presence-avatars')).toHaveTextContent('1 users');
  });

  it('hides PresenceAvatars when collaboration is disconnected', () => {
    mockUseCollaboration.mockReturnValue(disconnectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.queryByTestId('presence-avatars')).not.toBeInTheDocument();
  });

  it('renders export button in non-create mode', () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls onExport when export button is clicked', async () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);
    const user = userEvent.setup();

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('shows unified status: draftSaveStatus takes priority over connected when both present', () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus="saving"
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    // 'saving' has higher priority than 'connected'
    expect(screen.getByTestId('connection-status')).toHaveTextContent('saving');
  });

  it('shows unified status: error takes highest priority', () => {
    mockUseCollaboration.mockReturnValue({
      ...connectedCollaboration,
      status: 'reconnecting',
    });

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus="error"
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
  });

  it('shows reconnecting status when collaboration is reconnecting and no draftSaveStatus', () => {
    mockUseCollaboration.mockReturnValue(reconnectingCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('reconnecting');
  });

  it('does not render ConnectionStatus when disconnected and no draftSaveStatus', () => {
    mockUseCollaboration.mockReturnValue(disconnectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    // disconnected status is excluded from unifiedStatus computation
    expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
  });

  // ── Create mode (id undefined) ────────────────────────────────────

  it('returns nothing for create mode with no draftSaveStatus', () => {
    const { container } = renderWithClient(
      <EditorRightSlot
        collaborationUser={null}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id={undefined}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows ConnectionStatus for create mode with draftSaveStatus', () => {
    renderWithClient(
      <EditorRightSlot
        collaborationUser={null}
        draftSaveStatus="saving"
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id={undefined}
      />,
    );

    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('saving');
  });

  it('does not render export button or PresenceAvatars in create mode', () => {
    renderWithClient(
      <EditorRightSlot
        collaborationUser={null}
        draftSaveStatus="saving"
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id={undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('presence-avatars')).not.toBeInTheDocument();
  });

  it('does not crash on rapid status transitions', () => {
    const statuses = ['connecting', 'connected', 'reconnecting', 'connected', 'disconnected'];

    for (const status of statuses) {
      mockUseCollaboration.mockReturnValue({
        ...connectedCollaboration,
        status,
        connectedUsers:
          status !== 'disconnected' ? [{ userId: 'u1', email: 'a@b.com', color: '#f00' }] : [],
      });

      const { unmount } = renderWithClient(
        <EditorRightSlot
          collaborationUser={defaultCollaborationUser}
          draftSaveStatus={null}
          onExport={mockOnExport}
          queryClient={new QueryClient()}
          id="tmpl-1"
        />,
      );
      unmount();
    }

    // No assertion needed — test passes if no crash occurs
    expect(true).toBe(true);
  });

  it('passes collaborationUser to useCollaboration', () => {
    mockUseCollaboration.mockReturnValue(connectedCollaboration);

    renderWithClient(
      <EditorRightSlot
        collaborationUser={defaultCollaborationUser}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id="tmpl-1"
      />,
    );

    expect(mockUseCollaboration).toHaveBeenCalledWith(
      'tmpl-1',
      defaultCollaborationUser,
      expect.objectContaining({ onCommentEvent: expect.any(Function) }),
    );
  });

  it('passes null templateId to useCollaboration in create mode', () => {
    renderWithClient(
      <EditorRightSlot
        collaborationUser={null}
        draftSaveStatus={null}
        onExport={mockOnExport}
        queryClient={new QueryClient()}
        id={undefined}
      />,
    );

    expect(mockUseCollaboration).toHaveBeenCalledWith(null, null, expect.anything());
  });
});
