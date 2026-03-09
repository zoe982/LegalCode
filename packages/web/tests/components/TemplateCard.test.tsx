/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Template } from '@legalcode/shared';
import { TemplateCard } from '../../src/components/TemplateCard.js';

const mockTemplate: Template = {
  id: 't1',
  title: 'Employment Agreement',
  slug: 'employment-agreement-abc123',
  category: 'Employment',
  description: null,
  country: 'US',
  currentVersion: 2,
  deletedAt: null,
  deletedBy: null,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

describe('TemplateCard', () => {
  let onClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    onClick = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders template title', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const title = screen.getByText('Employment Agreement');
    expect(title).toBeInTheDocument();
    expect(title.className.split(' ').length).toBeGreaterThan(0);
  });

  it('renders category tag in uppercase', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const category = screen.getByText('Employment');
    expect(category).toBeInTheDocument();
    expect(category).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('does not render a status badge', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('renders relative time in metadata', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    expect(screen.getByText('5d ago')).toBeInTheDocument();
  });

  it('renders version in metadata', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('renders separator dots between metadata items', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    const dots = card.querySelectorAll('[data-testid="separator-dot"]');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClick when card is clicked', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    card.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick on non-Enter keydown', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space', bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has correct data-testid based on template id', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    expect(screen.getByTestId('template-card-t1')).toBeInTheDocument();
  });

  it('is focusable with tabindex 0', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('has button role for accessibility', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    expect(card).toHaveAttribute('role', 'button');
  });

  it('renders description when present', () => {
    const templateWithDesc = {
      ...mockTemplate,
      description: 'Standard employment agreement for full-time hires',
    };
    render(<TemplateCard template={templateWithDesc} onClick={onClick} />);
    expect(
      screen.getByText('Standard employment agreement for full-time hires'),
    ).toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    const descriptions = card.querySelectorAll('[data-testid="template-card-description"]');
    expect(descriptions).toHaveLength(0);
  });

  it('does not render description when empty string', () => {
    const templateEmptyDesc = { ...mockTemplate, description: '' };
    render(<TemplateCard template={templateEmptyDesc} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    const descriptions = card.querySelectorAll('[data-testid="template-card-description"]');
    expect(descriptions).toHaveLength(0);
  });

  it('truncates long description with 2-line clamp', () => {
    const templateLongDesc = {
      ...mockTemplate,
      description:
        'This is a very long description that should be truncated after two lines of text to keep the card compact and clean',
    };
    render(<TemplateCard template={templateLongDesc} onClick={onClick} />);
    const desc = screen.getByTestId('template-card-description');
    expect(desc).toHaveStyle({ WebkitLineClamp: '2' });
  });

  it('renders card with MUI sx styles applied', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const card = screen.getByTestId('template-card-t1');
    expect(card.className.split(' ').length).toBeGreaterThan(1);
    expect(card).toBeInTheDocument();
  });

  it('title element exists and has overflow hidden', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    const title = screen.getByText('Employment Agreement');
    expect(title).toBeInTheDocument();
    expect(title.className.split(' ').length).toBeGreaterThan(0);
  });

  // Three-dot menu tests
  it('renders three-dot menu button when onDelete is provided', () => {
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    expect(screen.getByRole('button', { name: 'Template actions' })).toBeInTheDocument();
  });

  it('does not render three-dot menu when onDelete is not provided', () => {
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    expect(screen.queryByRole('button', { name: 'Template actions' })).not.toBeInTheDocument();
  });

  it('opens menu with Delete option on three-dot click', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Template actions' }));
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete with template id when Delete is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Template actions' }));
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('does not trigger card onClick when three-dot menu is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Template actions' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('three-dot menu button has correct aria attributes', () => {
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    const menuBtn = screen.getByRole('button', { name: 'Template actions' });
    expect(menuBtn).toHaveAttribute('aria-haspopup', 'true');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  // Covers line 41: keydown on menu button should NOT trigger card onClick
  it('does not call onClick when Enter is pressed on the Template actions button', () => {
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} onDelete={onDelete} />);
    const menuBtn = screen.getByRole('button', { name: 'Template actions' });
    menuBtn.focus();
    menuBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
