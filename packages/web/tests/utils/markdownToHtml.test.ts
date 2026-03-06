import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../../src/utils/markdownToHtml.js';

describe('markdownToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('');
  });

  it('converts h1 headings', () => {
    expect(markdownToHtml('# Hello')).toContain('<h1>Hello</h1>');
  });

  it('converts h2 headings', () => {
    expect(markdownToHtml('## Hello')).toContain('<h2>Hello</h2>');
  });

  it('converts h3 headings', () => {
    expect(markdownToHtml('### Hello')).toContain('<h3>Hello</h3>');
  });

  it('converts h4 headings', () => {
    expect(markdownToHtml('#### Hello')).toContain('<h4>Hello</h4>');
  });

  it('converts h5 headings', () => {
    expect(markdownToHtml('##### Hello')).toContain('<h5>Hello</h5>');
  });

  it('converts h6 headings', () => {
    expect(markdownToHtml('###### Hello')).toContain('<h6>Hello</h6>');
  });

  it('converts bold text', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });

  it('converts links', () => {
    const result = markdownToHtml('[text](http://example.com)');
    expect(result).toContain('<a href="http://example.com"');
    expect(result).toContain('>text</a>');
  });

  it('converts horizontal rules', () => {
    expect(markdownToHtml('---')).toContain('<hr');
  });

  it('converts template variables', () => {
    const result = markdownToHtml('{{var:company_name}}');
    expect(result).toContain('class="template-var"');
    expect(result).toContain('company_name');
  });

  it('converts clause references', () => {
    const result = markdownToHtml('{{clause:4.2}}');
    expect(result).toContain('class="clause-ref"');
    expect(result).toContain('4.2');
  });

  it('escapes HTML entities', () => {
    expect(markdownToHtml('<script>alert("xss")</script>')).not.toContain('<script>');
  });

  it('escapes ampersands', () => {
    expect(markdownToHtml('A & B')).toContain('&amp;');
  });

  it('escapes double quotes', () => {
    expect(markdownToHtml('"hello"')).toContain('&quot;');
  });

  it('wraps paragraphs', () => {
    expect(markdownToHtml('Hello\n\nWorld')).toContain('<p>');
  });

  it('separates paragraphs by blank lines', () => {
    const result = markdownToHtml('First paragraph\n\nSecond paragraph');
    expect(result).toContain('<p>First paragraph</p>');
    expect(result).toContain('<p>Second paragraph</p>');
  });

  it('converts unordered lists', () => {
    const result = markdownToHtml('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('converts ordered lists', () => {
    const result = markdownToHtml('1. First\n2. Second');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
    expect(result).toContain('First');
    expect(result).toContain('Second');
  });

  it('handles bold within a paragraph', () => {
    const result = markdownToHtml('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('handles italic within a paragraph', () => {
    const result = markdownToHtml('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('handles inline variables within text', () => {
    const result = markdownToHtml('Dear {{var:client_name}}, welcome');
    expect(result).toContain('class="template-var"');
    expect(result).toContain('client_name');
  });

  it('handles multiple inline formats in same line', () => {
    const result = markdownToHtml('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });
});
