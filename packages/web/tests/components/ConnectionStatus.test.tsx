/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
