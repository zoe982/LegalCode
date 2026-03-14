/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PresenceCursorStyles } from '../../src/components/PresenceCursor.js';

// Helper: get all injected CSS text from document.head style elements
function getInjectedCss(): string {
  return Array.from(document.head.querySelectorAll('style'))
    .map((el) => el.textContent)
    .join('\n');
}

describe('PresenceCursorStyles', () => {
  it('renders without crashing', () => {
    expect(() => render(<PresenceCursorStyles />)).not.toThrow();
  });

  it('injects styles into the document head', () => {
    render(<PresenceCursorStyles />);
    // GlobalStyles injects into document.head, not the render container
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBeGreaterThan(0);
  });

  it('injected CSS contains .presence-cursor class', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('.presence-cursor');
  });

  it('injected CSS contains .presence-cursor__label class', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('.presence-cursor__label');
  });

  it('injected CSS contains .presence-cursor__line class', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('.presence-cursor__line');
  });

  it('injected CSS contains .presence-cursor__selection class', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('.presence-cursor__selection');
  });

  it('contains keyframe animation for label fade (presence-cursor-fade)', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('presence-cursor-fade');
  });

  it('contains keyframe animation for cursor blink (presence-cursor-blink)', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain('presence-cursor-blink');
  });

  it('blink keyframe defines opacity animation with 0.4 minimum', () => {
    render(<PresenceCursorStyles />);
    const css = getInjectedCss();
    expect(css).toContain('presence-cursor-blink');
    expect(css).toContain('0.4');
  });

  it('label fade animation has 3s duration reference', () => {
    render(<PresenceCursorStyles />);
    const css = getInjectedCss();
    // The CSS should contain a 3s reference (either in animation shorthand or duration)
    expect(css).toContain('3s');
  });

  it('blink animation references 1.2s duration', () => {
    render(<PresenceCursorStyles />);
    const css = getInjectedCss();
    expect(css).toContain('1.2s');
  });

  it('styles include hover rule that restores label opacity', () => {
    render(<PresenceCursorStyles />);
    expect(getInjectedCss()).toContain(':hover');
  });

  it('component renders without visible DOM output in the container', () => {
    const { container } = render(<PresenceCursorStyles />);
    // GlobalStyles renders nothing into the component tree itself
    expect(container.firstChild).toBeNull();
  });
});
