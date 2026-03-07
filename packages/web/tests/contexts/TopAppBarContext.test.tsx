/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TopAppBarProvider, useTopAppBarConfig } from '../../src/contexts/TopAppBarContext.js';

function TestConsumer() {
  const { config, setConfig, clearConfig } = useTopAppBarConfig();
  return (
    <div>
      <span data-testid="template-name">{config.breadcrumbTemplateName ?? 'none'}</span>
      <span data-testid="has-panel-toggles">{config.panelToggles != null ? 'yes' : 'no'}</span>
      <span data-testid="has-right-slot">{config.rightSlot != null ? 'yes' : 'no'}</span>
      <span data-testid="has-status-badge">{config.statusBadge != null ? 'yes' : 'no'}</span>
      <button
        onClick={() => {
          setConfig({
            breadcrumbTemplateName: 'Test Template',
            panelToggles: <span>toggles</span>,
          });
        }}
      >
        Set Config
      </button>
      <button onClick={clearConfig}>Clear</button>
    </div>
  );
}

describe('TopAppBarContext', () => {
  it('provides default empty config', () => {
    render(
      <TopAppBarProvider>
        <TestConsumer />
      </TopAppBarProvider>,
    );
    expect(screen.getByTestId('template-name')).toHaveTextContent('none');
    expect(screen.getByTestId('has-panel-toggles')).toHaveTextContent('no');
    expect(screen.getByTestId('has-right-slot')).toHaveTextContent('no');
    expect(screen.getByTestId('has-status-badge')).toHaveTextContent('no');
  });

  it('updates config via setConfig with breadcrumbTemplateName', () => {
    render(
      <TopAppBarProvider>
        <TestConsumer />
      </TopAppBarProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Config' }).click();
    });

    expect(screen.getByTestId('template-name')).toHaveTextContent('Test Template');
    expect(screen.getByTestId('has-panel-toggles')).toHaveTextContent('yes');
  });

  it('clears config via clearConfig', () => {
    render(
      <TopAppBarProvider>
        <TestConsumer />
      </TopAppBarProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Config' }).click();
    });
    expect(screen.getByTestId('template-name')).toHaveTextContent('Test Template');

    act(() => {
      screen.getByRole('button', { name: 'Clear' }).click();
    });
    expect(screen.getByTestId('template-name')).toHaveTextContent('none');
  });

  it('works without provider (noop fallback)', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('template-name')).toHaveTextContent('none');

    // setConfig should be a noop and not throw
    act(() => {
      screen.getByRole('button', { name: 'Set Config' }).click();
    });
    expect(screen.getByTestId('template-name')).toHaveTextContent('none');

    // clearConfig should also be a noop and not throw
    act(() => {
      screen.getByRole('button', { name: 'Clear' }).click();
    });
    expect(screen.getByTestId('template-name')).toHaveTextContent('none');
  });
});
