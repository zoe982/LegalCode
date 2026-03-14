/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VariableChip } from '../../src/components/VariableChip.js';
import { TYPE_ICONS } from '../../src/constants/variables.js';

describe('VariableChip', () => {
  it('renders the variable name', () => {
    render(<VariableChip name="Party Name" type="text" />);
    expect(screen.getByText('Party Name')).toBeInTheDocument();
  });

  it('renders the type icon for text type', () => {
    render(<VariableChip name="My Text" type="text" />);
    expect(screen.getByText(TYPE_ICONS.text)).toBeInTheDocument();
  });

  it('renders the type icon for date type', () => {
    render(<VariableChip name="Sign Date" type="date" />);
    expect(screen.getByText(TYPE_ICONS.date)).toBeInTheDocument();
  });

  it('renders the type icon for address type', () => {
    render(<VariableChip name="Home Address" type="address" />);
    expect(screen.getByText(TYPE_ICONS.address)).toBeInTheDocument();
  });

  it('renders the type icon for currency type', () => {
    render(<VariableChip name="Contract Value" type="currency" />);
    expect(screen.getByText(TYPE_ICONS.currency)).toBeInTheDocument();
  });

  it('renders the type icon for signature type', () => {
    render(<VariableChip name="Signature Block" type="signature" />);
    expect(screen.getByText(TYPE_ICONS.signature)).toBeInTheDocument();
  });

  it('renders the type icon for number type', () => {
    render(<VariableChip name="Page Count" type="number" />);
    expect(screen.getByText(TYPE_ICONS.number)).toBeInTheDocument();
  });

  it('renders the type icon for custom type', () => {
    render(<VariableChip name="My Custom" type="custom" />);
    expect(screen.getByText(TYPE_ICONS.custom)).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    const { container } = render(<VariableChip name="Test" type="text" />);
    const chip = container.firstElementChild;
    expect(chip?.tagName.toLowerCase()).toBe('span');
  });

  it('chip has display inline-flex', () => {
    const { container } = render(<VariableChip name="Test" type="text" />);
    const chip = container.firstElementChild;
    expect(chip).not.toBeNull();
    if (!chip) return;
    const styles = window.getComputedStyle(chip);
    expect(styles.display).toBe('inline-flex');
  });

  it('chip has align-items center', () => {
    const { container } = render(<VariableChip name="Test" type="text" />);
    const chip = container.firstElementChild;
    expect(chip).not.toBeNull();
    if (!chip) return;
    const styles = window.getComputedStyle(chip);
    expect(styles.alignItems).toBe('center');
  });

  it('renders icon box and name text as children of the chip', () => {
    const { container } = render(<VariableChip name="Test Variable" type="text" />);
    const chip = container.firstElementChild;
    expect(chip?.childNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 7 type icons correctly for each type', () => {
    const types: [string, string][] = [
      ['text', TYPE_ICONS.text],
      ['date', TYPE_ICONS.date],
      ['address', TYPE_ICONS.address],
      ['currency', TYPE_ICONS.currency],
      ['signature', TYPE_ICONS.signature],
      ['number', TYPE_ICONS.number],
      ['custom', TYPE_ICONS.custom],
    ];
    types.forEach(([type, icon]) => {
      const { container } = render(
        <VariableChip name="Var" type={type as Parameters<typeof VariableChip>[0]['type']} />,
      );
      const foundIcon = container.querySelector('span span');
      expect(foundIcon?.textContent).toBe(icon);
    });
  });

  it('chip has a left border style applied via inline style', () => {
    const { container } = render(<VariableChip name="Party" type="text" />);
    const chip = container.firstElementChild;
    expect(chip).not.toBeNull();
    if (!chip) return;
    // The chip uses inline style borderLeft — browser normalizes hex to rgb
    expect((chip as HTMLElement).style.borderLeft).toContain('rgb(128, 39, 255)');
  });

  it('chip has border-radius applied for rounded corners', () => {
    const { container } = render(<VariableChip name="Party" type="text" />);
    const chip = container.firstElementChild;
    expect(chip).not.toBeNull();
    if (!chip) return;
    const styles = window.getComputedStyle(chip);
    expect(styles.borderRadius).not.toBe('0px');
  });

  it('type icon box has a fixed width and height', () => {
    const { container } = render(<VariableChip name="Test" type="text" />);
    const iconBox = container.querySelector<HTMLElement>('span span');
    expect(iconBox).not.toBeNull();
    if (!iconBox) return;
    const styles = window.getComputedStyle(iconBox);
    // 24x24 per spec
    expect(styles.width).toBe('24px');
    expect(styles.height).toBe('24px');
  });

  it('type icon box has display flex for centering', () => {
    const { container } = render(<VariableChip name="Test" type="text" />);
    const iconBox = container.querySelector<HTMLElement>('span span');
    expect(iconBox).not.toBeNull();
    if (!iconBox) return;
    const styles = window.getComputedStyle(iconBox);
    expect(styles.display).toBe('flex');
  });
});
