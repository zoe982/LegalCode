/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { OfflineBar } from '../../src/components/OfflineBar.js';

interface ListenerMap {
  online: EventListener[];
  offline: EventListener[];
}

let listeners: ListenerMap;
let onLineMock: boolean;

beforeEach(() => {
  listeners = { online: [], offline: [] };
  onLineMock = true;

  Object.defineProperty(navigator, 'onLine', {
    get: () => onLineMock,
    configurable: true,
  });

  vi.spyOn(window, 'addEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'online' || event === 'offline') {
        listeners[event].push(handler as EventListener);
      }
    },
  );

  vi.spyOn(window, 'removeEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'online' || event === 'offline') {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderOfflineBar() {
  return render(
    <ThemeProvider theme={theme}>
      <OfflineBar />
    </ThemeProvider>,
  );
}

describe('OfflineBar', () => {
  it('hides bar when online', () => {
    onLineMock = true;
    renderOfflineBar();
    expect(screen.queryByTestId('offline-bar')).not.toBeInTheDocument();
    expect(screen.queryByText(/working offline/i)).not.toBeInTheDocument();
  });

  it('shows bar when browser starts offline', () => {
    onLineMock = false;
    renderOfflineBar();
    expect(screen.getByTestId('offline-bar')).toBeInTheDocument();
    expect(screen.getByText(/working offline/i)).toBeInTheDocument();
  });

  it('shows bar when going offline via event', () => {
    onLineMock = true;
    renderOfflineBar();
    expect(screen.queryByTestId('offline-bar')).not.toBeInTheDocument();

    act(() => {
      onLineMock = false;
      for (const handler of listeners.offline) {
        handler(new Event('offline'));
      }
    });

    expect(screen.getByTestId('offline-bar')).toBeInTheDocument();
    expect(screen.getByText(/working offline/i)).toBeInTheDocument();
  });

  it('hides bar when coming back online via event', () => {
    onLineMock = false;
    renderOfflineBar();
    expect(screen.getByTestId('offline-bar')).toBeInTheDocument();

    act(() => {
      onLineMock = true;
      for (const handler of listeners.online) {
        handler(new Event('online'));
      }
    });

    expect(screen.queryByTestId('offline-bar')).not.toBeInTheDocument();
  });

  it('shows "Working offline" message text', () => {
    onLineMock = false;
    renderOfflineBar();
    expect(screen.getByText('Working offline \u2014 changes saved locally.')).toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    onLineMock = false;
    const { unmount } = renderOfflineBar();
    expect(listeners.online.length).toBeGreaterThan(0);
    expect(listeners.offline.length).toBeGreaterThan(0);

    unmount();
    expect(listeners.online).toHaveLength(0);
    expect(listeners.offline).toHaveLength(0);
  });
});
