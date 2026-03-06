/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TopAppBarProvider, useTopAppBarConfig } from '../../src/contexts/TopAppBarContext.js';

function TestConsumer() {
  const { config, setConfig, clearConfig } = useTopAppBarConfig();
  return (
    <div>
      <span data-testid="title">{config.editableTitle ?? 'none'}</span>
      <button
        onClick={() => {
          setConfig({ editableTitle: 'Edited Title' });
        }}
      >
        Set Title
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
    expect(screen.getByTestId('title')).toHaveTextContent('none');
  });

  it('updates config via setConfig', () => {
    render(
      <TopAppBarProvider>
        <TestConsumer />
      </TopAppBarProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Title' }).click();
    });

    expect(screen.getByTestId('title')).toHaveTextContent('Edited Title');
  });

  it('clears config via clearConfig', () => {
    render(
      <TopAppBarProvider>
        <TestConsumer />
      </TopAppBarProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Title' }).click();
    });
    expect(screen.getByTestId('title')).toHaveTextContent('Edited Title');

    act(() => {
      screen.getByRole('button', { name: 'Clear' }).click();
    });
    expect(screen.getByTestId('title')).toHaveTextContent('none');
  });

  it('works without provider (noop fallback)', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('title')).toHaveTextContent('none');

    // setConfig should be a noop and not throw
    act(() => {
      screen.getByRole('button', { name: 'Set Title' }).click();
    });
    expect(screen.getByTestId('title')).toHaveTextContent('none');

    // clearConfig should also be a noop and not throw
    act(() => {
      screen.getByRole('button', { name: 'Clear' }).click();
    });
    expect(screen.getByTestId('title')).toHaveTextContent('none');
  });
});
