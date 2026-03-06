/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../../src/components/StatusChip.js';

describe('StatusChip', () => {
  describe('display text', () => {
    it('renders "Draft" for draft status (CSS uppercased)', () => {
      render(<StatusChip status="draft" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders "Published" for active status (not "Active")', () => {
      render(<StatusChip status="active" />);
      expect(screen.getByText('Published')).toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('renders "Archived" for archived status (CSS uppercased)', () => {
      render(<StatusChip status="archived" />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('pill shape', () => {
    it('uses pill border radius (9999px) for draft', () => {
      render(<StatusChip status="draft" />);
      const chip = screen.getByText('Draft');
      expect(chip).toHaveStyle({ borderRadius: '9999px' });
    });

    it('uses pill border radius (9999px) for active', () => {
      render(<StatusChip status="active" />);
      const chip = screen.getByText('Published');
      expect(chip).toHaveStyle({ borderRadius: '9999px' });
    });

    it('uses pill border radius (9999px) for archived', () => {
      render(<StatusChip status="archived" />);
      const chip = screen.getByText('Archived');
      expect(chip).toHaveStyle({ borderRadius: '9999px' });
    });
  });

  describe('brand color tokens', () => {
    it('applies draft colors (dark goldenrod)', () => {
      render(<StatusChip status="draft" />);
      const chip = screen.getByText('Draft');
      expect(chip).toHaveStyle({
        backgroundColor: '#B8860B1A',
        color: '#B8860B',
      });
    });

    it('applies published colors (forest green)', () => {
      render(<StatusChip status="active" />);
      const chip = screen.getByText('Published');
      expect(chip).toHaveStyle({
        backgroundColor: '#2D6A4F1A',
        color: '#2D6A4F',
      });
    });

    it('applies archived colors (warm gray)', () => {
      render(<StatusChip status="archived" />);
      const chip = screen.getByText('Archived');
      expect(chip).toHaveStyle({
        backgroundColor: '#78695A1A',
        color: '#78695A',
      });
    });
  });

  describe('typography', () => {
    it('uses uppercase text transform', () => {
      render(<StatusChip status="draft" />);
      const chip = screen.getByText('Draft');
      expect(chip).toHaveStyle({ textTransform: 'uppercase' });
    });

    it('uses correct font size (0.6875rem)', () => {
      render(<StatusChip status="active" />);
      const chip = screen.getByText('Published');
      expect(chip).toHaveStyle({ fontSize: '0.6875rem' });
    });

    it('uses font weight 600', () => {
      render(<StatusChip status="archived" />);
      const chip = screen.getByText('Archived');
      expect(chip).toHaveStyle({ fontWeight: '600' });
    });

    it('uses letter spacing 0.06em', () => {
      render(<StatusChip status="draft" />);
      const chip = screen.getByText('Draft');
      expect(chip).toHaveStyle({ letterSpacing: '0.06em' });
    });
  });

  describe('publishing flash animation', () => {
    it('applies flash animation class when animate prop is true', () => {
      render(<StatusChip status="active" animate={true} />);
      const chip = screen.getByText('Published');
      expect(chip.classList.toString()).toMatch(/publishing-flash/);
    });

    it('does not apply flash animation class when animate is false', () => {
      render(<StatusChip status="active" animate={false} />);
      const chip = screen.getByText('Published');
      expect(chip.classList.toString()).not.toMatch(/publishing-flash/);
    });

    it('does not apply flash animation class when animate is not provided', () => {
      render(<StatusChip status="active" />);
      const chip = screen.getByText('Published');
      expect(chip.classList.toString()).not.toMatch(/publishing-flash/);
    });

    it('does not apply flash animation for draft status even when animate is true', () => {
      render(<StatusChip status="draft" animate={true} />);
      const chip = screen.getByText('Draft');
      // Flash only triggers for active (published) status
      expect(chip.classList.toString()).not.toMatch(/publishing-flash/);
    });
  });
});
