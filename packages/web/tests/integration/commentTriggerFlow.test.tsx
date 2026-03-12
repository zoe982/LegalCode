/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';

vi.mock('../../src/editor/commentPlugin.js', () => ({}));
vi.mock('../../src/editor/commentAnchors.js', () => ({
  captureSelection: (from: number, to: number, text: string) => ({
    anchorText: text.slice(0, 500),
    anchorFrom: String(from),
    anchorTo: String(to),
  }),
}));

const { useEditorComments } = await import('../../src/hooks/useEditorComments.js');
const { MarginCommentTrigger } = await import('../../src/components/MarginCommentTrigger.js');

/**
 * Full harness: wires useEditorComments into MarginCommentTrigger.
 * Exposes buttons to set/clear the selection and a data-testid to
 * inspect pendingAnchor without reaching into hook internals.
 */
function TestHarness() {
  const { selectionInfo, pendingAnchor, startComment, onSelectionChange } = useEditorComments();
  return (
    <div>
      <div data-testid="pending-anchor">
        {pendingAnchor ? JSON.stringify(pendingAnchor) : 'null'}
      </div>
      <div data-testid="has-selection">{String(selectionInfo.hasSelection)}</div>
      <button
        data-testid="set-selection"
        onClick={() => {
          onSelectionChange(
            { hasSelection: true, text: 'test text', buttonPosition: { top: 100, left: 50 } },
            { from: 10, to: 19, text: 'test text' },
          );
        }}
      />
      <button
        data-testid="clear-selection"
        onClick={() => {
          onSelectionChange({ hasSelection: false, text: '', buttonPosition: null });
        }}
      />
      {/* Directly exposes startComment as a button so tests can call it without clicking the trigger */}
      <button data-testid="start-comment" onClick={startComment} />
      <MarginCommentTrigger top={100} visible={selectionInfo.hasSelection} onClick={startComment} />
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('MarginCommentTrigger + useEditorComments integration', () => {
  it('clicking trigger calls startComment and creates pendingAnchor when selection exists', async () => {
    const user = userEvent.setup();
    render(<TestHarness />, { wrapper: Wrapper });

    // Initial state: no selection, no pending anchor
    expect(screen.getByTestId('pending-anchor')).toHaveTextContent('null');
    expect(screen.getByTestId('has-selection')).toHaveTextContent('false');

    // Set selection — trigger becomes visible
    await user.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('has-selection')).toHaveTextContent('true');

    // Click the visible trigger
    const trigger = screen.getByTestId('margin-comment-trigger');
    await user.click(trigger);

    // pendingAnchor must be set with the captured selection coordinates
    const anchorEl = screen.getByTestId('pending-anchor');
    expect(anchorEl).not.toHaveTextContent('null');
    const anchor = JSON.parse(anchorEl.textContent) as Record<string, unknown>;
    expect(anchor).toEqual({ anchorText: 'test text', anchorFrom: '10', anchorTo: '19' });
  });

  it('startComment does nothing when selection is cleared before click', async () => {
    const user = userEvent.setup();
    render(<TestHarness />, { wrapper: Wrapper });

    // Set selection so editorSelectionRef is populated
    await user.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('has-selection')).toHaveTextContent('true');

    // Clear selection — this simulates the race condition where mousedown steals focus,
    // ProseMirror fires a selection-change event with no selection, and the ref is wiped.
    await user.click(screen.getByTestId('clear-selection'));
    expect(screen.getByTestId('has-selection')).toHaveTextContent('false');

    // Trigger is now hidden (visible=false). Call startComment directly via the exposed button.
    // This reproduces the scenario where startComment fires after the ref has been cleared.
    act(() => {
      screen.getByTestId('start-comment').click();
    });

    // pendingAnchor must remain null — startComment should silently do nothing
    expect(screen.getByTestId('pending-anchor')).toHaveTextContent('null');
  });

  it('trigger preserves selection through mousedown-click sequence', async () => {
    const user = userEvent.setup();
    render(<TestHarness />, { wrapper: Wrapper });

    // Set selection — makes trigger visible
    await user.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('has-selection')).toHaveTextContent('true');

    const trigger = screen.getByTestId('margin-comment-trigger');

    // In a real browser without e.preventDefault(), mousedown would transfer focus to the
    // button, ProseMirror would fire a deselection event, and startComment would silently
    // fail. MarginCommentTrigger calls e.preventDefault() on mousedown to block this.
    //
    // Verify that the mousedown event is indeed cancelled by the component's handler.
    const mousedownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    trigger.dispatchEvent(mousedownEvent);
    expect(mousedownEvent.defaultPrevented).toBe(true);

    // Now click — with preventDefault having blocked focus transfer, the selection ref
    // should still be intact and startComment should create a pendingAnchor.
    await user.click(trigger);

    const anchorEl = screen.getByTestId('pending-anchor');
    expect(anchorEl).not.toHaveTextContent('null');
    const anchor = JSON.parse(anchorEl.textContent) as Record<string, unknown>;
    expect(anchor).toEqual({ anchorText: 'test text', anchorFrom: '10', anchorTo: '19' });
  });
});
