/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../../src/components/ConnectionStatus.js';

describe('ConnectionStatus', () => {
  it('shows connected state', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows connecting state', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows disconnected state', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows reconnecting state', () => {
    render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
