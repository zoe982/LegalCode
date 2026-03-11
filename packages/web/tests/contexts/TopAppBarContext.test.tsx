/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import {
  TopAppBarProvider,
  useTopAppBarConfig,
  useTopAppBarSetters,
} from '../../src/contexts/TopAppBarContext.js';

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

  it("setter-only consumers don't re-render when config changes", () => {
    let setterOnlyRenderCount = 0;

    function SetterOnlyConsumer() {
      setterOnlyRenderCount++;
      useTopAppBarSetters();
      return <div data-testid="setter-only" />;
    }

    function ConfigChangingConsumer() {
      const { setConfig } = useTopAppBarSetters();
      return (
        <button
          onClick={() => {
            setConfig({ breadcrumbTemplateName: 'New Name' });
          }}
        >
          Change Config
        </button>
      );
    }

    render(
      <TopAppBarProvider>
        <SetterOnlyConsumer />
        <ConfigChangingConsumer />
      </TopAppBarProvider>,
    );

    const renderCountAfterMount = setterOnlyRenderCount;

    act(() => {
      screen.getByRole('button', { name: 'Change Config' }).click();
    });

    act(() => {
      screen.getByRole('button', { name: 'Change Config' }).click();
    });

    // SetterOnlyConsumer should not re-render when config state changes
    expect(setterOnlyRenderCount).toBe(renderCountAfterMount);
  });

  it('useTopAppBarSetters returns stable references across config changes', () => {
    let capturedSetConfig: ReturnType<typeof useTopAppBarSetters>['setConfig'] | null = null;
    let capturedClearConfig: ReturnType<typeof useTopAppBarSetters>['clearConfig'] | null = null;

    function SetterCapture() {
      const { setConfig, clearConfig } = useTopAppBarSetters();
      capturedSetConfig = setConfig;
      capturedClearConfig = clearConfig;
      return null;
    }

    function ConfigTrigger() {
      const { setConfig } = useTopAppBarConfig();
      return (
        <button
          onClick={() => {
            setConfig({ breadcrumbTemplateName: 'Stable Test' });
          }}
        >
          Trigger Change
        </button>
      );
    }

    render(
      <TopAppBarProvider>
        <SetterCapture />
        <ConfigTrigger />
      </TopAppBarProvider>,
    );

    const setConfigBefore = capturedSetConfig;
    const clearConfigBefore = capturedClearConfig;

    act(() => {
      screen.getByRole('button', { name: 'Trigger Change' }).click();
    });

    // References must be referentially stable (same function identity) across config changes
    expect(capturedSetConfig).toBe(setConfigBefore);
    expect(capturedClearConfig).toBe(clearConfigBefore);
  });

  it('useTopAppBarSetters returns noop fallbacks outside provider', () => {
    const { result } = renderHook(() => useTopAppBarSetters());

    expect(typeof result.current.setConfig).toBe('function');
    expect(typeof result.current.clearConfig).toBe('function');

    // Neither should throw when called outside the provider
    expect(() => {
      result.current.setConfig({ breadcrumbTemplateName: 'Outside Provider' });
    }).not.toThrow();

    expect(() => {
      result.current.clearConfig();
    }).not.toThrow();
  });
});
