/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import type { RegisterSWOptions } from 'virtual:pwa-register/react';

type StateTuple = [boolean, (val: boolean) => void];

const mockUpdateServiceWorker = vi.fn();
let mockNeedRefresh: StateTuple;
let mockOfflineReady: StateTuple;
let capturedOptions: RegisterSWOptions | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: RegisterSWOptions) => {
    capturedOptions = options;
    return {
      needRefresh: mockNeedRefresh,
      offlineReady: mockOfflineReady,
      updateServiceWorker: mockUpdateServiceWorker,
    };
  },
}));

import { ReloadPrompt, SW_UPDATE_INTERVAL } from '../../src/components/ReloadPrompt.js';

function renderReloadPrompt() {
  return render(
    <ThemeProvider theme={theme}>
      <ReloadPrompt />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockNeedRefresh = [false, vi.fn()];
  mockOfflineReady = [false, vi.fn()];
  mockUpdateServiceWorker.mockReset();
  capturedOptions = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReloadPrompt', () => {
  it('renders nothing when needRefresh is false and offlineReady is false', () => {
    renderReloadPrompt();
    expect(screen.queryByText(/new version/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('shows snackbar when needRefresh is true with correct message', () => {
    mockNeedRefresh = [true, vi.fn()];
    renderReloadPrompt();
    expect(screen.getByText('A new version is available')).toBeInTheDocument();
  });

  it('shows "Reload" button when needRefresh is true', () => {
    mockNeedRefresh = [true, vi.fn()];
    renderReloadPrompt();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('calls updateServiceWorker(true) when Reload is clicked', async () => {
    const user = userEvent.setup();
    mockNeedRefresh = [true, vi.fn()];
    renderReloadPrompt();

    await user.click(screen.getByRole('button', { name: /reload/i }));
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('hides snackbar when dismissed via close button', async () => {
    const user = userEvent.setup();
    const setNeedRefresh = vi.fn();
    mockNeedRefresh = [true, setNeedRefresh];
    renderReloadPrompt();

    expect(screen.getByText('A new version is available')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('shows offline-ready snackbar when offlineReady is true', () => {
    mockOfflineReady = [true, vi.fn()];
    renderReloadPrompt();
    expect(screen.getByText('App ready for offline use')).toBeInTheDocument();
  });

  it('dismisses offline-ready snackbar when close is clicked', async () => {
    const user = userEvent.setup();
    const setOfflineReady = vi.fn();
    mockOfflineReady = [true, setOfflineReady];
    renderReloadPrompt();

    expect(screen.getByText('App ready for offline use')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(setOfflineReady).toHaveBeenCalledWith(false);
  });

  describe('periodic SW update checking', () => {
    it('calls useRegisterSW with an onRegistered callback', () => {
      renderReloadPrompt();
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions?.onRegistered).toBeTypeOf('function');
    });

    it('sets up setInterval with correct interval when registration is provided', () => {
      vi.useFakeTimers();
      renderReloadPrompt();

      const mockRegistration = { update: vi.fn().mockResolvedValue(undefined) };
      capturedOptions?.onRegistered?.(mockRegistration as unknown as ServiceWorkerRegistration);

      expect(vi.getTimerCount()).toBe(1);

      vi.useRealTimers();
    });

    it('calls registration.update() when the interval fires', () => {
      vi.useFakeTimers();
      renderReloadPrompt();

      const mockRegistration = { update: vi.fn().mockResolvedValue(undefined) };
      capturedOptions?.onRegistered?.(mockRegistration as unknown as ServiceWorkerRegistration);

      expect(mockRegistration.update).not.toHaveBeenCalled();

      vi.advanceTimersByTime(SW_UPDATE_INTERVAL);
      expect(mockRegistration.update).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(SW_UPDATE_INTERVAL);
      expect(mockRegistration.update).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('does not set interval when onRegistered fires with undefined', () => {
      vi.useFakeTimers();
      renderReloadPrompt();

      capturedOptions?.onRegistered?.(undefined);

      expect(vi.getTimerCount()).toBe(0);

      vi.useRealTimers();
    });

    it('exports SW_UPDATE_INTERVAL as 60000', () => {
      expect(SW_UPDATE_INTERVAL).toBe(60_000);
    });
  });
});
