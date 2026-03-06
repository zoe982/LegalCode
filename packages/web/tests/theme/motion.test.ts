import { describe, it, expect } from 'vitest';
import {
  springStandard,
  springStandardFast,
  springStandardSlow,
  springExpressive,
  cssTransition,
} from '../../src/theme/motion.js';

describe('motion constants', () => {
  it('exports spring configs with correct stiffness values', () => {
    expect(springStandard.stiffness).toBe(500);
    expect(springStandardFast.stiffness).toBe(700);
    expect(springStandardSlow.stiffness).toBe(300);
    expect(springExpressive.stiffness).toBe(400);
  });

  it('exports spring configs with correct damping values', () => {
    expect(springStandard.damping).toBe(35);
    expect(springStandardFast.damping).toBe(40);
    expect(springStandardSlow.damping).toBe(30);
    expect(springExpressive.damping).toBe(20);
  });

  it('exports spring configs with correct mass values', () => {
    expect(springStandard.mass).toBe(1);
    expect(springStandardFast.mass).toBe(0.8);
    expect(springStandardSlow.mass).toBe(1.2);
    expect(springExpressive.mass).toBe(1);
  });

  it('all springs have type "spring"', () => {
    expect(springStandard.type).toBe('spring');
    expect(springStandardFast.type).toBe('spring');
    expect(springStandardSlow.type).toBe('spring');
    expect(springExpressive.type).toBe('spring');
  });

  it('cssTransition returns standard transition string', () => {
    expect(cssTransition('standard')).toBe('cubic-bezier(0.2, 0, 0, 1) 200ms');
  });

  it('cssTransition returns standard-fast transition string', () => {
    expect(cssTransition('standard-fast')).toBe('cubic-bezier(0.2, 0, 0, 1) 150ms');
  });

  it('cssTransition returns standard-slow transition string', () => {
    expect(cssTransition('standard-slow')).toBe('cubic-bezier(0.2, 0, 0, 1) 350ms');
  });

  it('cssTransition returns expressive transition string', () => {
    expect(cssTransition('expressive')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1) 400ms');
  });
});
