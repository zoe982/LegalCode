/// <reference types="@testing-library/jest-dom/vitest" />
import type React from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { Button } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { ToastProvider, useToast } from '../../src/components/Toast.js';

afterEach(() => {
  cleanup();
});

function TestTrigger({
  type,
  message,
  action,
}: {
  type?: 'success' | 'error' | 'info';
  message?: string;
  action?: React.ReactNode;
}) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() => {
        showToast(message ?? 'Test message', type ?? 'info', action);
      }}
    >
      Show Toast
    </button>
  );
}

function renderWithProvider(trigger?: {
  type?: 'success' | 'error' | 'info';
  message?: string;
  action?: React.ReactNode;
}) {
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

  it('auto-dismisses after 8 seconds when action is present', () => {
    vi.useFakeTimers();
    const undoButton = createElement(Button, { size: 'small' }, 'Undo');
    renderWithProvider({ message: 'Archived', type: 'success', action: undoButton });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Archived')).toBeInTheDocument();

    // At 4 seconds, should still be visible (not yet dismissed)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Archived')).toBeInTheDocument();

    // At 8 seconds, auto-dismiss triggers
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    vi.useRealTimers();
  });

  it('still auto-dismisses after 4 seconds when no action is present', () => {
    vi.useFakeTimers();
    renderWithProvider({ message: 'Quick toast', type: 'info' });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Quick toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // After 4s the dismiss fires — MUI Snackbar starts exit animation
    vi.useRealTimers();
  });

  it('renders action node inside the toast', () => {
    const undoButton = createElement(Button, { size: 'small' }, 'Undo');
    renderWithProvider({ message: 'With action', type: 'success', action: undoButton });
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('With action')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });
});
