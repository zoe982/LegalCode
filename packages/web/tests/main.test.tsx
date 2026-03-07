import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-dom/client
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

// Mock the App component
vi.mock('../src/App.js', () => ({
  App: () => null,
}));

// Mock installGlobalErrorHandlers
const mockInstallGlobalErrorHandlers = vi.fn().mockReturnValue(() => undefined);
vi.mock('../src/services/errorReporter.js', () => ({
  installGlobalErrorHandlers: mockInstallGlobalErrorHandlers,
}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('throws if root element is not found', async () => {
    document.body.innerHTML = '';
    await expect(async () => import('../src/main.js')).rejects.toThrow('Root element not found');
  });

  it('renders the App into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    // Re-import to trigger module execution
    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock('react-dom/client', () => ({
      createRoot: mockCreateRoot,
    }));
    vi.doMock('../src/App.js', () => ({
      App: () => null,
    }));
    vi.doMock('../src/services/errorReporter.js', () => ({
      installGlobalErrorHandlers: mockInstallGlobalErrorHandlers,
    }));

    await import('../src/main.js');

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalled();
  });

  it('calls installGlobalErrorHandlers before createRoot', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    vi.resetModules();

    const callOrder: string[] = [];
    const trackedInstall = vi.fn().mockImplementation(() => {
      callOrder.push('install');
      return () => undefined;
    });
    const trackedCreateRoot = vi.fn().mockImplementation(() => {
      callOrder.push('createRoot');
      return { render: mockRender };
    });

    vi.doMock('react-dom/client', () => ({
      createRoot: trackedCreateRoot,
    }));
    vi.doMock('../src/App.js', () => ({
      App: () => null,
    }));
    vi.doMock('../src/services/errorReporter.js', () => ({
      installGlobalErrorHandlers: trackedInstall,
    }));

    await import('../src/main.js');

    expect(trackedInstall).toHaveBeenCalled();
    expect(callOrder[0]).toBe('install');
    expect(callOrder[1]).toBe('createRoot');
  });
});
