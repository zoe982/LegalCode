/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionStatus } from '../../src/components/ConnectionStatus.js';

describe('ConnectionStatus', () => {
  it('renders as an inline ambient indicator (no Chip, no modal)', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    // Should not contain any MUI Chip
    expect(container.querySelector('.MuiChip-root')).toBeNull();
    // Should be inline-flex layout
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ display: 'inline-flex' });
  });

  it('shows "All changes saved" text with green dot when connected', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    // v3 token: --status-published (#059669)
    expect(dot).toHaveStyle({ backgroundColor: '#059669' });
  });

  it('shows "Connecting..." text with amber dot when connecting', () => {
    const { container } = render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    // v3 token: --status-draft (#D97706)
    expect(dot).toHaveStyle({ backgroundColor: '#D97706' });
  });

  it('shows "Offline — changes saved locally" with red dot when disconnected', () => {
    const { container } = render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Offline — changes saved locally')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    // v3 token: --destructive (#DC2626)
    expect(dot).toHaveStyle({ backgroundColor: '#DC2626' });
  });

  it('shows "Reconnecting..." with pulsing amber dot when reconnecting', () => {
    const { container } = render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    // v3 token: --status-draft (#D97706)
    expect(dot).toHaveStyle({ backgroundColor: '#D97706' });
    // Pulsing animation should be applied
    const style = window.getComputedStyle(dot);
    expect(style.animation).toContain('1.5s');
  });

  it('renders dot with correct dimensions and shape', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toHaveStyle({
      width: '8px',
      height: '8px',
      borderRadius: '9999px',
    });
  });

  it('renders text in caption style with v3 token color', () => {
    render(<ConnectionStatus status="connected" />);
    const text = screen.getByText('All changes saved');
    expect(text).toHaveStyle({
      fontSize: '0.75rem',
      // v3 token: --text-tertiary (#9B9DB0)
      color: '#9B9DB0',
    });
  });

  it('shows "Saving..." text with pulsing amber dot when saving', () => {
    const { container } = render(<ConnectionStatus status="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toHaveStyle({ backgroundColor: '#D97706' });
    const style = window.getComputedStyle(dot);
    expect(style.animation).toContain('1.5s');
  });

  it('applies CSS transition on dot background-color', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toHaveStyle({ transition: 'background-color 0.3s ease' });
  });

  it('shows retry button when disconnected and onRetry is provided', async () => {
    const onRetry = vi.fn();
    render(<ConnectionStatus status="disconnected" onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    const userEvent2 = (await import('@testing-library/user-event')).default;
    const user = userEvent2.setup();
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when disconnected and onRetry is not provided', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('has correct gap between dot and text', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ gap: '8px' });
  });

  it('shows "All changes saved" with green dot when saved', () => {
    const { container } = render(<ConnectionStatus status="saved" />);
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toHaveStyle({ backgroundColor: '#059669' });
  });

  it('shows "Save failed — retrying..." with pulsing red dot when error', () => {
    const { container } = render(<ConnectionStatus status="error" />);
    expect(screen.getByText('Save failed — retrying...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toHaveStyle({ backgroundColor: '#DC2626' });
    const style = window.getComputedStyle(dot);
    expect(style.animation).toContain('1.5s');
  });

  describe('autoHide prop', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('fades out after 2 seconds when autoHide is true and status is connected', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="connected" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      // Initially visible
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should fade out after 2 seconds
      expect(wrapper).toHaveStyle({ opacity: '0' });
    });

    it('fades out after 2 seconds when autoHide is true and status is saved', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="saved" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(wrapper).toHaveStyle({ opacity: '0' });
    });

    it('stays visible when autoHide is true and status is saving', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="saving" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should remain visible for active statuses
      expect(wrapper).toHaveStyle({ opacity: '1' });
    });

    it('stays visible when autoHide is true and status is error', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="error" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(wrapper).toHaveStyle({ opacity: '1' });
    });

    it('stays visible when autoHide is true and status is reconnecting', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="reconnecting" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(wrapper).toHaveStyle({ opacity: '1' });
    });

    it('stays visible when autoHide is true and status is connecting', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="connecting" autoHide={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ opacity: '1' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(wrapper).toHaveStyle({ opacity: '1' });
    });

    it('always remains visible when autoHide is not set (default behavior)', () => {
      vi.useFakeTimers();
      const { container } = render(<ConnectionStatus status="connected" />);
      const wrapper = container.firstElementChild as HTMLElement;

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Without autoHide, component should always remain visible
      // (no opacity style set, or opacity: 1)
      const style = window.getComputedStyle(wrapper);
      expect(style.opacity).not.toBe('0');
    });
  });
});
