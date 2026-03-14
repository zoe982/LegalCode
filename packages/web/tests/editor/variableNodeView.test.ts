import { describe, it, expect, vi } from 'vitest';
import {
  VariableNodeView,
  createVariableNodeViewFactory,
} from '../../src/editor/variableNodeView.js';

// ---------------------------------------------------------------------------
// VariableNodeView — constructor tests
// ---------------------------------------------------------------------------

describe('VariableNodeView — constructor', () => {
  it('creates a root span element', () => {
    const view = new VariableNodeView('id-1', 'Party Name', 'text');
    expect(view.dom).toBeInstanceOf(HTMLSpanElement);
  });

  it('sets contentEditable to "false"', () => {
    const view = new VariableNodeView('id-1', 'Party Name', 'text');
    expect(view.dom.contentEditable).toBe('false');
  });

  it('sets data-variable-id attribute', () => {
    const view = new VariableNodeView('effective-date', 'Effective Date', 'date');
    expect(view.dom.dataset.variableId).toBe('effective-date');
  });

  it('sets data-variable-type attribute', () => {
    const view = new VariableNodeView('effective-date', 'Effective Date', 'date');
    expect(view.dom.dataset.variableType).toBe('date');
  });

  it('creates icon span with class variable-chip__icon', () => {
    const view = new VariableNodeView('id-1', 'Party Name', 'text');
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon).not.toBeNull();
  });

  it('sets aria-hidden on icon span', () => {
    const view = new VariableNodeView('id-1', 'Party Name', 'text');
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('creates name span with class variable-chip__name', () => {
    const view = new VariableNodeView('id-1', 'Party Name', 'text');
    const name = view.dom.querySelector('.variable-chip__name');
    expect(name).not.toBeNull();
  });

  it('sets variable name text content', () => {
    const view = new VariableNodeView('id-1', 'Effective Date', 'date');
    const name = view.dom.querySelector('.variable-chip__name');
    expect(name?.textContent).toBe('Effective Date');
  });
});

// ---------------------------------------------------------------------------
// All 7 type variants — correct class and icon
// ---------------------------------------------------------------------------

describe('VariableNodeView — type variants', () => {
  it('text type: class variable-chip--text, icon T', () => {
    const view = new VariableNodeView('id', 'My Var', 'text');
    expect(view.dom.classList.contains('variable-chip--text')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('T');
  });

  it('date type: class variable-chip--date, icon D', () => {
    const view = new VariableNodeView('id', 'My Var', 'date');
    expect(view.dom.classList.contains('variable-chip--date')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('D');
  });

  it('address type: class variable-chip--address, icon @', () => {
    const view = new VariableNodeView('id', 'My Var', 'address');
    expect(view.dom.classList.contains('variable-chip--address')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('@');
  });

  it('currency type: class variable-chip--currency, icon $', () => {
    const view = new VariableNodeView('id', 'My Var', 'currency');
    expect(view.dom.classList.contains('variable-chip--currency')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('$');
  });

  it('signature type: class variable-chip--signature, icon S', () => {
    const view = new VariableNodeView('id', 'My Var', 'signature');
    expect(view.dom.classList.contains('variable-chip--signature')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('S');
  });

  it('number type: class variable-chip--number, icon #', () => {
    const view = new VariableNodeView('id', 'My Var', 'number');
    expect(view.dom.classList.contains('variable-chip--number')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('#');
  });

  it('custom type: class variable-chip--custom, icon *', () => {
    const view = new VariableNodeView('id', 'My Var', 'custom');
    expect(view.dom.classList.contains('variable-chip--custom')).toBe(true);
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('*');
  });

  it('root span includes base class variable-chip for all types', () => {
    const types = ['text', 'date', 'address', 'currency', 'signature', 'number', 'custom'];
    for (const type of types) {
      const view = new VariableNodeView('id', 'Name', type);
      expect(view.dom.classList.contains('variable-chip')).toBe(true);
    }
  });

  it('unknown type falls back to icon *', () => {
    const view = new VariableNodeView('id', 'My Var', 'unknown-type');
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('*');
  });

  it('unknown type still sets base class variable-chip', () => {
    const view = new VariableNodeView('id', 'My Var', 'unknown-type');
    expect(view.dom.classList.contains('variable-chip')).toBe(true);
  });

  it('unknown type sets the type class variable-chip--unknown-type', () => {
    const view = new VariableNodeView('id', 'My Var', 'unknown-type');
    expect(view.dom.classList.contains('variable-chip--unknown-type')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VariableNodeView — update() method
// ---------------------------------------------------------------------------

describe('VariableNodeView — update()', () => {
  it('returns true', () => {
    const view = new VariableNodeView('id-1', 'Old Name', 'text');
    const result = view.update('id-1', 'New Name', 'date');
    expect(result).toBe(true);
  });

  it('updates name text content', () => {
    const view = new VariableNodeView('id-1', 'Old Name', 'text');
    view.update('id-1', 'New Name', 'text');
    const name = view.dom.querySelector('.variable-chip__name');
    expect(name?.textContent).toBe('New Name');
  });

  it('updates type class when type changes', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-1', 'Name', 'date');
    expect(view.dom.classList.contains('variable-chip--date')).toBe(true);
    expect(view.dom.classList.contains('variable-chip--text')).toBe(false);
  });

  it('updates base class variable-chip is retained after update', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-1', 'Name', 'date');
    expect(view.dom.classList.contains('variable-chip')).toBe(true);
  });

  it('updates icon text to new type icon', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-1', 'Name', 'date');
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('D');
  });

  it('updates data-variable-type attribute', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-2', 'Name', 'currency');
    expect(view.dom.dataset.variableType).toBe('currency');
  });

  it('updates data-variable-id attribute', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-2', 'Name', 'currency');
    expect(view.dom.dataset.variableId).toBe('id-2');
  });

  it('falls back to * icon for unknown type on update', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    view.update('id-1', 'Name', 'mystery-type');
    const icon = view.dom.querySelector('.variable-chip__icon');
    expect(icon?.textContent).toBe('*');
  });
});

// ---------------------------------------------------------------------------
// VariableNodeView — ProseMirror NodeView methods
// ---------------------------------------------------------------------------

describe('VariableNodeView — stopEvent()', () => {
  it('returns true (prevents editing inside the chip)', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    expect(view.stopEvent()).toBe(true);
  });
});

describe('VariableNodeView — ignoreMutation()', () => {
  it('returns true (ProseMirror should not process DOM mutations inside chip)', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    expect(view.ignoreMutation()).toBe(true);
  });
});

describe('VariableNodeView — destroy()', () => {
  it('does not throw', () => {
    const view = new VariableNodeView('id-1', 'Name', 'text');
    expect(() => {
      view.destroy();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createVariableNodeViewFactory
// ---------------------------------------------------------------------------

describe('createVariableNodeViewFactory', () => {
  it('returns a factory function', () => {
    const factory = createVariableNodeViewFactory(
      () => 'Resolved Name',
      () => 'text',
    );
    expect(typeof factory).toBe('function');
  });

  it('factory creates a VariableNodeView instance', () => {
    const factory = createVariableNodeViewFactory(
      () => 'Effective Date',
      () => 'date',
    );
    const view = factory({ attrs: { variableId: 'effective-date' } });
    expect(view).toBeInstanceOf(VariableNodeView);
  });

  it('factory passes resolved name from getVariableName callback', () => {
    const getVariableName = vi.fn(() => 'Party Name');
    const factory = createVariableNodeViewFactory(getVariableName, () => 'text');
    const view = factory({ attrs: { variableId: 'party-name' } });
    expect(getVariableName).toHaveBeenCalledWith('party-name');
    const name = view.dom.querySelector('.variable-chip__name');
    expect(name?.textContent).toBe('Party Name');
  });

  it('factory passes resolved type from getVariableType callback', () => {
    const getVariableType = vi.fn(() => 'currency');
    const factory = createVariableNodeViewFactory(() => 'Amount', getVariableType);
    const view = factory({ attrs: { variableId: 'amount' } });
    expect(getVariableType).toHaveBeenCalledWith('amount');
    expect(view.dom.classList.contains('variable-chip--currency')).toBe(true);
  });

  it('factory handles missing variableId attr (defaults to empty string)', () => {
    const getVariableName = vi.fn(() => 'Fallback');
    const getVariableType = vi.fn(() => 'text');
    const factory = createVariableNodeViewFactory(getVariableName, getVariableType);
    const view = factory({ attrs: {} as Record<string, string> });
    expect(getVariableName).toHaveBeenCalledWith('');
    expect(view.dom.dataset.variableId).toBe('');
  });

  it('factory forwards variableId to dom dataset', () => {
    const factory = createVariableNodeViewFactory(
      () => 'Date',
      () => 'date',
    );
    const view = factory({ attrs: { variableId: 'signing-date' } });
    expect(view.dom.dataset.variableId).toBe('signing-date');
  });

  it('each factory call creates an independent VariableNodeView', () => {
    const factory = createVariableNodeViewFactory(
      (id) => (id === 'a' ? 'Alpha' : 'Beta'),
      () => 'text',
    );
    const viewA = factory({ attrs: { variableId: 'a' } });
    const viewB = factory({ attrs: { variableId: 'b' } });
    expect(viewA.dom).not.toBe(viewB.dom);
    expect(viewA.dom.querySelector('.variable-chip__name')?.textContent).toBe('Alpha');
    expect(viewB.dom.querySelector('.variable-chip__name')?.textContent).toBe('Beta');
  });
});
