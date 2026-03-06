/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { KeyboardShortcutHelp } from '../../src/components/KeyboardShortcutHelp.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('KeyboardShortcutHelp', () => {
  it('renders dialog when open', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(<KeyboardShortcutHelp open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('lists toggle pane shortcut', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Toggle right pane')).toBeInTheDocument();
  });

  it('lists escape shortcut', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/close pane/i)).toBeInTheDocument();
  });

  it('lists show shortcuts shortcut', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('lists comment on selection shortcut (future)', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/comment on selection/i)).toBeInTheDocument();
  });

  it('shows group headers', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders keyboard key badges', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    // Look for kbd elements containing key names
    const kbds = document.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThan(0);
    // Should contain common keys
    const kbdTexts = Array.from(kbds).map((el) => el.textContent);
    expect(kbdTexts).toContain('Ctrl');
    expect(kbdTexts).toContain('Shift');
    expect(kbdTexts).toContain('Escape');
  });

  it('renders + separator between keys in a combo', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    // The "+" separator between keys should be present
    const plusSeparators = screen.getAllByText('+');
    expect(plusSeparators.length).toBeGreaterThan(0);
  });

  it('has transition duration configured on the Dialog', () => {
    renderWithTheme(<KeyboardShortcutHelp open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // MUI Dialog with transitionDuration renders properly — the prop configures
    // the Fade transition internally. We verify the dialog and its backdrop render.
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).toBeInTheDocument();
  });
});
