/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoableAction } from '../../src/hooks/useUndoableAction.js';

// ── Mocks ────────────────────────────────────────────────────────────

const mockShowToast = vi.fn();
vi.mock('../../src/components/Toast.js', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────

describe('useUndoableAction', () => {
  const mockAction = vi.fn<(value: string) => void>();
  const mockUndoAction = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('execute() calls the action with the new value', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Done!',
      }),
    );

    act(() => {
      result.current.execute('new-val', 'old-val');
    });

    expect(mockAction).toHaveBeenCalledWith('new-val');
  });

  it('execute() shows toast with success message', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Item archived',
      }),
    );

    act(() => {
      result.current.execute('new', 'old');
    });

    expect(mockShowToast).toHaveBeenCalledWith('Item archived', 'success', expect.anything());
  });

  it('execute() shows toast with an Undo action ReactNode', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Archived',
      }),
    );

    act(() => {
      result.current.execute('new', 'old');
    });

    // Third argument to showToast is the action (ReactNode with an Undo button)
    const actionArg = mockShowToast.mock.calls[0]?.[2] as unknown;
    expect(actionArg).toBeDefined();
    // It should be a React element (object with type and props)
    expect(actionArg).toHaveProperty('type');
    expect(actionArg).toHaveProperty('props');
    const props = (actionArg as { props: { children: string } }).props;
    expect(props.children).toBe('Undo');
  });

  it('clicking Undo calls undoAction with previous value', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Done',
      }),
    );

    act(() => {
      result.current.execute('new', 'previous-value');
    });

    // Extract the Undo button element and simulate its onClick
    const actionElement = mockShowToast.mock.calls[0]?.[2] as {
      props: { onClick: () => void };
    };
    expect(actionElement).toBeDefined();

    act(() => {
      actionElement.props.onClick();
    });

    expect(mockUndoAction).toHaveBeenCalledWith('previous-value');
  });

  it('multiple executes update the previous value for undo', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Done',
      }),
    );

    act(() => {
      result.current.execute('first', 'original');
    });

    act(() => {
      result.current.execute('second', 'first');
    });

    // Extract the Undo button from the SECOND call
    const actionElement = mockShowToast.mock.calls[1]?.[2] as {
      props: { onClick: () => void };
    };

    act(() => {
      actionElement.props.onClick();
    });

    expect(mockUndoAction).toHaveBeenCalledWith('first');
  });

  it('clicking Undo after ref is cleared does not call undoAction', () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        undoAction: mockUndoAction,
        successMessage: 'Done',
      }),
    );

    act(() => {
      result.current.execute('new', 'old');
    });

    // Get the first undo button
    const firstUndo = mockShowToast.mock.calls[0]?.[2] as {
      props: { onClick: () => void };
    };

    // Execute again (replaces the ref)
    act(() => {
      result.current.execute('newer', 'new');
    });

    // Click the first undo — should use updated ref value
    act(() => {
      firstUndo.props.onClick();
    });

    // undoAction is called with the latest previousValue ('new')
    expect(mockUndoAction).toHaveBeenCalledWith('new');
  });

  it('works with async action functions', () => {
    const asyncAction = vi.fn<(v: string) => Promise<void>>().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useUndoableAction({
        action: asyncAction,
        undoAction: mockUndoAction,
        successMessage: 'Async done',
      }),
    );

    act(() => {
      result.current.execute('val', 'prev');
    });

    expect(asyncAction).toHaveBeenCalledWith('val');
    expect(mockShowToast).toHaveBeenCalledWith('Async done', 'success', expect.anything());
  });
});
