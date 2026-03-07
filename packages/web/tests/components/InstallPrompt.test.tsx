/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { InstallPrompt } from '../../src/components/InstallPrompt.js';

interface ListenerMap {
  beforeinstallprompt: EventListener[];
  appinstalled: EventListener[];
}

let listeners: ListenerMap;
let originalLocalStorage: Storage;

const localStorageStore: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- test mock
    delete localStorageStore[key];
  }),
  clear: vi.fn(),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn(),
};

function renderInstallPrompt() {
  return render(
    <ThemeProvider theme={theme}>
      <InstallPrompt />
    </ThemeProvider>,
  );
}

function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn> } {
  const promptFn = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    preventDefault: () => void;
  };
  Object.defineProperty(event, 'prompt', { value: promptFn });

  act(() => {
    for (const handler of listeners.beforeinstallprompt) {
      handler(event);
    }
  });

  return { prompt: promptFn };
}

function fireAppInstalled(): void {
  act(() => {
    for (const handler of listeners.appinstalled) {
      handler(new Event('appinstalled'));
    }
  });
}

beforeEach(() => {
  listeners = { beforeinstallprompt: [], appinstalled: [] };

  // Clear localStorage mock store
  for (const key of Object.keys(localStorageStore)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- test cleanup
    delete localStorageStore[key];
  }

  originalLocalStorage = window.localStorage;
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });

  vi.spyOn(window, 'addEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'beforeinstallprompt' || event === 'appinstalled') {
        listeners[event].push(handler as EventListener);
      }
    },
  );

  vi.spyOn(window, 'removeEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'beforeinstallprompt' || event === 'appinstalled') {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, 'localStorage', {
    value: originalLocalStorage,
    configurable: true,
    writable: true,
  });
});

describe('InstallPrompt', () => {
  it('renders nothing initially when no beforeinstallprompt has fired', () => {
    renderInstallPrompt();
    expect(screen.queryByText(/install legalcode/i)).not.toBeInTheDocument();
  });

  it('shows snackbar when beforeinstallprompt event fires', () => {
    renderInstallPrompt();
    fireBeforeInstallPrompt();

    expect(screen.getByText('Install LegalCode for quick access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  it('does NOT show if localStorage has legalcode:install-dismissed set', () => {
    localStorageStore['legalcode:install-dismissed'] = 'true';
    renderInstallPrompt();
    fireBeforeInstallPrompt();

    expect(screen.queryByText(/install legalcode/i)).not.toBeInTheDocument();
  });

  it('clicking "Install" calls prompt() on the deferred event', async () => {
    const user = userEvent.setup();
    renderInstallPrompt();
    const { prompt } = fireBeforeInstallPrompt();

    await user.click(screen.getByRole('button', { name: /install/i }));
    expect(prompt).toHaveBeenCalled();
  });

  it('hides snackbar after Install button is clicked', async () => {
    const user = userEvent.setup();
    renderInstallPrompt();
    fireBeforeInstallPrompt();

    expect(screen.getByText('Install LegalCode for quick access')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /install/i }));

    expect(screen.queryByText('Install LegalCode for quick access')).not.toBeInTheDocument();
  });

  it('clicking dismiss hides snackbar and sets localStorage key', async () => {
    const user = userEvent.setup();
    renderInstallPrompt();
    fireBeforeInstallPrompt();

    expect(screen.getByText('Install LegalCode for quick access')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Install LegalCode for quick access')).not.toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- vi.fn() mock
    expect(localStorageMock.setItem).toHaveBeenCalledWith('legalcode:install-dismissed', 'true');
  });

  it('hides when appinstalled event fires', () => {
    renderInstallPrompt();
    fireBeforeInstallPrompt();

    expect(screen.getByText('Install LegalCode for quick access')).toBeInTheDocument();

    fireAppInstalled();

    expect(screen.queryByText('Install LegalCode for quick access')).not.toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderInstallPrompt();
    expect(listeners.beforeinstallprompt.length).toBeGreaterThan(0);
    expect(listeners.appinstalled.length).toBeGreaterThan(0);

    unmount();
    expect(listeners.beforeinstallprompt).toHaveLength(0);
    expect(listeners.appinstalled).toHaveLength(0);
  });
});
