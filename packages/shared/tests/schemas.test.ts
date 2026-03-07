import { describe, it, expect } from 'vitest';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
} from '../src/schemas/index.js';

describe('createTemplateSchema', () => {
  it('validates a valid template', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Employment Agreement',
      category: 'employment',
      country: 'NL',
      content: '# Employment Agreement\n\nThis is a template.',
      tags: ['employment', 'netherlands'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createTemplateSchema.safeParse({
      title: '',
      category: 'employment',
      content: '# Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'employment',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null country for global templates', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Global NDA',
      category: 'nda',
      country: null,
      content: '# NDA',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional description', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Template with Description',
      category: 'contracts',
      content: '# Content',
      description: 'A brief description of the template',
    });
    expect(result.success).toBe(true);
  });

  it('rejects description longer than 500 characters', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Template',
      category: 'contracts',
      content: '# Content',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid country code length', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Test',
      category: 'employment',
      country: 'Netherlands',
      content: '# Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTemplateSchema', () => {
  it('validates partial updates', () => {
    const result = updateTemplateSchema.safeParse({
      title: 'Updated Title',
    });
    expect(result.success).toBe(true);
  });

  it('accepts description update', () => {
    const result = updateTemplateSchema.safeParse({
      description: 'Updated description',
    });
    expect(result.success).toBe(true);
  });

  it('does not accept status field', () => {
    const result = updateTemplateSchema.safeParse({
      status: 'active',
    });
    // status is stripped (not in schema), so parse succeeds but status is not in output
    expect(result.success).toBe(true);
    if (result.success) {
      expect('status' in result.data).toBe(false);
    }
  });
});

describe('templateQuerySchema', () => {
  it('applies defaults for pagination', () => {
    const result = templateQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces string page numbers', () => {
    const result = templateQuerySchema.parse({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('rejects limit over 100', () => {
    const result = templateQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});
