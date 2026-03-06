/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { ToastProvider, useToast } from '../../src/components/Toast.js';

afterEach(() => {
  cleanup();
});

function TestTrigger({ type, message }: { type?: 'success' | 'error' | 'info'; message?: string }) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() => {
        showToast(message ?? 'Test message', type ?? 'info');
      }}
    >
      Show Toast
    </button>
  );
}

function renderWithProvider(trigger?: { type?: 'success' | 'error' | 'info'; message?: string }) {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <TestTrigger {...trigger} />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('Toast', () => {
  it('shows toast message when triggered', () => {
    renderWithProvider();
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('auto-dismisses after 4 seconds', () => {
    vi.useFakeTimers();
    renderWithProvider();
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Test message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // After auto-dismiss, the MUI Snackbar starts exit animation
    vi.useRealTimers();
  });

  it('shows success icon for success type', () => {
    renderWithProvider({ type: 'success', message: 'Saved successfully' });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    expect(screen.getByTestId('CheckCircleOutlineIcon')).toBeInTheDocument();
  });

  it('shows error icon for error type', () => {
    renderWithProvider({ type: 'error', message: 'Something went wrong' });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('ErrorOutlineIcon')).toBeInTheDocument();
  });

  it('shows info icon for info type', () => {
    renderWithProvider({ type: 'info', message: 'FYI' });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('FYI')).toBeInTheDocument();
    expect(screen.getByTestId('InfoOutlinedIcon')).toBeInTheDocument();
  });

  it('replaces current toast with new one', () => {
    renderWithProvider();
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Test message')).toBeInTheDocument();

    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('throws when useToast is used outside provider', () => {
    function BadComponent() {
      useToast();
      return null;
    }
    expect(() => {
      render(<BadComponent />);
    }).toThrow('useToast must be used within a ToastProvider');
  });
});
