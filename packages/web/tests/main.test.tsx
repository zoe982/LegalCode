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

    await import('../src/main.js');

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalled();
  });
});
