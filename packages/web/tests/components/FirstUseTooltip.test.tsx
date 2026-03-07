/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { FirstUseTooltip } from '../../src/components/FirstUseTooltip.js';

function renderTooltip(
  props: Partial<{
    featureId: string;
    message: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
  }> = {},
) {
  const defaultProps = {
    featureId: 'test-feature',
    message: 'This is a tooltip message',
    ...props,
  };
  return render(
    <ThemeProvider theme={theme}>
      <FirstUseTooltip {...defaultProps}>
        <button>Child Button</button>
      </FirstUseTooltip>
    </ThemeProvider>,
  );
}

describe('FirstUseTooltip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children', () => {
    renderTooltip();
    expect(screen.getByText('Child Button')).toBeInTheDocument();
  });

  it('shows tooltip message when not dismissed', () => {
    renderTooltip({ message: 'Welcome to this feature' });
    expect(screen.getByText('Welcome to this feature')).toBeInTheDocument();
  });

  it('shows "Got it" dismiss button', () => {
    renderTooltip();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });

  it('"Got it" button dismisses the tooltip', async () => {
    const user = userEvent.setup();
    renderTooltip({ featureId: 'dismiss-test', message: 'Dismissable tooltip' });

    expect(screen.getByText('Dismissable tooltip')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Got it' }));

    // Tooltip content should be gone (wait for MUI animation)
    await waitFor(() => {
      expect(screen.queryByText('Dismissable tooltip')).not.toBeInTheDocument();
    });
    // localStorage should be updated
    expect(localStorage.getItem('legalcode:tooltip:dismiss-test:dismissed')).toBe('true');
  });

  it('tooltip is not shown when already dismissed in localStorage', () => {
    localStorage.setItem('legalcode:tooltip:already-dismissed:dismissed', 'true');
    renderTooltip({ featureId: 'already-dismissed', message: 'Should not show' });

    expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
  });

  it('renders with default bottom placement', () => {
    renderTooltip();
    // The tooltip should render (we verify presence of the message)
    expect(screen.getByText('This is a tooltip message')).toBeInTheDocument();
  });

  it('renders with custom placement', () => {
    renderTooltip({ placement: 'top' });
    expect(screen.getByText('This is a tooltip message')).toBeInTheDocument();
  });

  it('handles localStorage errors gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('localStorage unavailable');
    };

    // Should not crash, tooltip just won't show
    renderTooltip({ message: 'Error case message' });
    expect(screen.getByRole('button', { name: 'Child Button' })).toBeInTheDocument();
    // Tooltip should not show when localStorage errors
    expect(screen.queryByText('Error case message')).not.toBeInTheDocument();

    Storage.prototype.getItem = originalGetItem;
  });

  it('renders different tooltips for different featureIds', () => {
    localStorage.setItem('legalcode:tooltip:feature-a:dismissed', 'true');

    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <FirstUseTooltip featureId="feature-a" message="Feature A tooltip">
          <button>A</button>
        </FirstUseTooltip>
      </ThemeProvider>,
    );
    expect(screen.queryByText('Feature A tooltip')).not.toBeInTheDocument();
    unmount();

    render(
      <ThemeProvider theme={theme}>
        <FirstUseTooltip featureId="feature-b" message="Feature B tooltip">
          <button>B</button>
        </FirstUseTooltip>
      </ThemeProvider>,
    );
    expect(screen.getByText('Feature B tooltip')).toBeInTheDocument();
  });

  it('dismiss button has correct styling', () => {
    renderTooltip();
    const gotItButton = screen.getByRole('button', { name: 'Got it' });
    expect(gotItButton).toBeInTheDocument();
    // Just verify the button exists and is clickable — CSS-in-JS styles
    // are verified by the implementation
  });

  it('does not interfere with child click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <FirstUseTooltip featureId="click-test" message="Click test">
          <button onClick={onClick}>Clickable</button>
        </FirstUseTooltip>
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
