/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlideOverPanel } from '../../src/components/SlideOverPanel.js';

function renderPanel(props?: Partial<React.ComponentProps<typeof SlideOverPanel>>) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Panel',
    children: <div>Panel content</div>,
  };
  return render(<SlideOverPanel {...defaultProps} {...props} />);
}

describe('SlideOverPanel', () => {
  describe('rendering', () => {
    it('renders panel content when open', () => {
      renderPanel({ open: true });
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    it('does not show panel content when closed (transform off-screen)', () => {
      renderPanel({ open: false });
      const panel = screen.getByTestId('slide-over-panel');
      expect(panel).toHaveStyle({ transform: 'translateX(100%)' });
    });

    it('renders panel title in header', () => {
      renderPanel({ title: 'Comments' });
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('renders close button with aria-label', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('close triggers', () => {
    it('calls onClose when close button clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderPanel({ onClose });
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when Escape key pressed', () => {
      const onClose = vi.fn();
      renderPanel({ onClose, open: true });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not call onClose on Escape when panel is closed', () => {
      const onClose = vi.fn();
      renderPanel({ onClose, open: false });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when scrim is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderPanel({ onClose, open: true });
      await user.click(screen.getByTestId('slide-over-scrim'));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('data-testid attributes', () => {
    it('has correct data-testid="slide-over-panel"', () => {
      renderPanel();
      expect(screen.getByTestId('slide-over-panel')).toBeInTheDocument();
    });

    it('has correct data-testid="slide-over-scrim"', () => {
      renderPanel({ open: true });
      expect(screen.getByTestId('slide-over-scrim')).toBeInTheDocument();
    });
  });

  describe('scrim visibility', () => {
    it('scrim is not rendered when panel is closed', () => {
      renderPanel({ open: false });
      expect(screen.queryByTestId('slide-over-scrim')).not.toBeInTheDocument();
    });

    it('scrim is rendered when panel is open', () => {
      renderPanel({ open: true });
      expect(screen.getByTestId('slide-over-scrim')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('panel has role="dialog"', () => {
      renderPanel();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('panel has aria-label matching the title', () => {
      renderPanel({ title: 'Info Panel' });
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Info Panel');
    });
  });

  describe('open state styling', () => {
    it('has translateX(0) when open', () => {
      renderPanel({ open: true });
      const panel = screen.getByTestId('slide-over-panel');
      expect(panel).toHaveStyle({ transform: 'translateX(0)' });
    });
  });

  describe('cleanup', () => {
    it('removes keydown listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderPanel({ open: true });
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
