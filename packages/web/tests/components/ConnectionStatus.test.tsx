/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
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

  it('shows "Saved" text with green dot when connected', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: '#2D6A4F' });
  });

  it('shows "Connecting..." text with gray dot when connecting', () => {
    const { container } = render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: '#9A8DA6' });
  });

  it('shows "Offline — changes saved locally" with amber dot when disconnected', () => {
    const { container } = render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Offline — changes saved locally')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: '#B8860B' });
  });

  it('shows "Reconnecting..." with pulsing amber dot when reconnecting', () => {
    const { container } = render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    const dot = container.querySelector('[data-testid="status-dot"]');
    if (dot === null) throw new Error('Expected status dot element');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: '#B8860B' });
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

  it('renders text in caption style', () => {
    render(<ConnectionStatus status="connected" />);
    const text = screen.getByText('Saved');
    expect(text).toHaveStyle({
      fontSize: '0.75rem',
      color: '#9A8DA6',
    });
  });

  it('has correct gap between dot and text', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ gap: '8px' });
  });
});
