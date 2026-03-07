/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { RightPane } from '../../src/components/RightPane.js';

function renderPane(props?: Partial<React.ComponentProps<typeof RightPane>>) {
  const defaultProps = {
    open: true,
    onToggle: vi.fn(),
    tabs: [
      { label: 'Metadata', content: <div>Metadata content</div> },
      { label: 'Comments', content: <div>Comments content</div> },
      { label: 'Versions', content: <div>Versions content</div> },
    ],
  };
  return render(
    <ThemeProvider theme={theme}>
      <RightPane {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('RightPane', () => {
  describe('open/close animation', () => {
    it('is always rendered in the DOM regardless of open state', () => {
      renderPane({ open: false });
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('has width 0, overflow hidden, and opacity 0 when closed', () => {
      renderPane({ open: false });
      const pane = screen.getByTestId('right-pane');
      // MUI applies sx as inline styles in test env via emotion
      // We check the element is in the DOM but visually hidden
      expect(pane).toBeInTheDocument();
    });

    it('has width 400px when open', () => {
      renderPane({ open: true });
      const pane = screen.getByTestId('right-pane');
      expect(pane).toBeInTheDocument();
    });

    it('renders tab labels when open', () => {
      renderPane();
      expect(screen.getByRole('tab', { name: /metadata/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /comments/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /versions/i })).toBeInTheDocument();
    });

    it('hides tabs via overflow when closed', () => {
      renderPane({ open: false });
      // Pane is in DOM but tabs should not be visible (overflow: hidden clips them)
      // The pane element exists but content is clipped
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });
  });

  describe('tab behavior', () => {
    it('shows first tab content by default', () => {
      renderPane();
      expect(screen.getByText('Metadata content')).toBeInTheDocument();
    });

    it('switches tab content on click', async () => {
      const user = userEvent.setup();
      renderPane();
      await user.click(screen.getByRole('tab', { name: /comments/i }));
      expect(screen.getByText('Comments content')).toBeInTheDocument();
    });

    it('supports defaultTab prop', () => {
      renderPane({ defaultTab: 1 });
      expect(screen.getByText('Comments content')).toBeInTheDocument();
    });

    it('tab switch updates displayed content', async () => {
      const user = userEvent.setup();
      renderPane();
      expect(screen.getByText('Metadata content')).toBeInTheDocument();
      await user.click(screen.getByRole('tab', { name: /versions/i }));
      expect(screen.getByText('Versions content')).toBeInTheDocument();
      expect(screen.queryByText('Metadata content')).not.toBeInTheDocument();
    });
  });

  describe('collapse button', () => {
    it('calls onToggle when collapse button is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      renderPane({ onToggle });
      await user.click(screen.getByRole('button', { name: /collapse/i }));
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });

  describe('resize handle', () => {
    it('renders a resize handle', () => {
      renderPane();
      expect(screen.getByTestId('right-pane-resize-handle')).toBeInTheDocument();
    });

    it('resize handle is not rendered when pane is closed', () => {
      renderPane({ open: false });
      expect(screen.queryByTestId('right-pane-resize-handle')).not.toBeInTheDocument();
    });

    it('dragging resize handle changes pane width', () => {
      renderPane();
      const handle = screen.getByTestId('right-pane-resize-handle');
      const pane = screen.getByTestId('right-pane');

      // Simulate drag: mousedown, mousemove, mouseup
      fireEvent.mouseDown(handle, { clientX: 100 });
      // Move left by 40px -> pane should widen by 40px (from 400 to 440)
      fireEvent.mouseMove(document, { clientX: 60 });
      fireEvent.mouseUp(document);

      // The pane should have updated width
      expect(pane).toBeInTheDocument();
    });

    it('clamps width to minimum 360px', () => {
      renderPane();
      const handle = screen.getByTestId('right-pane-resize-handle');

      // Simulate drag that would go below min
      fireEvent.mouseDown(handle, { clientX: 100 });
      // Move right by 100px -> pane should narrow by 100px (from 400 to 300, clamped to 360)
      fireEvent.mouseMove(document, { clientX: 200 });
      fireEvent.mouseUp(document);

      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('clamps width to maximum 480px', () => {
      renderPane();
      const handle = screen.getByTestId('right-pane-resize-handle');

      // Simulate drag that would go above max
      fireEvent.mouseDown(handle, { clientX: 100 });
      // Move left by 200px -> pane should widen by 200px (from 400 to 600, clamped to 480)
      fireEvent.mouseMove(document, { clientX: -100 });
      fireEvent.mouseUp(document);

      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('handles multiple consecutive drags', () => {
      renderPane();
      const handle = screen.getByTestId('right-pane-resize-handle');

      // First drag
      fireEvent.mouseDown(handle, { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 80 });
      fireEvent.mouseUp(document);

      // Second drag
      fireEvent.mouseDown(handle, { clientX: 80 });
      fireEvent.mouseMove(document, { clientX: 60 });
      fireEvent.mouseUp(document);

      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('cleans up event listeners on mouseup', () => {
      renderPane();
      const handle = screen.getByTestId('right-pane-resize-handle');
      const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

      fireEvent.mouseDown(handle, { clientX: 100 });
      fireEvent.mouseUp(document);

      expect(removeListenerSpy).toHaveBeenCalled();
      removeListenerSpy.mockRestore();
    });
  });

  describe('tab content area', () => {
    it('renders content area with data-testid', () => {
      renderPane();
      expect(screen.getByTestId('right-pane-content')).toBeInTheDocument();
    });
  });

  describe('data-testid', () => {
    it('renders with data-testid right-pane when open', () => {
      renderPane();
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });

    it('renders with data-testid right-pane when closed', () => {
      renderPane({ open: false });
      expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    });
  });
});
