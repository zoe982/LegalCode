// ---------------------------------------------------------------------------
// VariableNodeView — ProseMirror NodeView for variable_ref inline nodes
// Renders color-coded chips in the editor (contenteditable=false atoms).
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, string> = {
  text: 'T',
  date: 'D',
  address: '@',
  currency: '$',
  signature: 'S',
  number: '#',
  custom: '*',
};

/**
 * ProseMirror NodeView that renders a variable reference as a color-coded
 * chip. The chip is non-editable (atom); ProseMirror treats it as a single
 * opaque unit.
 */
export class VariableNodeView {
  /** Root DOM element — ProseMirror reads this to mount/unmount the view. */
  dom: HTMLSpanElement;

  constructor(variableId: string, variableName: string, variableType: string) {
    this.dom = document.createElement('span');
    this.dom.className = `variable-chip variable-chip--${variableType}`;
    this.dom.contentEditable = 'false';
    this.dom.dataset.variableId = variableId;
    this.dom.dataset.variableType = variableType;

    // Icon span
    const icon = document.createElement('span');
    icon.className = 'variable-chip__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = TYPE_ICONS[variableType] ?? '*';
    this.dom.appendChild(icon);

    // Name span
    const name = document.createElement('span');
    name.className = 'variable-chip__name';
    name.textContent = variableName;
    this.dom.appendChild(name);
  }

  /**
   * Called by ProseMirror when the node's attrs change. Returns true to
   * indicate we handled the update in place (avoids full re-mount).
   */
  update(variableId: string, variableName: string, variableType: string): boolean {
    // Update name text
    const nameEl = this.dom.querySelector('.variable-chip__name');
    if (nameEl !== null) {
      nameEl.textContent = variableName;
    }

    // Update type class and icon
    this.dom.className = `variable-chip variable-chip--${variableType}`;
    this.dom.dataset.variableType = variableType;
    this.dom.dataset.variableId = variableId;

    const iconEl = this.dom.querySelector('.variable-chip__icon');
    if (iconEl !== null) {
      iconEl.textContent = TYPE_ICONS[variableType] ?? '*';
    }

    return true;
  }

  /** Prevent ProseMirror from passing DOM events into the node. */
  stopEvent(): boolean {
    return true;
  }

  /** Prevent ProseMirror from re-rendering in response to DOM mutations. */
  ignoreMutation(): boolean {
    return true;
  }

  /** Called when the NodeView is removed from the document. */
  destroy(): void {
    // Clean up (span removal is handled by ProseMirror)
  }
}

// ---------------------------------------------------------------------------
// Factory function — integrates VariableNodeView with Milkdown/ProseMirror
// ---------------------------------------------------------------------------

/**
 * Creates a NodeView factory suitable for passing to ProseMirror's
 * `nodeViews` configuration. The two callbacks allow the caller to resolve
 * a human-readable name and display type from the variable id stored in the
 * node's attrs (which may differ from the persisted type if the variable
 * definition was updated after the document was last saved).
 *
 * @param getVariableName  Callback from variable id → display name
 * @param getVariableType  Callback from variable id → VariableType string
 */
export function createVariableNodeViewFactory(
  getVariableName: (id: string) => string,
  getVariableType: (id: string) => string,
): (node: { attrs: Record<string, string> }) => VariableNodeView {
  return (node: { attrs: Record<string, string> }) => {
    const variableId = node.attrs.variableId ?? '';
    const name = getVariableName(variableId);
    const type = getVariableType(variableId);
    return new VariableNodeView(variableId, name, type);
  };
}
