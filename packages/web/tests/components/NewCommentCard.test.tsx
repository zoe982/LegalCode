/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { NewCommentCard } from '../../src/components/NewCommentCard.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const defaultProps = {
  anchorText: 'Selected text from the document',
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

function renderCard(overrides: Partial<typeof defaultProps & { top?: number }> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<NewCommentCard {...props} />, { wrapper: Wrapper });
}

describe('NewCommentCard', () => {
  it('does not render anchor text (removed in compact card style)', () => {
    renderCard();
    // anchorText prop is accepted but not displayed
    expect(screen.queryByText('Selected text from the document')).not.toBeInTheDocument();
  });

  it('input is autofocused', () => {
    renderCard();
    const input = screen.getByRole('textbox', { name: /comment/i });
    expect(input).toHaveFocus();
  });

  it('Comment button disabled when input empty', () => {
    renderCard();
    const button = screen.getByRole('button', { name: /comment/i });
    expect(button).toBeDisabled();
  });

  it('Comment button enabled after typing', async () => {
    const user = userEvent.setup();
    renderCard();
    const input = screen.getByRole('textbox', { name: /comment/i });
    await user.type(input, 'A comment');
    const button = screen.getByRole('button', { name: /comment/i });
    expect(button).toBeEnabled();
  });

  it('onSubmit called with typed text when Comment button clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderCard({ onSubmit });
    const input = screen.getByRole('textbox', { name: /comment/i });
    await user.type(input, 'Great point here');
    const button = screen.getByRole('button', { name: /comment/i });
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledWith('Great point here');
  });

  it('onCancel called when Cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderCard({ onCancel });
    const button = screen.getByRole('button', { name: /cancel/i });
    await user.click(button);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('onCancel called on Escape key press', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderCard({ onCancel });
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('input clears after submit', async () => {
    const user = userEvent.setup();
    renderCard();
    const input = screen.getByRole('textbox', { name: /comment/i });
    await user.type(input, 'Some text');
    const button = screen.getByRole('button', { name: /comment/i });
    await user.click(button);
    expect(input).toHaveValue('');
  });

  it('applies top positioning when top prop is provided', () => {
    const { container } = renderCard({ top: 200 });
    // The root Box should have position: absolute and top: 200px
    const rootBox = container.firstChild as HTMLElement;
    expect(rootBox.style.top).toBe('200px');
    expect(rootBox.style.position).toBe('absolute');
  });

  it('does not apply absolute positioning when top prop is not provided', () => {
    const { container } = renderCard();
    const rootBox = container.firstChild as HTMLElement;
    // Without top prop, no absolute positioning
    expect(rootBox.style.position).not.toBe('absolute');
  });
});
