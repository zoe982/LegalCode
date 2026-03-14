/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PresenceCursorStyles } from '../../src/components/PresenceCursor.js';

describe('PresenceCursorStyles', () => {
  it('renders without crashing', () => {
    expect(() => render(<PresenceCursorStyles />)).not.toThrow();
  });

  it('injects styles into the document', () => {
    render(<PresenceCursorStyles />);
    // The component renders a <style> element via MUI Box component="style"
    const styleElements = document.querySelectorAll('style');
    const hasPresenceCursorStyles = Array.from(styleElements).some((el) =>
      el.textContent.includes('.presence-cursor'),
    );
    expect(hasPresenceCursorStyles).toBe(true);
  });

  it('includes cursor fade animation', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasAnimation = Array.from(styleElements).some((el) =>
      el.textContent.includes('presence-cursor-fade'),
    );
    expect(hasAnimation).toBe(true);
  });

  it('includes cursor blink animation', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasAnimation = Array.from(styleElements).some((el) =>
      el.textContent.includes('presence-cursor-blink'),
    );
    expect(hasAnimation).toBe(true);
  });

  it('includes presence cursor label class', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasClass = Array.from(styleElements).some((el) =>
      el.textContent.includes('.presence-cursor__label'),
    );
    expect(hasClass).toBe(true);
  });

  it('includes presence cursor line class', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasClass = Array.from(styleElements).some((el) =>
      el.textContent.includes('.presence-cursor__line'),
    );
    expect(hasClass).toBe(true);
  });

  it('includes selection class', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasClass = Array.from(styleElements).some((el) =>
      el.textContent.includes('.presence-cursor__selection'),
    );
    expect(hasClass).toBe(true);
  });

  it('includes reduced motion media query', () => {
    render(<PresenceCursorStyles />);
    const styleElements = document.querySelectorAll('style');
    const hasReducedMotion = Array.from(styleElements).some((el) =>
      el.textContent.includes('prefers-reduced-motion'),
    );
    expect(hasReducedMotion).toBe(true);
  });
});
