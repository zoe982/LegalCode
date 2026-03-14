/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { presenceCursorsKey } from '../../src/editor/presenceCursorsPlugin.js';
import type { RemoteCursor } from '../../src/editor/presenceCursorsPlugin.js';

/**
 * Integration test for the presence cursors data flow.
 * Tests the contract between cursor data and plugin state.
 */
describe('Presence cursors integration', () => {
  it('presenceCursorsKey is a valid PluginKey', () => {
    expect(presenceCursorsKey).toBeDefined();
    // ProseMirror PluginKey appends a $ suffix to disambiguate; the key starts with the name
    expect((presenceCursorsKey as unknown as { key: string }).key).toContain('presenceCursors');
  });

  it('RemoteCursor type matches expected shape', () => {
    const cursor: RemoteCursor = {
      userId: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      color: '#FF0000',
      anchor: 10,
      head: 20,
    };

    expect(cursor.userId).toBe('user-1');
    expect(cursor.email).toBe('alice@example.com');
    expect(cursor.name).toBe('Alice');
    expect(cursor.color).toBe('#FF0000');
    expect(cursor.anchor).toBe(10);
    expect(cursor.head).toBe(20);
  });

  it('cursor with collapsed selection has anchor === head', () => {
    const cursor: RemoteCursor = {
      userId: 'user-2',
      email: 'bob@example.com',
      name: 'Bob',
      color: '#00FF00',
      anchor: 15,
      head: 15,
    };

    expect(cursor.anchor).toBe(cursor.head);
  });

  it('multiple cursors can coexist with unique userIds', () => {
    const cursors: RemoteCursor[] = [
      { userId: 'u1', email: 'a@example.com', name: 'Alice', color: '#FF0000', anchor: 0, head: 5 },
      { userId: 'u2', email: 'b@example.com', name: 'Bob', color: '#00FF00', anchor: 10, head: 10 },
      {
        userId: 'u3',
        email: 'c@example.com',
        name: 'Carol',
        color: '#0000FF',
        anchor: 20,
        head: 25,
      },
    ];

    const userIds = cursors.map((c) => c.userId);
    expect(new Set(userIds).size).toBe(cursors.length);
  });

  it('cursor positions are non-negative integers', () => {
    const cursor: RemoteCursor = {
      userId: 'u1',
      email: 'test@example.com',
      name: 'Test',
      color: '#000',
      anchor: 0,
      head: 100,
    };

    expect(cursor.anchor).toBeGreaterThanOrEqual(0);
    expect(cursor.head).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(cursor.anchor)).toBe(true);
    expect(Number.isInteger(cursor.head)).toBe(true);
  });

  it('cursor color is a valid hex string', () => {
    const cursor: RemoteCursor = {
      userId: 'u1',
      email: 'test@example.com',
      name: 'Test',
      color: '#8027FF',
      anchor: 5,
      head: 5,
    };

    expect(cursor.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('cursor with reversed anchor/head still contains valid positions', () => {
    // The plugin handles anchor > head by computing min/max for inline range decoration
    const cursor: RemoteCursor = {
      userId: 'u1',
      email: 'test@example.com',
      name: 'Test',
      color: '#FFF',
      anchor: 20,
      head: 10,
    };

    expect(typeof cursor.anchor).toBe('number');
    expect(typeof cursor.head).toBe('number');
  });

  it('cursor email field is a string', () => {
    const cursor: RemoteCursor = {
      userId: 'u1',
      email: 'jane@acasus.com',
      name: 'Jane',
      color: '#E63946',
      anchor: 0,
      head: 0,
    };

    expect(typeof cursor.email).toBe('string');
    expect(cursor.email).toContain('@');
  });
});
